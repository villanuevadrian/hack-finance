"""Fixed questionnaire answers and catalog loader for the validation runs.

Synthetic answers, no personal data. They give capacity 'university / employee / 1800-2500 EUR'
and a long horizon, so the simulated players play a mid-risk portfolio.
"""

import json
from pathlib import Path

from contracts import Catalog, OnboardingAnswers

REPO_ROOT = Path(__file__).resolve().parents[3]
CATALOG_FILE = REPO_ROOT / "data" / "catalog" / "myinvestor_carteras_2026-11-08.json"

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


def load_catalog() -> Catalog:
    return Catalog.model_validate(json.loads(CATALOG_FILE.read_text(encoding="utf-8")))


def base_answers() -> OnboardingAnswers:
    return OnboardingAnswers.model_validate(BASE_ANSWERS)
