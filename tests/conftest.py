import json
from collections.abc import Callable
from pathlib import Path

import pytest

from contracts import Catalog, OnboardingAnswers

CATALOG_FILE = (
    Path(__file__).resolve().parents[1] / "data" / "catalog" / "myinvestor_carteras_2026-11-08.json"
)

BASE_ANSWERS: dict[str, object] = {
    "consent": True,
    "education": "university",
    "occupation": "employee",
    "known_products": ["index_funds_etf"],
    "invested_products": [],
    "trading_frequency": "never",
    "invested_volume": "none",
    "quiz_risk": "single_stock",
    "quiz_recovery": "p50",
    "quiz_guarantee": "false",
    "income": "1800_2500",
    "income_source": "permanent",
    "monthly_saving": "100_300",
    "financial_wealth": "5k_20k",
    "fixed_commitments": "lt_20",
    "emergency_months": "gt_6",
    "share_invested": "lt_25",
    "amount_eur": 5000,
    "goal": "long_term_growth",
    "horizon": "gt_7",
    "return_preference": "minus15_plus6",
    "stated_reaction": "wait",
}


@pytest.fixture(scope="session")
def catalog() -> Catalog:
    with CATALOG_FILE.open(encoding="utf-8") as f:
        return Catalog.model_validate(json.load(f))


@pytest.fixture
def make_answers() -> Callable[..., OnboardingAnswers]:
    def _make(**overrides: object) -> OnboardingAnswers:
        return OnboardingAnswers.model_validate({**BASE_ANSWERS, **overrides})

    return _make


@pytest.fixture
def answers(make_answers: Callable[..., OnboardingAnswers]) -> OnboardingAnswers:
    return make_answers()
