"""Deterministic suitability rules from docs/CUESTIONARIO.md (Producto). No LLM involved."""

from contracts import KnowledgeLevel, OnboardingAnswers
from contracts.onboarding import (
    EmergencyMonths,
    FixedCommitments,
    Goal,
    Horizon,
    Income,
    IncomeSource,
    Product,
    QuizGuarantee,
    QuizRecovery,
    QuizRisk,
    ReturnPreference,
    ShareInvested,
)

# Fields without which the profile cannot be issued (CUESTIONARIO.md §1 and §5)
REQUIRED_FINANCIAL_FIELDS = (
    "income",
    "income_source",
    "fixed_commitments",
    "emergency_months",
    "share_invested",
)

DEFAULT_AMOUNT_EUR = 10_000.0  # CALIBRACION.md §7
DEFAULT_SALARY_EUR = 1_800.0  # CALIBRACION.md §7

# CALIBRACION.md §7: salary = midpoint of the S1 range.
# Open-ended ranges (< 1.000 and > 4.000) have no midpoint.
# Decided by Producto (Álvaro, 11-nov): 800 and 5.000.
SALARY_BY_INCOME: dict[Income, float] = {
    Income.LT_1000: 800.0,
    Income.FROM_1000_TO_1800: 1_400.0,
    Income.FROM_1800_TO_2500: 2_150.0,
    Income.FROM_2500_TO_4000: 3_250.0,
    Income.GT_4000: 5_000.0,
}

# CUESTIONARIO.md §6: level by horizon, with the catalog's minimum horizons
HORIZON_LEVEL: dict[Horizon, int] = {
    Horizon.LT_2: 0,
    Horizon.FROM_2_TO_3: 1,
    Horizon.FROM_3_TO_4: 2,
    Horizon.FROM_4_TO_6: 3,
    Horizon.FROM_6_TO_7: 4,
    Horizon.GT_7: 5,
}

# Lower bound of each horizon range, in years (used as simulation horizon, conservative)
HORIZON_YEARS: dict[Horizon, int] = {
    Horizon.LT_2: 1,
    Horizon.FROM_2_TO_3: 2,
    Horizon.FROM_3_TO_4: 3,
    Horizon.FROM_4_TO_6: 4,
    Horizon.FROM_6_TO_7: 6,
    Horizon.GT_7: 7,
}

# O3 options map one-to-one to risk levels 1..5 (declared, never raises risk)
STATED_LEVEL: dict[ReturnPreference, int] = {
    ReturnPreference.R1: 1,
    ReturnPreference.R2: 2,
    ReturnPreference.R3: 3,
    ReturnPreference.R4: 4,
    ReturnPreference.R5: 5,
}


def missing_required(answers: OnboardingAnswers) -> list[str]:
    """Required fields left as "Prefiero no responder", plus consent if not given."""
    missing = [f for f in REQUIRED_FINANCIAL_FIELDS if getattr(answers, f) is None]
    if not answers.consent:
        missing.insert(0, "consent")
    return missing


def capacity_level(answers: OnboardingAnswers) -> int:
    """Capacity to bear losses (CUESTIONARIO.md §5).

    points = cushion(S6) + commitments(S5) + weight(S7) + income stability(S2), each 0-2.
    Sum 0-1 -> 1, 2-3 -> 2, 4-5 -> 3, 6-7 -> 4, 8 -> 5. Cushion < 1 month caps it at 1.
    """
    missing = missing_required(answers)
    if missing:
        raise ValueError(f"cannot compute capacity, missing: {missing}")
    cushion = {
        EmergencyMonths.LT_1: 0,
        EmergencyMonths.FROM_1_TO_3: 1,
        EmergencyMonths.FROM_3_TO_6: 1,
        EmergencyMonths.GT_6: 2,
    }[answers.emergency_months]  # type: ignore[index]
    commitments = {
        FixedCommitments.GT_50: 0,
        FixedCommitments.FROM_35_TO_50: 1,
        FixedCommitments.FROM_20_TO_35: 1,
        FixedCommitments.LT_20: 2,
    }[answers.fixed_commitments]  # type: ignore[index]
    weight = {
        ShareInvested.GT_75: 0,
        ShareInvested.FROM_50_TO_75: 1,
        ShareInvested.FROM_25_TO_50: 1,
        ShareInvested.LT_25: 2,
    }[answers.share_invested]  # type: ignore[index]
    stability = {
        IncomeSource.NONE: 0,
        IncomeSource.GRANT_OR_FAMILY: 0,
        IncomeSource.TEMPORARY: 1,
        IncomeSource.SELF_EMPLOYED: 1,
        IncomeSource.PERMANENT: 2,
        IncomeSource.PENSION: 2,
    }[answers.income_source]  # type: ignore[index]
    points = cushion + commitments + weight + stability
    level = (
        1 if points <= 1 else 2 if points <= 3 else 3 if points <= 5 else 4 if points <= 7 else 5
    )
    if answers.emergency_months == EmergencyMonths.LT_1:
        level = min(level, 1)
    return level


def horizon_level(answers: OnboardingAnswers) -> int:
    """Level by horizon (O2); goal "emergency fund" (O1) caps it at 0."""
    if answers.goal == Goal.EMERGENCY_FUND:
        return 0
    return HORIZON_LEVEL[answers.horizon]


def quiz_score(answers: OnboardingAnswers) -> int:
    """Correct answers of Q1-Q3 (0-3)."""
    return (
        int(answers.quiz_risk == QuizRisk.SINGLE_STOCK)
        + int(answers.quiz_recovery == QuizRecovery.P100)
        + int(answers.quiz_guarantee == QuizGuarantee.FALSE)
    )


def knowledge_level(answers: OnboardingAnswers) -> KnowledgeLevel:
    """bajo: 0-1 correct and no experience; alto: 3 correct and experience in funds/ETF."""
    score = quiz_score(answers)
    invested = set(answers.invested_products)
    fund_experience = bool(invested & {Product.INDEX_FUNDS_ETF, Product.MONEY_MARKET_BOND_FUNDS})
    if score <= 1 and not invested:
        return KnowledgeLevel.LOW
    if score == 3 and fund_experience:
        return KnowledgeLevel.HIGH
    return KnowledgeLevel.MEDIUM


def starting_capital(answers: OnboardingAnswers) -> float:
    """S8 amount, default 10.000 €."""
    return answers.amount_eur if answers.amount_eur is not None else DEFAULT_AMOUNT_EUR


def monthly_salary(answers: OnboardingAnswers) -> float:
    """Midpoint of the S1 income range, default 1.800 €/month."""
    return SALARY_BY_INCOME[answers.income] if answers.income is not None else DEFAULT_SALARY_EUR


def horizon_years(answers: OnboardingAnswers) -> int:
    """Simulation horizon in years: lower bound of the O2 range."""
    return HORIZON_YEARS[answers.horizon]


def stated_level(answers: OnboardingAnswers) -> int:
    """Risk level declared through O3 (only compared with the revealed one)."""
    return STATED_LEVEL[answers.return_preference]
