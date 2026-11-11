"""FastAPI entry point. Orchestration only: every number comes from behaviorlab/.

Flow for the frontend:
  GET  /catalog                       catalog snapshot
  POST /games                         onboarding answers (+ optional seed) -> GameState
  GET  /games/{id}                    current GameState
  POST /games/{id}/decision           action + response time -> next GameState
  GET  /games/{id}/scenario           full market path (only once finished, for the panel)
  GET  /games/{id}/profile            Profile          (409 until finished)
  GET  /games/{id}/proposal           PortfolioProposal (409 until finished)
  GET  /games/{id}/posterior          Posterior marginals for the panel (409 until finished)
  GET  /games                         summaries of all games, for the bank's portal
  GET  /games/{id}/counterfactuals    same market, other decisions (only once finished)
  GET  /config                        decision time limit and whether Vega's help uses Claude
  POST /assistant                     Vega's help: how the game works (never advice)
"""

import os
import secrets
import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from api.catalog import get_catalog
from api.store import GameRecord, store
from behaviorlab.game import GameError, apply_decision, new_game
from behaviorlab.game.counterfactual import POLICIES, replay
from behaviorlab.game.engine import DEFAULT_TIMEOUT_MS
from behaviorlab.pipeline import evaluate_game
from behaviorlab.text.assistant import answer as assistant_answer
from contracts import (
    Action,
    Catalog,
    GameState,
    OnboardingAnswers,
    PortfolioProposal,
    Posterior,
    Profile,
    Scenario,
)

