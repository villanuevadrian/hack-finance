"""Catalog snapshot contracts (C3). Filled from data/catalog/*.json, never invented."""

from datetime import date

from pydantic import BaseModel, ConfigDict, Field, model_validator


class CatalogPortfolio(BaseModel):
    """One model portfolio of the bank's catalog, as published in the snapshot."""

    model_config = ConfigDict(frozen=True, extra="ignore")

    id: str
    name: str
    equity_pct: float = Field(ge=0, le=100)
    fixed_income_pct: float = Field(ge=0, le=100)
    risk_level: int = Field(ge=0, le=5)
    profile: str
    min_horizon_years: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def _weights_sum_to_100(self) -> "CatalogPortfolio":
        if abs(self.equity_pct + self.fixed_income_pct - 100) > 1e-6:
            raise ValueError("equity_pct + fixed_income_pct must be 100")
        return self

    @property
    def equity_weight(self) -> float:
        """w_RV = equity_pct / 100."""
        return self.equity_pct / 100


class Catalog(BaseModel):
    """Dated snapshot of the catalog with its source (CLAUDE.md, principle 7)."""

    model_config = ConfigDict(frozen=True, extra="ignore")

    snapshot_date: date
    source: str = Field(min_length=1)
    portfolios: list[CatalogPortfolio] = Field(min_length=1, max_length=6)

    @model_validator(mode="after")
    def _unique_ids_and_levels(self) -> "Catalog":
        ids = [p.id for p in self.portfolios]
        levels = [p.risk_level for p in self.portfolios]
        if len(set(ids)) != len(ids):
            raise ValueError("portfolio ids must be unique")
        if len(set(levels)) != len(levels):
            raise ValueError("risk levels must be unique")
        return self

    def by_id(self, portfolio_id: str) -> CatalogPortfolio:
        for p in self.portfolios:
            if p.id == portfolio_id:
                return p
        raise KeyError(portfolio_id)

    def by_level(self, level: int) -> CatalogPortfolio:
        """Portfolio with the highest risk level that does not exceed `level`."""
        eligible = [p for p in self.portfolios if p.risk_level <= level]
        if not eligible:
            raise KeyError(f"no portfolio with risk level <= {level}")
        return max(eligible, key=lambda p: p.risk_level)
