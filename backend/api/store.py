"""Game store: where the games are kept.

Three modes, chosen by environment variables (in this order):
1. DATABASE_URL: a PostgreSQL database (Render, Neon, Supabase...). Durable: survives restarts and
   redeploys. One table, `behaviorlab_games`, one row per game with a JSON document.
2. BEHAVIORLAB_DATA_DIR: one JSON file per game in a folder (local or a persistent disk).
3. Neither: memory only (tests and quick local runs).

Each game stores the onboarding answers (closed ranges, no identifying data), the scenario, the
state and its settings. Results are not stored: they are deterministic and are recomputed on demand.
Nothing of this goes to git (CLAUDE.md, principle 7: no personal data in the repo).
"""

import json
import os
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from threading import Lock
from typing import Protocol

from contracts import GameState, OnboardingAnswers, PortfolioProposal, Posterior, Profile, Scenario


@dataclass
class GameRecord:
    answers: OnboardingAnswers
    scenario: Scenario
    state: GameState
    results: tuple[Posterior, Profile, PortfolioProposal] | None = None
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat(timespec="seconds"))
    # Accessibility mode: more time per decision (WCAG 2.2.1). Recorded so the entity knows it.
    timeout_ms: int | None = None
    # Earlier game of the same player (a new game to complete an inconclusive profile).
    previous_game_id: str | None = None
    # When the player asked for a human review of the result (RGPD art. 22).
    review_requested_at: str | None = None
    assistant_calls: int = 0


def to_payload(record: GameRecord) -> dict:
    return {
        "created_at": record.created_at,
        "answers": record.answers.model_dump(mode="json"),
        "scenario": record.scenario.model_dump(mode="json"),
        "state": record.state.model_dump(mode="json"),
        "timeout_ms": record.timeout_ms,
        "previous_game_id": record.previous_game_id,
        "review_requested_at": record.review_requested_at,
        "assistant_calls": record.assistant_calls,
    }


def from_payload(raw: dict) -> GameRecord:
    return GameRecord(
        answers=OnboardingAnswers.model_validate(raw["answers"]),
        scenario=Scenario.model_validate(raw["scenario"]),
        state=GameState.model_validate(raw["state"]),
        created_at=raw.get("created_at", ""),
        timeout_ms=raw.get("timeout_ms"),
        previous_game_id=raw.get("previous_game_id"),
        review_requested_at=raw.get("review_requested_at"),
        assistant_calls=raw.get("assistant_calls", 0),
    )


class Backend(Protocol):
    name: str

    def load_all(self) -> dict[str, GameRecord]: ...

    def save(self, game_id: str, record: GameRecord) -> None: ...


class FileBackend:
    name = "disk"

    def __init__(self, folder: Path) -> None:
        self.folder = folder
        folder.mkdir(parents=True, exist_ok=True)

    def load_all(self) -> dict[str, GameRecord]:
        return {
            p.stem: from_payload(json.loads(p.read_text(encoding="utf-8")))
            for p in sorted(self.folder.glob("*.json"))
        }

    def save(self, game_id: str, record: GameRecord) -> None:
        tmp = self.folder / f"{game_id}.json.tmp"
        tmp.write_text(json.dumps(to_payload(record)), encoding="utf-8")
        tmp.replace(self.folder / f"{game_id}.json")


class PostgresBackend:
    """PostgreSQL through psycopg 3. The table is created on first use."""

    name = "postgres"

    def __init__(self, url: str) -> None:
        import psycopg  # imported here so memory and disk modes do not need it

        self._psycopg = psycopg
        self.url = url
        with psycopg.connect(url, autocommit=True) as conn:
            conn.execute(
                "CREATE TABLE IF NOT EXISTS behaviorlab_games ("
                " game_id TEXT PRIMARY KEY,"
                " created_at TIMESTAMPTZ NOT NULL DEFAULT now(),"
                " updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),"
                " payload JSONB NOT NULL)"
            )

    def load_all(self) -> dict[str, GameRecord]:
        with self._psycopg.connect(self.url) as conn:
            rows = conn.execute("SELECT game_id, payload FROM behaviorlab_games").fetchall()
        return {gid: from_payload(payload) for gid, payload in rows}

    def save(self, game_id: str, record: GameRecord) -> None:
        with self._psycopg.connect(self.url, autocommit=True) as conn:
            conn.execute(
                "INSERT INTO behaviorlab_games (game_id, payload) VALUES (%s, %s)"
                " ON CONFLICT (game_id) DO UPDATE"
                " SET payload = EXCLUDED.payload, updated_at = now()",
                (game_id, json.dumps(to_payload(record))),
            )


@dataclass
class GameStore:
    games: dict[str, GameRecord] = field(default_factory=dict)
    lock: Lock = field(default_factory=Lock)
    backend: Backend | None = None

    def __post_init__(self) -> None:
        if self.backend is not None:
            self.games.update(self.backend.load_all())

    @property
    def kind(self) -> str:
        return self.backend.name if self.backend is not None else "memory"

    def get(self, game_id: str) -> GameRecord | None:
        return self.games.get(game_id)

    def put(self, game_id: str, record: GameRecord) -> None:
        with self.lock:
            self.games[game_id] = record
            if self.backend is not None:
                self.backend.save(game_id, record)

    def all(self) -> list[tuple[str, GameRecord]]:
        with self.lock:
            return list(self.games.items())


def backend_from_env() -> Backend | None:
    url = os.environ.get("DATABASE_URL")
    if url:
        return PostgresBackend(url)
    folder = os.environ.get("BEHAVIORLAB_DATA_DIR")
    if folder:
        return FileBackend(Path(folder))
    return None


store = GameStore(backend=backend_from_env())
