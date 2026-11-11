"""PostgreSQL store: a game survives a new process. Runs only with TEST_DATABASE_URL set."""

import os

import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.main import store as live_store
from api.store import GameStore, PostgresBackend
from tests.conftest import BASE_ANSWERS

URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not URL, reason="TEST_DATABASE_URL not set")


def test_game_survives_in_postgres() -> None:
    client = TestClient(app)
    state = client.post("/games", json={"answers": BASE_ANSWERS, "seed": 5}).json()
    game_id = state["game_id"]
    body = {"action": state["available_actions"][0], "response_time_ms": 900}
    client.post(f"/games/{game_id}/decision", json=body)
    record = live_store.get(game_id)
    assert record is not None

    GameStore(backend=PostgresBackend(URL)).put(game_id, record)
    # A brand new store (as after a restart of the API) reads it back from the database.
    reloaded = GameStore(backend=PostgresBackend(URL)).get(game_id)
    assert reloaded is not None
    assert reloaded.state == record.state
    assert reloaded.answers == record.answers
    assert len(reloaded.state.history) == 1
