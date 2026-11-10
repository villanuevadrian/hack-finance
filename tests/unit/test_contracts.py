"""One valid example per contract plus the validations that protect the invariants."""

import pytest
from pydantic import ValidationError

from contracts import (
    Action,
    CandidateMetrics,
    Catalog,
    CatalogPortfolio,
    Decision,
    Episode,
    GameState,
    KnowledgeLevel,
    ParameterEstimate,
    Phase,
    PortfolioProposal,
    Posterior,
    Profile,
    Reliability,
    RoundKind,
    Scenario,
    Situation,
    SuitabilityLevels,
)


def _portfolio(**kw: object) -> CatalogPortfolio:
    base = {
        "id": "pop",
        "name": "Cartera Pop",
        "equity_pct": 39,
        "fixed_income_pct": 61,
        "risk_level": 2,
        "profile": "MODERADO",
        "min_horizon_years": 3,
    }
    return CatalogPortfolio.model_validate({**base, **kw})


def _decision(**kw: object) -> Decision:
    base = {
        "round_index": 1,
        "phase": Phase.DROP,
        "kind": RoundKind.MARKET,
        "action": Action.HOLD,
        "available_actions": [Action.SELL_ALL, Action.HOLD, Action.CONTRIBUTE],
        "response_time_ms": 1200,
        "wealth_eur": 1000,
        "invested_eur": 1000,
        "cash_eur": 0,
        "salary_eur": 1800,
        "portfolio_drawdown": 0.1,
    }
    return Decision.model_validate({**base, **kw})


def _levels() -> SuitabilityLevels:
    return SuitabilityLevels(revealed=3, capacity=4, horizon=5, final=3, limiting=["revealed"])


def test_catalog_snapshot_is_valid(catalog: Catalog) -> None:
    assert len(catalog.portfolios) == 6
    assert catalog.source
    assert catalog.by_level(5).id == "metal"
    assert catalog.by_level(2).equity_weight == pytest.approx(0.39)


def test_catalog_portfolio_weights_must_sum_100() -> None:
    _portfolio()
    with pytest.raises(ValidationError):
        _portfolio(fixed_income_pct=50)


def test_catalog_rejects_duplicate_ids() -> None:
    with pytest.raises(ValidationError):
        Catalog(snapshot_date="2026-11-08", source="x", portfolios=[_portfolio(), _portfolio()])


def test_onboarding_example(answers: object) -> None:
    assert answers.consent is True  # type: ignore[attr-defined]


def test_scenario_example_and_length_check() -> None:
    sit = Situation(
        round_index=1, phase=Phase.DROP, kind=RoundKind.MARKET, rv_return=0.01, rf_return=0.0
    )
    Scenario(seed=1, episode=Episode.SUSTO, rv_path=[1, 1.01], rf_path=[1, 1], situations=[sit])
    with pytest.raises(ValidationError):
        Scenario(seed=1, episode=Episode.SUSTO, rv_path=[1], rf_path=[1], situations=[sit])


def test_decision_example_and_unavailable_action() -> None:
    _decision()
    with pytest.raises(ValidationError):
        _decision(action=Action.BUY_BACK)


def test_game_state_example() -> None:
    state = GameState(
        game_id="g",
        seed=1,
        portfolio_id="pop",
        equity_pct=39,
        n_rounds=15,
        round_index=1,
        phase=Phase.DROP,
        kind=RoundKind.MARKET,
        available_actions=[Action.HOLD],
        starting_capital_eur=1000,
        cash_eur=100,
        invested_eur=900,
        salary_eur=1800,
        monthly_auto_invest_eur=0,
        contributed_eur=0,
        portfolio_drawdown=0,
    )
    assert state.wealth_eur == 1000
    with pytest.raises(ValidationError):
        GameState.model_validate({**state.model_dump(), "finished": True})


def test_parameter_estimate_interval_contains_mean() -> None:
    ParameterEstimate(name="theta", mean=0.2, ci_low=0.1, ci_high=0.3)
    with pytest.raises(ValidationError):
        ParameterEstimate(name="theta", mean=0.4, ci_low=0.1, ci_high=0.3)


def test_posterior_marginals_must_sum_one() -> None:
    est = ParameterEstimate(name="theta", mean=0.2, ci_low=0.1, ci_high=0.3)
    Posterior(
        grid={"theta": [0.1, 0.3]}, marginals={"theta": [0.5, 0.5]}, summary=[est], n_decisions=1
    )
    with pytest.raises(ValidationError):
        Posterior(
            grid={"theta": [0.1, 0.3]},
            marginals={"theta": [0.5, 0.6]},
            summary=[est],
            n_decisions=1,
        )


def test_suitability_final_is_minimum() -> None:
    _levels()
    with pytest.raises(ValidationError):
        SuitabilityLevels(revealed=3, capacity=4, horizon=5, final=4, limiting=["capacity"])
    with pytest.raises(ValidationError):
        SuitabilityLevels(revealed=3, capacity=3, horizon=5, final=3, limiting=["revealed"])


def test_profile_and_proposal_examples() -> None:
    est = ParameterEstimate(name="theta", mean=0.2, ci_low=0.1, ci_high=0.3)
    Profile(
        game_id="g",
        parameters=[est],
        n_rounds=15,
        reliability=Reliability.MEDIUM,
        knowledge_level=KnowledgeLevel.MEDIUM,
        levels=_levels(),
        stated_reaction="wait",
        stated_level=3,
        timeouts=0,
    )
    cand = CandidateMetrics(
        portfolio_id="pop",
        name="Cartera Pop",
        risk_level=2,
        eligible=True,
        p_panic=0.1,
        final_multiple_p10=0.9,
        final_multiple_p50=1.1,
        final_multiple_p90=1.3,
    )
    proposal = PortfolioProposal(
        game_id="g",
        portfolio_id="pop",
        portfolio_name="Cartera Pop",
        risk_level=2,
        levels=_levels(),
        candidates=[cand],
        max_panic_prob=0.2,
        horizon_years=7,
        n_paths=100,
        seed=1,
        amount_eur=5000,
        justification="x",
    )
    assert "No es asesoramiento" in proposal.disclaimer
