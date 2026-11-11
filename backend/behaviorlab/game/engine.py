"""Game engine: 15 rounds in 3 phases with the actions of D2 (option B). Pure functions.

Timeline of round r (1..15):
  1. the market move of round r has already been applied (round 1 at creation);
  2. the player decides with what they see (wealth, drawdown, raise);
  3. the action is applied and, if r < 15, the move of round r + 1 follows, then the
     monthly auto-investment of the accepted raises is added.

Money:
  invested_t = invested_{t-1} * V_t / V_{t-1}           (V: portfolio_path, buy-and-hold)
  CONTRIBUTE adds 10 % of the monthly salary to `invested`.
  INVEST_RAISE_f raises the salary by the raise R and adds f * R to the monthly
  auto-investment, paid at the end of every later round (to cash while out of the market).
  SELL_ALL moves everything to cash (0 % return); BUY_BACK moves the cash back in.
  A decision slower than `timeout_ms` (or with no action) counts as "do nothing":
  HOLD, STAY_OUT or INVEST_RAISE_0 (CALIBRACION.md §8, rule 4).
"""

import numpy as np

from behaviorlab.game.onboarding import (
    capacity_level,
    horizon_level,
    missing_required,
    monthly_salary,
    starting_capital,
)
from behaviorlab.scenarios import episode_portfolio_drop, generate_scenario, portfolio_path
from contracts import (
    Action,
    Catalog,
    Decision,
    Episode,
    GameState,
    OnboardingAnswers,
    RoundKind,
    Scenario,
)

CONTRIBUTION_SHARE = 0.10  # D2: "aportar el 10 % del sueldo"
DEFAULT_TIMEOUT_MS = 15_000  # CALIBRACION.md §8, rule 4
# Accepted by Producto (11-nov): below this portfolio drop the chosen episode teaches
# little about theta and
# `inflacion` (equity and bonds fall together) is used instead (CALIBRACION.md §4).
MIN_INFORMATIVE_DROP = 0.10

RAISE_FRACTION: dict[Action, float] = {
    Action.INVEST_RAISE_0: 0.0,
    Action.INVEST_RAISE_50: 0.5,
    Action.INVEST_RAISE_100: 1.0,
}


class GameError(ValueError):
    """Invalid move (finished game, unavailable action, missing onboarding data)."""


def simulated_portfolio_level(answers: OnboardingAnswers) -> int:
    """Portfolio played in the game: level min(capacity, horizon) (CALIBRACION.md §7)."""
    return min(capacity_level(answers), horizon_level(answers))


def choose_episode(seed: int, equity_weight: float) -> Episode:
    """Seeded episode; falls back to `inflacion` when the portfolio would barely drop."""
    episode = generate_scenario(seed).episode
    if -episode_portfolio_drop(episode, equity_weight) < MIN_INFORMATIVE_DROP:
        return Episode.INFLACION
    return episode


def is_in_market(history: list[Decision]) -> bool:
    """Out of the market after SELL_ALL until BUY_BACK."""
    for d in reversed(history):
        if d.action == Action.SELL_ALL:
            return False
        if d.action == Action.BUY_BACK:
            return True
    return True


def available_actions(
    kind: RoundKind, in_market: bool, seed: int, round_index: int
) -> list[Action]:
    """Actions of the round, shuffled with a seed per round (neutral order, rule 3)."""
    if kind == RoundKind.RAISE:
        actions = [Action.INVEST_RAISE_0, Action.INVEST_RAISE_50, Action.INVEST_RAISE_100]
    elif in_market:
        actions = [Action.SELL_ALL, Action.HOLD, Action.CONTRIBUTE]
    else:
        actions = [Action.STAY_OUT, Action.BUY_BACK]
    order = np.random.default_rng([seed, round_index]).permutation(len(actions))
    return [actions[i] for i in order]


def default_action(kind: RoundKind, in_market: bool) -> Action:
    """What "doing nothing" means in each kind of round."""
    if kind == RoundKind.RAISE:
        return Action.INVEST_RAISE_0
    return Action.HOLD if in_market else Action.STAY_OUT


def _drawdown_at(values: list[float], round_index: int) -> float:
    """d_r = 1 - V_r / max_{t<=r} V_t."""
    return float(max(0.0, 1 - values[round_index] / max(values[: round_index + 1])))


def _view(
    base: GameState, scenario: Scenario, values: list[float], round_index: int
) -> dict[str, object]:
    """Fields that describe round `round_index` before deciding."""
    s = scenario.situations[round_index - 1]
    in_market = is_in_market(base.history)
    return {
        "round_index": round_index,
        "phase": s.phase,
        "kind": s.kind,
        "available_actions": available_actions(s.kind, in_market, base.seed, round_index),
        "portfolio_drawdown": _drawdown_at(values, round_index),
        "last_rv_return": s.rv_return,
        "last_rf_return": s.rf_return,
        "last_portfolio_return": values[round_index] / values[round_index - 1] - 1,
        "salary_raise_eur": s.salary_raise_eur,
    }


