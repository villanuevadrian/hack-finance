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
"""

import secrets
import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from api.catalog import get_catalog
from api.store import GameRecord, store
from behaviorlab.game import GameError, apply_decision, new_game
from behaviorlab.pipeline import evaluate_game
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
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8501"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class NewGameRequest(BaseModel):
    answers: OnboardingAnswers
    seed: int | None = Field(default=None, ge=0, description="Omit for a random (returned) seed")


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
