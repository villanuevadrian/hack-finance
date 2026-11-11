"""RF-06, D5, D6: portfolio simulation and selection."""

import numpy as np
import pytest

from behaviorlab.portfolio import (
    evaluate_candidates,
    revealed_level,
    select_portfolio,
    simulate_candidate,
    suitability_levels,
)
from behaviorlab.portfolio.selection import money_market_annual_return
from contracts import CandidateMetrics, Catalog, ParameterEstimate, Posterior


def _posterior_theta(theta: float) -> Posterior:
    est = ParameterEstimate(name="theta", mean=theta, ci_low=theta, ci_high=theta)
    return Posterior(
        grid={"theta": [theta]}, marginals={"theta": [1.0]}, summary=[est], n_decisions=0
    )


def _cand(level: int, p_panic: float, p10: float) -> CandidateMetrics:
    return CandidateMetrics(
        portfolio_id=f"p{level}",
        name=f"P{level}",
        risk_level=level,
        eligible=True,
        p_panic=p_panic,
        final_multiple_p10=p10,
        final_multiple_p50=p10 + 0.1,
        final_multiple_p90=p10 + 0.2,
    )


def test_zero_returns_conserve_capital_and_never_panic() -> None:
    zeros = np.zeros((10, 36))
    final, panic = simulate_candidate(0.6, zeros, zeros, np.full(10, 0.01))
    assert final == pytest.approx(np.ones(10))
    assert not panic.any()


def test_selling_freezes_value() -> None:
    rv = np.array([[-0.5, 1.0, 1.0]])
    rf = np.zeros((1, 3))
    final, panic = simulate_candidate(1.0, rv, rf, np.array([0.2]))
    assert panic[0] and final[0] == pytest.approx(0.5)
    final, panic = simulate_candidate(1.0, rv, rf, np.array([0.9]))
    assert not panic[0] and final[0] == pytest.approx(0.5 * 2 * 2)


def test_annual_rebalancing_within_year_is_buy_and_hold() -> None:
    rv = np.array([[0.1, 0.1]])
    rf = np.array([[0.0, 0.0]])
    final, _ = simulate_candidate(0.5, rv, rf, np.array([1.0]))
    assert final[0] == pytest.approx(0.5 * 1.21 + 0.5)


def test_braver_player_panics_less(catalog: Catalog) -> None:
    timid = evaluate_candidates(_posterior_theta(0.05), catalog, 5, 5, seed=1, n_paths=400)
    brave = evaluate_candidates(_posterior_theta(0.4), catalog, 5, 5, seed=1, n_paths=400)
    for t, b in zip(timid, brave, strict=True):
        assert b.p_panic <= t.p_panic


def test_evaluation_is_reproducible(catalog: Catalog) -> None:
    a = evaluate_candidates(_posterior_theta(0.2), catalog, 3, 2, seed=7, n_paths=200)
    b = evaluate_candidates(_posterior_theta(0.2), catalog, 3, 2, seed=7, n_paths=200)
    assert a == b
    assert [c.eligible for c in a] == [c.risk_level <= 2 for c in a]


def test_revealed_level_and_final_min() -> None:
    cands = [_cand(0, 0.0, 0.9), _cand(1, 0.1, 0.95), _cand(2, 0.3, 1.0)]
    assert revealed_level(cands, 0.2) == 1
    assert revealed_level([_cand(0, 0.5, 0.9)], 0.2) == 0
    levels = suitability_levels(4, 2, 2)
    assert levels.final == 2 and levels.limiting == ["capacity", "horizon"]


def test_select_portfolio_d5() -> None:
    cands = [_cand(0, 0.0, 0.9), _cand(1, 0.1, 0.95), _cand(2, 0.1, 0.93), _cand(3, 0.5, 1.2)]
    assert select_portfolio(cands, 3, 0.2).risk_level == 2  # highest risk that is held
    assert select_portfolio(cands, 1, 0.2).risk_level == 1  # capped by final level
    assert select_portfolio(cands, 0, 0.2).risk_level == 0
    risky = [_cand(1, 0.6, 1.0), _cand(2, 0.4, 1.1)]
    assert select_portfolio(risky, 2, 0.2).risk_level == 2  # none safe: lowest P(panic)


def test_brave_player_gets_the_highest_risk_allowed(catalog: Catalog) -> None:
    """A player who never sells, with capacity and horizon 5, must not get a cautious portfolio."""
    cands = evaluate_candidates(_posterior_theta(0.6), catalog, 7, 5, seed=3, n_paths=400)
    final = suitability_levels(revealed_level(cands, 0.3), 5, 5).final
    assert final == 5
    assert select_portfolio(cands, final, 0.3).portfolio_id == "metal"


def test_money_market_never_panics_and_uses_published_return(catalog: Catalog) -> None:
    ahorro = catalog.by_id("ahorro")
    r = money_market_annual_return(ahorro)
    assert r == pytest.approx((2.0 + 3.59 + 2.07) / 3 / 100)  # full years of the snapshot
    assert money_market_annual_return(catalog.by_id("clasica")) is None
    cands = evaluate_candidates(_posterior_theta(0.02), catalog, 3, 5, seed=1, n_paths=200)
    a = next(c for c in cands if c.portfolio_id == "ahorro")
    assert a.p_panic == 0
    assert a.final_multiple_p10 == pytest.approx((1 + r) ** 3)