def new_game(
    game_id: str, answers: OnboardingAnswers, catalog: Catalog, seed: int
) -> tuple[Scenario, GameState]:
    """Create the scenario and the state of round 1 (its market move already applied)."""
    missing = missing_required(answers)
    if missing:
        raise GameError(f"faltan datos obligatorios del cuestionario: {missing}")
    portfolio = catalog.by_level(simulated_portfolio_level(answers))
    scenario = generate_scenario(seed, choose_episode(seed, portfolio.equity_weight))
    values = portfolio_path(scenario, portfolio.equity_pct)
    capital = starting_capital(answers)
    placeholder = GameState(
        game_id=game_id,
        seed=seed,
        portfolio_id=portfolio.id,
        equity_pct=portfolio.equity_pct,
        n_rounds=scenario.n_rounds,
        round_index=1,
        phase=None,
        kind=None,
        available_actions=[Action.HOLD],
        starting_capital_eur=capital,
        cash_eur=0.0,
        invested_eur=capital * values[1] / values[0],
        salary_eur=monthly_salary(answers),
        monthly_auto_invest_eur=0.0,
        contributed_eur=0.0,
        portfolio_drawdown=0.0,
    )
    state = placeholder.model_copy(update=_view(placeholder, scenario, values, 1))
    return scenario, GameState.model_validate(state.model_dump())


def apply_decision(
    state: GameState,
    scenario: Scenario,
    action: Action | None,
    response_time_ms: int,
    feeling_text: str | None = None,
    timeout_ms: int = DEFAULT_TIMEOUT_MS,
) -> GameState:
    """Record the decision of the current round and advance to the next one."""
    if state.finished:
        raise GameError("la partida ya ha terminado")
    if response_time_ms < 0:
        raise GameError("response_time_ms must be >= 0")
    r = state.round_index
    situation = scenario.situations[r - 1]
    in_market = is_in_market(state.history)
    timed_out = action is None or response_time_ms > timeout_ms
    chosen = default_action(situation.kind, in_market) if timed_out else action
    if chosen not in state.available_actions:
        raise GameError(f"acción no disponible en esta ronda: {chosen}")

    decision = Decision(
        round_index=r,
        phase=situation.phase,
        kind=situation.kind,
        action=chosen,
        available_actions=state.available_actions,
        response_time_ms=response_time_ms,
        timed_out=timed_out,
        wealth_eur=state.wealth_eur,
        invested_eur=state.invested_eur,
        cash_eur=state.cash_eur,
        salary_eur=state.salary_eur,
        portfolio_drawdown=state.portfolio_drawdown,
        salary_raise_eur=situation.salary_raise_eur,
        feeling_text=feeling_text,
    )

    cash, invested = state.cash_eur, state.invested_eur
    salary, auto, contributed = (
        state.salary_eur,
        state.monthly_auto_invest_eur,
        state.contributed_eur,
    )
    if chosen == Action.SELL_ALL:
        cash, invested = cash + invested, 0.0
    elif chosen == Action.BUY_BACK:
        cash, invested = 0.0, invested + cash
    elif chosen == Action.CONTRIBUTE:
        amount = CONTRIBUTION_SHARE * salary
        invested += amount
        contributed += amount
    elif chosen in RAISE_FRACTION:
        salary += situation.salary_raise_eur
        auto += RAISE_FRACTION[chosen] * situation.salary_raise_eur

    history = [*state.history, decision]
    common = {
        "cash_eur": cash,
        "invested_eur": invested,
        "salary_eur": salary,
        "monthly_auto_invest_eur": auto,
        "contributed_eur": contributed,
        "history": history,
    }
    if r == scenario.n_rounds:
        return GameState.model_validate(
            {
                **state.model_dump(),
                **common,
                "round_index": r + 1,
                "finished": True,
                "phase": None,
                "kind": None,
                "available_actions": [],
                "salary_raise_eur": 0.0,
            }
        )

    values = portfolio_path(scenario, state.equity_pct)
    nxt = r + 1
    invested *= values[nxt] / values[nxt - 1]
    if is_in_market(history):
        invested += auto
    else:
        cash += auto
    contributed += auto
    base = state.model_copy(update={**common, "history": history})
    update = {
        **common,
        "cash_eur": cash,
        "invested_eur": invested,
        "contributed_eur": contributed,
        **_view(base, scenario, values, nxt),
    }
    return GameState.model_validate({**state.model_dump(), **update})
