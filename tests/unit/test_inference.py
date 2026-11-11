"""Checks of the robust inference model (inference/model.py)."""

import numpy as np
import pytest

from behaviorlab.inference import model
from behaviorlab.inference.model import (
    ETA_GRID,
    LAMBDA_GRID,
    LAPSE_PRIOR,
    LAPSES,
    NOISE_PRIOR,
    NOISE_SCALES,
    THETA_GRID,
    UNINFORMATIVE_NOTE,
    action_probabilities,
    estimate_posterior,
    log_marginal_grid,
)
from contracts import Action, Decision, Phase, RoundKind

MARKET = [Action.SELL_ALL, Action.HOLD, Action.CONTRIBUTE]
OUT = [Action.STAY_OUT, Action.BUY_BACK]
RAISE = [Action.INVEST_RAISE_0, Action.INVEST_RAISE_50, Action.INVEST_RAISE_100]


def _decision(
    d: float,
    action: Action,
    available: list[Action],
    kind: RoundKind = RoundKind.MARKET,
    timed_out: bool = False,
) -> Decision:
    return Decision(
        round_index=1,
        phase=Phase.DROP,
        kind=kind,
        action=action,
        available_actions=available,
        response_time_ms=1000,
        timed_out=timed_out,
        wealth_eur=1000,
        invested_eur=1000,
        cash_eur=0,
        salary_eur=1800,
        portfolio_drawdown=d,
        salary_raise_eur=200 if kind == RoundKind.RAISE else 0,
    )


def _market(d: float, action: Action, timed_out: bool = False) -> Decision:
    return _decision(d, action, MARKET, timed_out=timed_out)


def _raise(action: Action) -> Decision:
    return _decision(0.1, action, RAISE, kind=RoundKind.RAISE)


def _mean(decisions: list[Decision], name: str) -> float:
    return next(p.mean for p in estimate_posterior(decisions).summary if p.name == name)


def _interval(decisions: list[Decision], name: str) -> tuple[float, float]:
    p = next(p for p in estimate_posterior(decisions).summary if p.name == name)
    return p.ci_low, p.ci_high


def test_nuisance_priors_are_distributions() -> None:
    assert NOISE_PRIOR.sum() == pytest.approx(1)
    assert LAPSE_PRIOR.sum() == pytest.approx(1)
    assert len(NOISE_SCALES) == len(NOISE_PRIOR)
    assert len(LAPSES) == len(LAPSE_PRIOR)


def test_action_probabilities_sum_to_one_and_lapse_floor() -> None:
    dec = _market(0.15, Action.HOLD)
    for scale in (0.5, 1.0, 2.0):
        for lapse in (0.0, 0.1, 0.2):
            probs = action_probabilities(dec, 2.0, 0.2, 0.5, scale, lapse)
            assert sum(probs.values()) == pytest.approx(1)
            assert min(probs.values()) >= lapse / 3 - 1e-12


def test_marginals_sum_to_one() -> None:
    post = estimate_posterior([_market(0.1, Action.HOLD), _raise(Action.INVEST_RAISE_50)])
    for name, w in post.marginals.items():
        assert sum(w) == pytest.approx(1)
        assert len(w) == len(post.grid[name])


def test_no_data_gives_uniform_posterior() -> None:
    post = estimate_posterior([])
    assert post.marginals["theta"] == pytest.approx([1 / len(THETA_GRID)] * len(THETA_GRID))
    assert post.marginals["lambda"] == pytest.approx([1 / len(LAMBDA_GRID)] * len(LAMBDA_GRID))


def test_marginal_likelihood_matches_scalar_reference() -> None:
    """Vectorised log-marginal equals a scalar sum over (s, eps) of products of P(a)."""
    decisions = [
        _market(0.05, Action.HOLD),
        _market(0.15, Action.SELL_ALL),
        _decision(0.10, Action.STAY_OUT, OUT),
        _decision(0.02, Action.BUY_BACK, OUT),
        _raise(Action.INVEST_RAISE_100),
    ]
    grid = log_marginal_grid(decisions)
    rng = np.random.default_rng(0)
    for _ in range(15):
        i, j, k = (int(rng.integers(n)) for n in (len(LAMBDA_GRID), len(THETA_GRID), len(ETA_GRID)))
        total = 0.0
        for s, ps in zip(NOISE_SCALES, NOISE_PRIOR, strict=True):
            for e, pe in zip(LAPSES, LAPSE_PRIOR, strict=True):
                lik = np.prod(
                    [
                        action_probabilities(
                            d, LAMBDA_GRID[i], THETA_GRID[j], ETA_GRID[k], float(s), float(e)
                        )[d.action]
                        for d in decisions
                    ]
                )
                total += ps * pe * lik
        assert grid[i, j, k] == pytest.approx(np.log(total))


def test_early_seller_has_lower_theta_than_holder() -> None:
    seller = [_market(0.04, Action.HOLD), _market(0.08, Action.SELL_ALL)]
    holder = [_market(d, Action.HOLD) for d in (0.05, 0.1, 0.2, 0.3)]
    assert _mean(seller, "theta") < 0.12 < _mean(holder, "theta")


def test_eta_follows_raise_choices() -> None:
    def eta(action: Action) -> float:
        return _mean([_raise(action)] * 3, "eta")

    assert eta(Action.INVEST_RAISE_0) < eta(Action.INVEST_RAISE_50) < eta(Action.INVEST_RAISE_100)


def test_timeouts_are_ignored() -> None:
    a = estimate_posterior([_market(0.1, Action.HOLD)])
    b = estimate_posterior([_market(0.1, Action.HOLD), _market(0.3, Action.HOLD, timed_out=True)])
    assert a.marginals == b.marginals
    assert b.n_decisions == 1


def test_one_odd_decision_does_not_collapse_the_interval() -> None:
    """Robustness: a lone contradictory choice must not make theta falsely precise."""
    consistent = [_market(d, Action.HOLD) for d in (0.05, 0.10, 0.15, 0.20)]
    odd = [*consistent, _market(0.05, Action.SELL_ALL)]
    low, high = _interval(odd, "theta")
    assert high - low > 0.15


def test_uninformative_parameter_is_labelled() -> None:
    post = estimate_posterior([])
    for p in post.summary:
        assert UNINFORMATIVE_NOTE in p.description
    informed = estimate_posterior([_raise(Action.INVEST_RAISE_100)] * 6)
    eta = next(p for p in informed.summary if p.name == "eta")
    assert UNINFORMATIVE_NOTE not in eta.description


def test_model_is_the_production_model() -> None:
    assert model.PROVISIONAL is False
    assert estimate_posterior([]).provisional is False
