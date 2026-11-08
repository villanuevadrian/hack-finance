"""FastAPI entry point. Orchestration only: no calculations here.

The game endpoints (POST /games, POST /games/{id}/decision, GET /games/{id},
GET /games/{id}/profile, GET /games/{id}/proposal) are added once the contracts
are frozen. For now only a health check exists so `make run-api` works.
"""

from fastapi import FastAPI

app = FastAPI(title="BehaviorLab API", version="0.0.1")


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe used by tests and the frontend."""
    return {"status": "ok"}
