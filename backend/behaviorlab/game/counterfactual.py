"""Counterfactual replays: the same market, the same player data, other decisions.

Shown only AFTER the game (the "revelation"), never during it, so it cannot change the measured
behaviour. Each policy is replayed with the real engine (new_game + apply_decision) on the same
seed, so the figures are exactly what the game would have produced. Hindsight: one market path says
nothing about the next one.
"""

from collections.abc import Callable
from dataclasses import dataclass

from contracts import Action, Catalog, GameState, OnboardingAnswers, RoundKind

from .engine import apply_decision, new_game

Policy = Callable[[GameState], Action | None]


def _do_nothing(_: GameState) -> Action | None:
    return None  # the engine's default: hold / stay out / keep the raise


def _always_add(state: GameState) -> Action | None:
    acts = state.available_actions
    if state.kind == RoundKind.RAISE:
        return Action.INVEST_RAISE_100
    if Action.BUY_BACK in acts:
        return Action.BUY_BACK
    return Action.CONTRIBUTE if Action.CONTRIBUTE in acts else None


def _sell_at_first_drop(state: GameState) -> Action | None:
    if Action.SELL_ALL in state.available_actions and state.portfolio_drawdown > 0.05:
        return Action.SELL_ALL
    return None


POLICIES: dict[str, Policy] = {
    "hold": _do_nothing,
    "always_add": _always_add,
    "sell_first_drop": _sell_at_first_drop,
}


@dataclass(frozen=True)
class Replay:
    policy: str
    wealth_path: list[
        float
    ]  # starting capital, then wealth when deciding each round, then final wealth
    final_eur: float
    contributed_eur: float


def _wealth(s: GameState) -> float:
    return s.cash_eur + s.invested_eur


def replay(
    policy: str, answers: OnboardingAnswers, catalog: Catalog, seed: int, game_id: str = "cf"
) -> Replay:
    """Play a whole game with a fixed policy on the same seed. Deterministic."""
    choose = POLICIES[policy]
    scenario, state = new_game(game_id, answers, catalog, seed)
    path = [state.starting_capital_eur]
    while not state.finished:
        path.append(_wealth(state))
        state = apply_decision(state, scenario, choose(state), response_time_ms=0)
    path.append(_wealth(state))
    return Replay(policy, path, _wealth(state), state.contributed_eur)
