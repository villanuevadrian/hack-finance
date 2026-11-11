"""Bank portal list (GET /games) and disk persistence of the game store."""

from pathlib import Path

from fastapi.testclient import TestClient

from api.main import app
from api.main import store as live_store
from api.store import FileBackend, GameStore
from tests.conftest import BASE_ANSWERS

client = TestClient(app)


def _hold(actions: list[str]) -> str:
    return next(a for a in ("hold", "stay_out", "invest_raise_50") if a in actions)


def _play() -> str:
    state = client.post("/games", json={"answers": BASE_ANSWERS, "seed": 3}).json()
    game_id = state["game_id"]
    while not state["finished"]:
        body = {"action": _hold(state["available_actions"]), "response_time_ms": 900}
        state = client.post(f"/games/{game_id}/decision", json=body).json()
    return game_id


def test_list_games_has_summary_of_finished_game() -> None:
    game_id = _play()
    rows = {r["game_id"]: r for r in client.get("/games").json()}
    row = rows[game_id]
    assert row["finished"] is True
    assert row["portfolio_name"]
    profile = client.get(f"/games/{game_id}/profile").json()
    assert row["final_level"] == profile["levels"]["final"]
    assert row["revealed_level"] == profile["levels"]["revealed"]


def test_store_survives_restart(tmp_path: Path) -> None:
    game_id = _play()
    record = live_store.get(game_id)
    assert record is not None
    GameStore(backend=FileBackend(tmp_path)).put(game_id, record)
    reloaded = GameStore(backend=FileBackend(tmp_path)).get(game_id)
    assert reloaded is not None
    assert reloaded.state == record.state
    assert reloaded.answers == record.answers
    assert reloaded.scenario == record.scenario
