"""Scenario, situations, decisions and game state (RF-01, RF-02, RF-03, D2-B, D3, C1)."""

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Phase(StrEnum):
    DROP = "drop"  # A: rounds 1-5
    SALARY = "salary"  # B: rounds 6-10
    RECOVERY = "recovery"  # C: rounds 11-15


class RoundKind(StrEnum):
    MARKET = "market"  # sell all / hold / contribute (or stay out / buy back when in cash)
    RAISE = "raise"  # invest 0 / 50 / 100 % of the salary raise


class Episode(StrEnum):
    """Drop episodes of CALIBRACION.md §4. Never shown with name or date in the UI."""

    SUSTO = "susto"
    GOTEO = "goteo"
    REBOTE = "rebote"
    CRISIS_LARGA = "crisis_larga"
    INFLACION = "inflacion"


class Action(StrEnum):
    SELL_ALL = "sell_all"
    HOLD = "hold"
    CONTRIBUTE = "contribute"  # add 10 % of the monthly salary
    STAY_OUT = "stay_out"  # in cash, keep waiting
    BUY_BACK = "buy_back"  # in cash, reinvest everything
    INVEST_RAISE_0 = "invest_raise_0"
    INVEST_RAISE_50 = "invest_raise_50"
    INVEST_RAISE_100 = "invest_raise_100"


class Situation(BaseModel):
    """What happens in one round: the market move the player has just seen."""

    model_config = ConfigDict(frozen=True)

    round_index: int = Field(ge=1)
    phase: Phase
    kind: RoundKind
    rv_return: float = Field(gt=-1, description="Monthly return of the equity index")
    rf_return: float = Field(gt=-1, description="Monthly return of the bond index")
    salary_raise_eur: float = Field(default=0, ge=0, description="Monthly raise (RAISE rounds)")


class Scenario(BaseModel):
    """Seeded synthetic market for one game. Index levels start at 1.0."""

    model_config = ConfigDict(frozen=True)

    seed: int
    episode: Episode
    rv_path: list[float] = Field(min_length=2)
    rf_path: list[float] = Field(min_length=2)
    situations: list[Situation] = Field(min_length=1)
    calibration: dict[str, float] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _consistent_lengths(self) -> "Scenario":
        n = len(self.situations)
        if len(self.rv_path) != n + 1 or len(self.rf_path) != n + 1:
            raise ValueError("paths must have one more point than situations")
        if [s.round_index for s in self.situations] != list(range(1, n + 1)):
            raise ValueError("situations must be rounds 1..n in order")
        if min(self.rv_path) <= 0 or min(self.rf_path) <= 0:
            raise ValueError("index levels must be positive")
        return self

    @property
    def n_rounds(self) -> int:
        return len(self.situations)


class Decision(BaseModel):
    """One recorded decision with the context the player saw (RF-03)."""

    model_config = ConfigDict(frozen=True)

    round_index: int = Field(ge=1)
    phase: Phase
    kind: RoundKind
    action: Action
    available_actions: list[Action]
    response_time_ms: int = Field(ge=0)
    timed_out: bool = False
    wealth_eur: float = Field(ge=0, description="cash + invested when deciding")
    invested_eur: float = Field(ge=0)
    cash_eur: float = Field(ge=0)
    salary_eur: float = Field(ge=0)
    portfolio_drawdown: float = Field(
        ge=0, le=1, description="Drawdown of the portfolio index from its peak (0.2 = -20 %)"
    )
    salary_raise_eur: float = Field(default=0, ge=0)
    feeling_text: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def _action_was_available(self) -> "Decision":
        if self.action not in self.available_actions:
            raise ValueError("action not available in this round")
        return self


class GameState(BaseModel):
    """State shown to the player before each decision."""

    model_config = ConfigDict(frozen=True)

    game_id: str
    seed: int
    portfolio_id: str
    equity_pct: float = Field(ge=0, le=100)
    n_rounds: int = Field(ge=1)
    round_index: int = Field(ge=1, description="Round to decide now (n_rounds + 1 when finished)")
    finished: bool = False
    phase: Phase | None
    kind: RoundKind | None
    available_actions: list[Action]
    starting_capital_eur: float = Field(gt=0)
    cash_eur: float = Field(ge=0)
    invested_eur: float = Field(ge=0)
    salary_eur: float = Field(gt=0)
    monthly_auto_invest_eur: float = Field(ge=0)
    contributed_eur: float = Field(ge=0, description="Money added from salary so far")
    portfolio_drawdown: float = Field(ge=0, le=1)
    last_rv_return: float | None = None
    last_rf_return: float | None = None
    last_portfolio_return: float | None = None
    salary_raise_eur: float = Field(default=0, ge=0)
    history: list[Decision] = Field(default_factory=list)

    @property
    def wealth_eur(self) -> float:
        return self.cash_eur + self.invested_eur

    @model_validator(mode="after")
    def _finished_has_no_actions(self) -> "GameState":
        if self.finished and self.available_actions:
            raise ValueError("a finished game has no available actions")
        if not self.finished and not self.available_actions:
            raise ValueError("an active game needs available actions")
        return self
