"""In-memory game store. Enough for the demo; restarting the API forgets the games."""

from dataclasses import dataclass, field
from threading import Lock

from contracts import GameState, OnboardingAnswers, PortfolioProposal, Posterior, Profile, Scenario


@dataclass
class GameRecord:
    answers: OnboardingAnswers
    scenario: Scenario
    state: GameState
    results: tuple[Posterior, Profile, PortfolioProposal] | None = None


@dataclass
class GameStore:
    games: dict[str, GameRecord] = field(default_factory=dict)
    lock: Lock = field(default_factory=Lock)

    def get(self, game_id: str) -> GameRecord | None:
        return self.games.get(game_id)

    def put(self, game_id: str, record: GameRecord) -> None:
        with self.lock:
            self.games[game_id] = record


store = GameStore()
