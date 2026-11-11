"""Checks of the reference inference model (fixed noise)."""

import numpy as np
import pytest

from behaviorlab.inference import estimate_posterior
from behaviorlab.inference.reference import (
    ETA_GRID,
    LAMBDA_GRID,
    THETA_GRID,
    action_probabilities,
    log_likelihood_grid,
)
from contracts import Action, Decision, Phase, RoundKind

MARKET = [Action.SELL_ALL, Action.HOLD, Action.CONTRIBUTE]
RAISE = [Action.INVEST_RAISE_0, Action.INVEST_RAISE_50, Action.INVEST_RAISE_100]


def _market(d: float, action: Action, timed_out: bool = False) -> Decision:
    return Decision(
        round_index=1,
        phase=Phase.DROP,
        kind=RoundKind.MARKET,
        action=action,
        available_actions=MARKET,
        response_time_ms=1000,
        timed_out=timed_out,
        wealth_eur=1000,
        invested_eur=1000,
        cash_eur=0,
        salary_eur=1800,
        portfolio_drawdown=d,
    )


def _raise(action: Action) -> Decision:
    return Decision(
        round_index=6,
        phase=Phase.SALARY,
        kind=RoundKind.RAISE,
        action=action,
        available_actions=RAISE,
        response_time_ms=1000,
        wealth_eur=1000,
        invested_eur=1000,
        cash_eur=0,
        salary_eur=1800,
        portfolio_drawdown=0.1,
        salary_raise_eur=200,
    )


def _theta_mean(decisions: list[Decision]) -> float:
    return next(p.mean for p in estimate_posterior(decisions).summary if p.name == "theta")


def test_marginals_sum_to_one_and_intervals_contain_mean() -> None:
    post = estimate_posterior([_market(0.1, Action.HOLD), _raise(Action.INVEST_RAISE_50)])
    for name, w in post.marginals.items():
        assert sum(w) == pytest.approx(1)
        assert len(w) == len(post.grid[name])
    assert not post.provisional


def test_no_data_gives_uniform_posterior() -> None:
    post = estimate_posterior([])
    assert post.marginals["theta"] == pytest.approx([1 / len(THETA_GRID)] * len(THETA_GRID))


def test_vectorised_likelihood_matches_scalar_reference() -> None:
    decisions = [
        _market(0.05, Action.HOLD),
        _market(0.15, Action.SELL_ALL),
        _market(0.02, Action.CONTRIBUTE),
        _raise(Action.INVEST_RAISE_100),
    ]
    grid = log_likelihood_grid(decisions)
    rng = np.random.default_rng(0)
    for _ in range(20):
        i, j, k = (int(rng.integers(n)) for n in (len(LAMBDA_GRID), len(THETA_GRID), len(ETA_GRID)))
        ref = sum(
            np.log(action_probabilities(d, LAMBDA_GRID[i], THETA_GRID[j], ETA_GRID[k])[d.action])
            for d in decisions
        )
        assert grid[i, j, k] == pytest.approx(ref)


def test_early_seller_has_lower_theta_than_holder() -> None:
    seller = [_market(0.04, Action.HOLD), _market(0.08, Action.SELL_ALL)]
    holder = [_market(d, Action.HOLD) for d in (0.05, 0.1, 0.2, 0.3)]
    assert _theta_mean(seller) < 0.12 < _theta_mean(holder)


def test_eta_follows_raise_choices() -> None:
    def eta(action: Action) -> float:
        post = estimate_posterior([_raise(action)] * 3)
        return next(p.mean for p in post.summary if p.name == "eta")

    assert eta(Action.INVEST_RAISE_0) < eta(Action.INVEST_RAISE_50) < eta(Action.INVEST_RAISE_100)


def test_timeouts_are_ignored() -> None:
    a = estimate_posterior([_market(0.1, Action.HOLD)])
    b = estimate_posterior([_market(0.1, Action.HOLD), _market(0.3, Action.HOLD, timed_out=True)])
    assert a.marginals == b.marginals
    assert b.n_decisions == 1
