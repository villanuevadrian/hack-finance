"""Deterministic suitability rules of docs/CUESTIONARIO.md."""

from collections.abc import Callable

import pytest

from behaviorlab.game.onboarding import (
    capacity_level,
    horizon_level,
    knowledge_level,
    missing_required,
    monthly_salary,
    starting_capital,
    stated_level,
)
from contracts import KnowledgeLevel, OnboardingAnswers

Make = Callable[..., OnboardingAnswers]


def test_max_capacity(make_answers: Make) -> None:
    # cushion 2 + commitments 2 + weight 2 + stability 2 = 8 -> 5
    assert capacity_level(make_answers()) == 5


@pytest.mark.parametrize(
    ("overrides", "expected"),
    [
        # 0 + 0 + 0 + 0 = 0 -> 1
        (
            {
                "emergency_months": "lt_1",
                "fixed_commitments": "gt_50",
                "share_invested": "gt_75",
                "income_source": "none",
            },
            1,
        ),
        # 1 + 1 + 1 + 0 = 3 -> 2
        (
            {
                "emergency_months": "1_3",
                "fixed_commitments": "20_35",
                "share_invested": "50_75",
                "income_source": "grant_or_family",
            },
            2,
        ),
        # 1 + 1 + 1 + 1 = 4 -> 3
        (
            {
                "emergency_months": "3_6",
                "fixed_commitments": "35_50",
                "share_invested": "25_50",
                "income_source": "temporary",
            },
            3,
        ),
        # 2 + 2 + 1 + 2 = 7 -> 4
        ({"share_invested": "25_50"}, 4),
    ],
)
def test_capacity_table(make_answers: Make, overrides: dict, expected: int) -> None:
    assert capacity_level(make_answers(**overrides)) == expected


def test_cushion_below_one_month_caps_capacity(make_answers: Make) -> None:
    # 0 + 2 + 2 + 2 = 6 -> 4, capped to 1
    assert capacity_level(make_answers(emergency_months="lt_1")) == 1


@pytest.mark.parametrize(
    ("horizon", "level"),
    [("lt_2", 0), ("2_3", 1), ("3_4", 2), ("4_6", 3), ("6_7", 4), ("gt_7", 5)],
)
def test_horizon_levels(make_answers: Make, horizon: str, level: int) -> None:
    assert horizon_level(make_answers(horizon=horizon)) == level


def test_emergency_goal_caps_horizon(make_answers: Make) -> None:
    assert horizon_level(make_answers(goal="emergency_fund")) == 0


def test_knowledge_levels(make_answers: Make) -> None:
    low = make_answers(quiz_risk="dont_know", quiz_recovery="dont_know", invested_products=[])
    high = make_answers(quiz_recovery="p100", invested_products=["index_funds_etf"])
    assert knowledge_level(low) == KnowledgeLevel.LOW
    assert knowledge_level(make_answers()) == KnowledgeLevel.MEDIUM
    assert knowledge_level(high) == KnowledgeLevel.HIGH


def test_missing_required_blocks_profile(make_answers: Make) -> None:
    answers = make_answers(income_source=None, consent=False)
    assert missing_required(answers) == ["consent", "income_source"]
    with pytest.raises(ValueError):
        capacity_level(answers)


def test_optional_fields_do_not_block(make_answers: Make) -> None:
    assert missing_required(make_answers(monthly_saving=None, financial_wealth=None)) == []


def test_defaults_and_stated_level(make_answers: Make) -> None:
    assert starting_capital(make_answers(amount_eur=None)) == 10_000
    assert starting_capital(make_answers()) == 5_000
    assert monthly_salary(make_answers(income=None)) == 1_800
    assert monthly_salary(make_answers()) == 2_150
    assert stated_level(make_answers()) == 3
