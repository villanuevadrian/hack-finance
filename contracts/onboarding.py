"""Onboarding answers ("Crea tu yo inversor", D11). Questions and options: docs/CUESTIONARIO.md.

Every answer is a closed option. Financial-situation answers accept None
("Prefiero no responder"); quiz answers accept DONT_KNOW.
"""

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class Education(StrEnum):  # K1
    COMPULSORY = "compulsory"
    SECONDARY = "secondary"
    UNIVERSITY = "university"
    FINANCE_DEGREE = "finance_degree"


class Occupation(StrEnum):  # K2
    STUDENT = "student"
    EMPLOYEE = "employee"
    SELF_EMPLOYED = "self_employed"
    FINANCE_PROFESSIONAL = "finance_professional"
    UNEMPLOYED = "unemployed"
    RETIRED = "retired"


class Product(StrEnum):  # K3, K4
    DEPOSITS = "deposits"
    MONEY_MARKET_BOND_FUNDS = "money_market_bond_funds"
    INDEX_FUNDS_ETF = "index_funds_etf"
    STOCKS = "stocks"
    ROBO_ADVISOR = "robo_advisor"
    DERIVATIVES_CRYPTO = "derivatives_crypto"


class TradingFrequency(StrEnum):  # K5
    NEVER = "never"
    YEARLY = "yearly"
    SEVERAL_PER_YEAR = "several_per_year"
    MONTHLY = "monthly"


class InvestedVolume(StrEnum):  # K6
    NONE = "none"
    LT_3K = "lt_3k"
    FROM_3K_TO_15K = "3k_15k"
    GT_15K = "gt_15k"


class QuizRisk(StrEnum):  # Q1 (correct: SINGLE_STOCK)
    DIVERSIFIED_FUND = "diversified_fund"
    SINGLE_STOCK = "single_stock"
    SAME = "same"
    DONT_KNOW = "dont_know"


class QuizRecovery(StrEnum):  # Q2 (correct: P100)
    P25 = "p25"
    P50 = "p50"
    P100 = "p100"
    DONT_KNOW = "dont_know"


class QuizGuarantee(StrEnum):  # Q3 (correct: FALSE)
    TRUE = "true"
    FALSE = "false"
    DONT_KNOW = "dont_know"


class Income(StrEnum):  # S1, net monthly
    LT_1000 = "lt_1000"
    FROM_1000_TO_1800 = "1000_1800"
    FROM_1800_TO_2500 = "1800_2500"
    FROM_2500_TO_4000 = "2500_4000"
    GT_4000 = "gt_4000"


class IncomeSource(StrEnum):  # S2
    PERMANENT = "permanent"
    TEMPORARY = "temporary"
    SELF_EMPLOYED = "self_employed"
    GRANT_OR_FAMILY = "grant_or_family"
    PENSION = "pension"
    NONE = "none"


class MonthlySaving(StrEnum):  # S3
    ZERO = "zero"
    LT_100 = "lt_100"
    FROM_100_TO_300 = "100_300"
    FROM_300_TO_600 = "300_600"
    GT_600 = "gt_600"


class FinancialWealth(StrEnum):  # S4
    LT_5K = "lt_5k"
    FROM_5K_TO_20K = "5k_20k"
    FROM_20K_TO_50K = "20k_50k"
    FROM_50K_TO_150K = "50k_150k"
    GT_150K = "gt_150k"


class FixedCommitments(StrEnum):  # S5, share of income
    LT_20 = "lt_20"
    FROM_20_TO_35 = "20_35"
    FROM_35_TO_50 = "35_50"
    GT_50 = "gt_50"


class EmergencyMonths(StrEnum):  # S6
    LT_1 = "lt_1"
    FROM_1_TO_3 = "1_3"
    FROM_3_TO_6 = "3_6"
    GT_6 = "gt_6"


class ShareInvested(StrEnum):  # S7, share of financial wealth
    LT_25 = "lt_25"
    FROM_25_TO_50 = "25_50"
    FROM_50_TO_75 = "50_75"
    GT_75 = "gt_75"


class Goal(StrEnum):  # O1
    EMERGENCY_FUND = "emergency_fund"
    PURCHASE = "purchase"
    LONG_TERM_GROWTH = "long_term_growth"
    RETIREMENT = "retirement"


class Horizon(StrEnum):  # O2
    LT_2 = "lt_2"
    FROM_2_TO_3 = "2_3"
    FROM_3_TO_4 = "3_4"
    FROM_4_TO_6 = "4_6"
    FROM_6_TO_7 = "6_7"
    GT_7 = "gt_7"


class ReturnPreference(StrEnum):  # O3: (bad year, good year)
    R1 = "minus2_plus2"
    R2 = "minus8_plus4"
    R3 = "minus15_plus6"
    R4 = "minus25_plus8"
    R5 = "minus35_plus10"


class StatedReaction(StrEnum):  # O4: declared reaction to a 20 % drop
    SELL_ALL = "sell_all"
    SELL_PART = "sell_part"
    WAIT = "wait"
    BUY_MORE = "buy_more"


class OnboardingAnswers(BaseModel):
    """Closed answers of the suitability questionnaire. No identifying data."""

    model_config = ConfigDict(frozen=True)

    consent: bool = Field(description="Paso 0: consentimiento (RGPD art. 22). Debe ser True.")
    education: Education
    occupation: Occupation
    known_products: list[Product] = Field(default_factory=list)
    invested_products: list[Product] = Field(default_factory=list)
    trading_frequency: TradingFrequency
    invested_volume: InvestedVolume
    quiz_risk: QuizRisk
    quiz_recovery: QuizRecovery
    quiz_guarantee: QuizGuarantee
    income: Income | None
    income_source: IncomeSource | None
    monthly_saving: MonthlySaving | None
    financial_wealth: FinancialWealth | None
    fixed_commitments: FixedCommitments | None
    emergency_months: EmergencyMonths | None
    share_invested: ShareInvested | None
    amount_eur: float | None = Field(default=None, gt=0, description="S8: capital de la partida")
    goal: Goal
    horizon: Horizon
    return_preference: ReturnPreference
    stated_reaction: StatedReaction
