"""RF-02, RF-03: game engine mechanics."""

from collections.abc import Callable

import pytest

from behaviorlab.game import GameError, apply_decision, new_game
from behaviorlab.game.engine import (
    CONTRIBUTION_SHARE,
    DEFAULT_TIMEOUT_MS,
    choose_episode,
    simulated_portfolio_level,
)
from contracts import (
    Action,
    Catalog,
    Episode,
    GameState,
    OnboardingAnswers,
    Phase,
    RoundKind,
    Scenario,
    Situation,
)


def _play(state: GameState, scenario: Scenario, pick: Callable[[GameState], Action]) -> GameState:
    while not state.finished:
        state = apply_decision(state, scenario, pick(state), 1000)
    return state


def _hold(state: GameState) -> Action:
    for a in (Action.HOLD, Action.STAY_OUT, Action.INVEST_RAISE_0):
        if a in state.available_actions:
            return a
    raise AssertionError(state.available_actions)


def _flat_scenario() -> Scenario:
    """Zero returns everywhere: money is only what was put in (V4: capital is conserved)."""
    raises = {6: 100.0, 8: 200.0, 10: 300.0}
    situations = [
        Situation(
            round_index=r,
            phase=Phase.DROP if r <= 5 else Phase.SALARY if r <= 10 else Phase.RECOVERY,
            kind=RoundKind.RAISE if r in raises else RoundKind.MARKET,
            rv_return=0.0,
            rf_return=0.0,
            salary_raise_eur=raises.get(r, 0.0),
        )
        for r in range(1, 16)
    ]
    return Scenario(
        seed=0, episode=Episode.SUSTO, rv_path=[1.0] * 16, rf_path=[1.0] * 16, situations=situations
    )


def test_full_game_records_15_decisions(answers: OnboardingAnswers, catalog: Catalog) -> None:
    scenario, state = new_game("g", answers, catalog, seed=3)
    final = _play(state, scenario, _hold)
    assert final.finished and final.available_actions == []
    assert [d.round_index for d in final.history] == list(range(1, 16))
    assert [d.phase for d in final.history] == [Phase.DROP] * 5 + [Phase.SALARY] * 5 + [
        Phase.RECOVERY
    ] * 5


def test_same_seed_same_game(answers: OnboardingAnswers, catalog: Catalog) -> None:
    assert new_game("g", answers, catalog, 8) == new_game("g", answers, catalog, 8)


def test_simulated_portfolio_is_min_capacity_horizon(
    make_answers: Callable[..., OnboardingAnswers], catalog: Catalog
) -> None:
    _, state = new_game("g", make_answers(horizon="3_4"), catalog, 1)
    assert state.portfolio_id == "pop"


def test_actions_by_round_kind(answers: OnboardingAnswers, catalog: Catalog) -> None:
    scenario, state = new_game("g", answers, catalog, 2)
    assert set(state.available_actions) == {Action.SELL_ALL, Action.HOLD, Action.CONTRIBUTE}
    while state.round_index < 6:
        state = apply_decision(state, scenario, Action.HOLD, 500)
    assert state.kind == RoundKind.RAISE
    assert set(state.available_actions) == {
        Action.INVEST_RAISE_0,
        Action.INVEST_RAISE_50,
        Action.INVEST_RAISE_100,
    }


def test_conservation_with_zero_returns(answers: OnboardingAnswers, catalog: Catalog) -> None:
    _, state = new_game("g", answers, catalog, 1)
    scenario = _flat_scenario()
    state = state.model_copy(update={"invested_eur": state.starting_capital_eur})

    def pick(s: GameState) -> Action:
        if s.kind == RoundKind.RAISE:
            return Action.INVEST_RAISE_100
        if s.round_index == 2:
            return Action.CONTRIBUTE
        if s.round_index == 4:
            return Action.SELL_ALL
        if s.round_index == 11:
            return Action.BUY_BACK
        return _hold(s)

    final = _play(state, scenario, pick)
    assert final.wealth_eur == pytest.approx(final.starting_capital_eur + final.contributed_eur)
    assert final.contributed_eur > CONTRIBUTION_SHARE * 2000


def test_sell_then_buy_back(answers: OnboardingAnswers, catalog: Catalog) -> None:
    scenario, state = new_game("g", answers, catalog, 4)
    wealth = state.wealth_eur
    state = apply_decision(state, scenario, Action.SELL_ALL, 800)
    assert state.invested_eur == 0
    assert set(state.available_actions) == {Action.STAY_OUT, Action.BUY_BACK}
    assert state.cash_eur == pytest.approx(wealth)
    state = apply_decision(state, scenario, Action.BUY_BACK, 800)
    assert state.cash_eur == 0 and state.invested_eur > 0


def test_contribute_adds_ten_percent_of_salary(
    answers: OnboardingAnswers, catalog: Catalog
) -> None:
    scenario, state = new_game("g", answers, catalog, 4)
    nxt = apply_decision(state, scenario, Action.CONTRIBUTE, 800)
    assert nxt.contributed_eur == pytest.approx(CONTRIBUTION_SHARE * state.salary_eur)


def test_raise_updates_salary_and_auto_investment(
    answers: OnboardingAnswers, catalog: Catalog
) -> None:
    scenario, state = new_game("g", answers, catalog, 4)
    while state.round_index < 6:
        state = apply_decision(state, scenario, Action.HOLD, 500)
    raise_eur = state.salary_raise_eur
    nxt = apply_decision(state, scenario, Action.INVEST_RAISE_50, 500)
    assert nxt.salary_eur == pytest.approx(state.salary_eur + raise_eur)
    assert nxt.monthly_auto_invest_eur == pytest.approx(0.5 * raise_eur)


def test_timeout_counts_as_doing_nothing(answers: OnboardingAnswers, catalog: Catalog) -> None:
    scenario, state = new_game("g", answers, catalog, 4)
    nxt = apply_decision(state, scenario, Action.SELL_ALL, DEFAULT_TIMEOUT_MS + 1)
    assert nxt.history[-1].action == Action.HOLD and nxt.history[-1].timed_out
    nxt = apply_decision(nxt, scenario, None, 1_000)
    assert nxt.history[-1].timed_out


def test_invalid_moves(answers: OnboardingAnswers, catalog: Catalog) -> None:
    scenario, state = new_game("g", answers, catalog, 4)
    with pytest.raises(GameError):
        apply_decision(state, scenario, Action.BUY_BACK, 100)
    final = _play(state, scenario, _hold)
    with pytest.raises(GameError):
        apply_decision(final, scenario, Action.HOLD, 100)


def test_missing_onboarding_data(
    make_answers: Callable[..., OnboardingAnswers], catalog: Catalog
) -> None:
    with pytest.raises(GameError):
        new_game("g", make_answers(emergency_months=None), catalog, 1)


def test_conservative_portfolios_get_an_informative_episode() -> None:
    for seed in range(30):
        assert choose_episode(seed, 0.13) == Episode.INFLACION


def test_timeout_is_30_seconds_by_default() -> None:
    assert DEFAULT_TIMEOUT_MS == 30_000


def test_level_zero_players_play_a_portfolio_that_moves(
    make_answers: Callable[..., OnboardingAnswers], catalog: Catalog
) -> None:
    answers = make_answers(goal="emergency_fund")  # horizon level 0
    assert simulated_portfolio_level(answers) == 1
    _, state = new_game("g", answers, catalog, 1)
    assert state.portfolio_id == "clasica"
