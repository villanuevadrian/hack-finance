"""Shared contracts between modules. Source of truth: change only via PR + team notice."""

from contracts.catalog import Catalog, CatalogPortfolio
from contracts.game import (
    Action,
    Decision,
    Episode,
    GameState,
    Phase,
    RoundKind,
    Scenario,
    Situation,
)
from contracts.onboarding import OnboardingAnswers
from contracts.results import (
    DISCLAIMER,
    CandidateMetrics,
    KnowledgeLevel,
    ParameterEstimate,
    PortfolioProposal,
    Posterior,
    Profile,
    Reliability,
    SuitabilityLevels,
)

__all__ = [
    "DISCLAIMER",
    "Action",
    "CandidateMetrics",
    "Catalog",
    "CatalogPortfolio",
    "Decision",
    "Episode",
    "GameState",
    "KnowledgeLevel",
    "OnboardingAnswers",
    "ParameterEstimate",
    "Phase",
    "PortfolioProposal",
    "Posterior",
    "Profile",
    "Reliability",
    "RoundKind",
    "Scenario",
    "Situation",
    "SuitabilityLevels",
]
