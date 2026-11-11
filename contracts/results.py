"""Posterior, Profile and PortfolioProposal: what the bank receives (RF-04, RF-06, D5, D6)."""

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, model_validator

DISCLAIMER = (
    "Evaluación de idoneidad en formato de juego. No es asesoramiento financiero. "
    "Los escenarios son simulados y las rentabilidades pasadas no garantizan "
    "rentabilidades futuras."
)


class ParameterEstimate(BaseModel):
    """Posterior summary of one parameter: mean and 90 % credible interval."""

    model_config = ConfigDict(frozen=True)

    name: str
    mean: float
    ci_low: float
    ci_high: float
    description: str = ""

    @model_validator(mode="after")
    def _interval_contains_mean(self) -> "ParameterEstimate":
        if not self.ci_low <= self.mean <= self.ci_high:
            raise ValueError("ci_low <= mean <= ci_high")
        return self


class Posterior(BaseModel):
    """Grid posterior over (lambda, theta, eta) summarised by marginals."""

    model_config = ConfigDict(frozen=True)

    grid: dict[str, list[float]]
    marginals: dict[str, list[float]]
    summary: list[ParameterEstimate]
    n_decisions: int = Field(ge=0)
    provisional: bool = Field(
        default=False, description="True only if a non-production model produced it"
    )

    @model_validator(mode="after")
    def _marginals_are_distributions(self) -> "Posterior":
        if set(self.grid) != set(self.marginals):
            raise ValueError("grid and marginals must have the same parameters")
        for name, weights in self.marginals.items():
            if len(weights) != len(self.grid[name]):
                raise ValueError(f"marginal of {name} has wrong length")
            if min(weights) < 0 or abs(sum(weights) - 1) > 1e-6:
                raise ValueError(f"marginal of {name} must be non-negative and sum to 1")
        return self


class Reliability(StrEnum):
    HIGH = "alta"
    MEDIUM = "media"
    LOW = "baja"


class KnowledgeLevel(StrEnum):
    LOW = "bajo"
    MEDIUM = "medio"
    HIGH = "alto"


class SuitabilityLevels(BaseModel):
    """D6: final = min(revealed, capacity, horizon). Stated answers never raise risk."""

    model_config = ConfigDict(frozen=True)

    revealed: int = Field(ge=0, le=5)
    capacity: int = Field(ge=0, le=5)
    horizon: int = Field(ge=0, le=5)
    final: int = Field(ge=0, le=5)
    limiting: list[str] = Field(min_length=1)

    @model_validator(mode="after")
    def _final_is_minimum(self) -> "SuitabilityLevels":
        values = {"revealed": self.revealed, "capacity": self.capacity, "horizon": self.horizon}
        if self.final != min(values.values()):
            raise ValueError("final must be min(revealed, capacity, horizon)")
        if set(self.limiting) != {k for k, v in values.items() if v == self.final}:
            raise ValueError("limiting must list the levels equal to final")
        return self


class Profile(BaseModel):
    """Behavioural profile with uncertainty (principle 5: no value without its interval)."""

    model_config = ConfigDict(frozen=True)

    game_id: str
    parameters: list[ParameterEstimate]
    n_rounds: int = Field(ge=0)
    reliability: Reliability
    knowledge_level: KnowledgeLevel
    levels: SuitabilityLevels
    stated_reaction: str
    stated_level: int = Field(ge=0, le=5, description="Risk level implied by O3 (declared)")
    timeouts: int = Field(ge=0)
    provisional_model: bool = False


class CandidateMetrics(BaseModel):
    """Simulated outcome of the estimated behaviour on one catalog portfolio."""

    model_config = ConfigDict(frozen=True)

    portfolio_id: str
    name: str
    risk_level: int = Field(ge=0, le=5)
    eligible: bool = Field(description="risk_level <= min(capacity, horizon)")
    p_panic: float = Field(ge=0, le=1)
    final_multiple_p10: float = Field(ge=0)
    final_multiple_p50: float = Field(ge=0)
    final_multiple_p90: float = Field(ge=0)


class PortfolioProposal(BaseModel):
    """D5: max P10 of final wealth subject to P(panic sale) <= threshold."""

    model_config = ConfigDict(frozen=True)

    game_id: str
    portfolio_id: str
    portfolio_name: str
    risk_level: int = Field(ge=0, le=5)
    levels: SuitabilityLevels
    candidates: list[CandidateMetrics] = Field(min_length=1)
    max_panic_prob: float = Field(gt=0, le=1)
    horizon_years: int = Field(ge=1)
    n_paths: int = Field(ge=1)
    seed: int
    amount_eur: float = Field(gt=0)
    justification: str
    disclaimer: str = DISCLAIMER
