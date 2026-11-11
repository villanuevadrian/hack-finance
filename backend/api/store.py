"""Game store: in memory, with an optional copy on disk so games survive a restart of the API.

Persistence is off unless BEHAVIORLAB_DATA_DIR is set (tests keep using memory only). Each game
is one JSON file with the onboarding answers (closed ranges, no identifying data), the scenario and
the state. Results are not stored: they are deterministic and are recomputed on demand.
The folder must stay out of git (CLAUDE.md, principle 7: no personal data in the repo).
"""

import json
import os
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from threading import Lock

from contracts import GameState, OnboardingAnswers, PortfolioProposal, Posterior, Profile, Scenario


@dataclass
class GameRecord:
    answers: OnboardingAnswers
    scenario: Scenario
    state: GameState
    results: tuple[Posterior, Profile, PortfolioProposal] | None = None
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat(timespec="seconds"))


@dataclass
class GameStore:
    games: dict[str, GameRecord] = field(default_factory=dict)
    lock: Lock = field(default_factory=Lock)
    data_dir: Path | None = None

    def __post_init__(self) -> None:
        if self.data_dir is not None:
            self.data_dir.mkdir(parents=True, exist_ok=True)
            for path in sorted(self.data_dir.glob("*.json")):
                raw = json.loads(path.read_text(encoding="utf-8"))
                self.games[path.stem] = GameRecord(
                    answers=OnboardingAnswers.model_validate(raw["answers"]),
                    scenario=Scenario.model_validate(raw["scenario"]),
                    state=GameState.model_validate(raw["state"]),
                    created_at=raw.get("created_at", ""),
                )

    def get(self, game_id: str) -> GameRecord | None:
        return self.games.get(game_id)

    def put(self, game_id: str, record: GameRecord) -> None:
        with self.lock:
            self.games[game_id] = record
            if self.data_dir is not None:
                payload = {
                    "created_at": record.created_at,
                    "answers": record.answers.model_dump(mode="json"),
                    "scenario": record.scenario.model_dump(mode="json"),
                    "state": record.state.model_dump(mode="json"),
                }
                tmp = self.data_dir / f"{game_id}.json.tmp"
                tmp.write_text(json.dumps(payload), encoding="utf-8")
                tmp.replace(self.data_dir / f"{game_id}.json")

    def all(self) -> list[tuple[str, GameRecord]]:
        with self.lock:
            return list(self.games.items())


_dir = os.environ.get("BEHAVIORLAB_DATA_DIR")
store = GameStore(data_dir=Path(_dir) if _dir else None)