app = FastAPI(title="BehaviorLab API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    # Local origins plus the deployed frontend, e.g. BEHAVIORLAB_CORS_ORIGINS=https://x.vercel.app
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8501",
        *[
            o.strip()
            for o in os.environ.get("BEHAVIORLAB_CORS_ORIGINS", "").split(",")
            if o.strip()
        ],
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


class NewGameRequest(BaseModel):
    answers: OnboardingAnswers
    seed: int | None = Field(default=None, ge=0, description="Omit for a random (returned) seed")


class GameSummary(BaseModel):
    """One row of the bank's portal. Only closed answers and results; no identifying data."""

    game_id: str
    created_at: str
    finished: bool
    round_index: int
    n_rounds: int
    goal: str
    horizon: str
    final_level: int | None = None
    limiting: list[str] = Field(default_factory=list)
    portfolio_name: str | None = None
    stated_level: int | None = None
    revealed_level: int | None = None
    reliability: str | None = None
    provisional_model: bool | None = None


class ReplayOut(BaseModel):
    """One path of the revelation: the player's own or a fixed policy on the same market."""

    policy: str
    wealth_path: list[float]
    final_eur: float
    contributed_eur: float


class Counterfactuals(BaseModel):
    actual: ReplayOut
    alternatives: list[ReplayOut]


class AssistantRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    screen: str = Field(default="", max_length=40)


class AssistantAnswer(BaseModel):
    answer: str
    source: str


class DecisionRequest(BaseModel):
    action: Action | None = Field(default=None, description="null = no decision (timeout)")
    response_time_ms: int = Field(ge=0)
    feeling_text: str | None = Field(default=None, max_length=500)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe used by tests and the frontend."""
    return {"status": "ok"}


@app.get("/catalog")
def catalog() -> Catalog:
    return get_catalog()


def _record(game_id: str) -> GameRecord:
    record = store.get(game_id)
    if record is None:
        raise HTTPException(status_code=404, detail="partida no encontrada")
    return record


def _results(game_id: str) -> tuple[Posterior, Profile, PortfolioProposal]:
    record = _record(game_id)
    if not record.state.finished:
        raise HTTPException(status_code=409, detail="la partida no ha terminado")
    if record.results is None:
        record.results = evaluate_game(record.state, record.answers, get_catalog())
    return record.results


@app.post("/games", status_code=201)
def create_game(req: NewGameRequest) -> GameState:
    game_id = uuid.uuid4().hex
    seed = req.seed if req.seed is not None else secrets.randbelow(2**31)
    try:
        scenario, state = new_game(game_id, req.answers, get_catalog(), seed)
    except (GameError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    store.put(game_id, GameRecord(answers=req.answers, scenario=scenario, state=state))
    return state


@app.get("/games/{game_id}")
def get_game(game_id: str) -> GameState:
    return _record(game_id).state


@app.post("/games/{game_id}/decision")
def decide(game_id: str, req: DecisionRequest) -> GameState:
    record = _record(game_id)
    try:
        record.state = apply_decision(
            record.state, record.scenario, req.action, req.response_time_ms, req.feeling_text
        )
    except GameError as exc:
        status = 409 if record.state.finished else 422
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    store.put(game_id, record)  # keep the disk copy (if enabled) in step with the state
    return record.state


@app.get("/games/{game_id}/scenario")
def get_scenario(game_id: str) -> Scenario:
    record = _record(game_id)
    if not record.state.finished:
        raise HTTPException(status_code=409, detail="la partida no ha terminado")
    return record.scenario


@app.get("/games/{game_id}/profile")
def get_profile(game_id: str) -> Profile:
    return _results(game_id)[1]


@app.get("/games/{game_id}/proposal")
def get_proposal(game_id: str) -> PortfolioProposal:
    return _results(game_id)[2]


@app.get("/games/{game_id}/posterior")
def get_posterior(game_id: str) -> Posterior:
    return _results(game_id)[0]


@app.get("/games")
def list_games() -> list[GameSummary]:
    """Bank portal: one summary per game, newest first. Results come from the /profile pipeline."""
    rows: list[GameSummary] = []
    for game_id, record in store.all():
        row = GameSummary(
            game_id=game_id,
            created_at=record.created_at,
            finished=record.state.finished,
            round_index=record.state.round_index,
            n_rounds=record.state.n_rounds,
            goal=record.answers.goal.value,
            horizon=record.answers.horizon.value,
        )
        if record.state.finished:
            _, profile, proposal = _results(game_id)
            row = row.model_copy(
                update={
                    "final_level": profile.levels.final,
                    "limiting": profile.levels.limiting,
                    "portfolio_name": proposal.portfolio_name,
                    "stated_level": profile.stated_level,
                    "revealed_level": profile.levels.revealed,
                    "reliability": profile.reliability.value,
                    "provisional_model": profile.provisional_model,
                }
            )
        rows.append(row)
    return sorted(rows, key=lambda r: r.created_at, reverse=True)


@app.get("/games/{game_id}/counterfactuals")
def counterfactuals(game_id: str) -> Counterfactuals:
    """After the game: the player path and the same market with fixed policies (engine replays)."""
    record = _record(game_id)
    state = record.state
    if not state.finished:
        raise HTTPException(status_code=409, detail="la partida no ha terminado")
    path = [state.starting_capital_eur, *(d.wealth_eur for d in state.history)]
    final = state.cash_eur + state.invested_eur
    actual = ReplayOut(
        policy="actual",
        wealth_path=[*path, final],
        final_eur=final,
        contributed_eur=state.contributed_eur,
    )
    alternatives = []
    for name in POLICIES:
        r = replay(name, record.answers, get_catalog(), state.seed)
        alternatives.append(
            ReplayOut(
                policy=r.policy,
                wealth_path=r.wealth_path,
                final_eur=r.final_eur,
                contributed_eur=r.contributed_eur,
            )
        )
    return Counterfactuals(actual=actual, alternatives=alternatives)


@app.get("/config")
def config() -> dict[str, int | bool]:
    """What the frontend needs to know about this server."""
    return {
        "decision_timeout_ms": DEFAULT_TIMEOUT_MS,
        "assistant_uses_claude": bool(os.environ.get("ANTHROPIC_API_KEY")),
    }


@app.post("/assistant")
def assistant(req: AssistantRequest) -> AssistantAnswer:
    """Vega's help desk (backend/behaviorlab/text/assistant.py). Never investment advice."""
    result = assistant_answer(req.question, req.screen)
    return AssistantAnswer(answer=result.text, source=result.source)
