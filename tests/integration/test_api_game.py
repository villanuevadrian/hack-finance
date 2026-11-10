"""Full game through the API: onboarding -> 15 decisions -> profile + proposal."""

from fastapi.testclient import TestClient

from api.main import app
from tests.conftest import BASE_ANSWERS

client = TestClient(app)


def _new_game(**overrides: object) -> dict:
    resp = client.post("/games", json={"answers": {**BASE_ANSWERS, **overrides}, "seed": 21})
    assert resp.status_code == 201, resp.text
    return resp.json()


def _hold(actions: list[str]) -> str:
    return next(a for a in ("hold", "stay_out", "invest_raise_50") if a in actions)


def test_catalog_endpoint() -> None:
    body = client.get("/catalog").json()
    assert len(body["portfolios"]) == 6 and body["source"]


def test_full_game_flow() -> None:
    state = _new_game()
    game_id = state["game_id"]
    assert client.get(f"/games/{game_id}/profile").status_code == 409
    assert client.get(f"/games/{game_id}/scenario").status_code == 409
    while not state["finished"]:
        action = "sell_all" if state["portfolio_drawdown"] > 0.12 else None
        action = (
            action if action in state["available_actions"] else _hold(state["available_actions"])
        )
        resp = client.post(
            f"/games/{game_id}/decision", json={"action": action, "response_time_ms": 1500}
        )
        assert resp.status_code == 200, resp.text
        state = resp.json()
    assert len(state["history"]) == 15

    profile = client.get(f"/games/{game_id}/profile").json()
    assert {p["name"] for p in profile["parameters"]} == {"lambda", "theta", "eta"}
    for p in profile["parameters"]:
        assert p["ci_low"] <= p["mean"] <= p["ci_high"]
    proposal = client.get(f"/games/{game_id}/proposal").json()
    assert proposal["risk_level"] <= proposal["levels"]["final"]
    assert len(proposal["candidates"]) == 6
    assert "No es asesoramiento" in proposal["disclaimer"]
    assert client.get(f"/games/{game_id}/scenario").status_code == 200
    assert client.get(f"/games/{game_id}/posterior").status_code == 200
    again = client.post(
        f"/games/{game_id}/decision", json={"action": "hold", "response_time_ms": 1}
    )
    assert again.status_code == 409


def test_same_seed_same_result() -> None:
    a, b = _new_game(), _new_game()
    assert a["invested_eur"] == b["invested_eur"] and a["game_id"] != b["game_id"]


def test_unavailable_action_is_rejected() -> None:
    state = _new_game()
    resp = client.post(
        f"/games/{state['game_id']}/decision", json={"action": "buy_back", "response_time_ms": 10}
    )
    assert resp.status_code == 422


def test_missing_required_answer_is_rejected() -> None:
    resp = client.post("/games", json={"answers": {**BASE_ANSWERS, "income_source": None}})
    assert resp.status_code == 422
    assert "income_source" in resp.json()["detail"]


def test_unknown_game() -> None:
    assert client.get("/games/nope").status_code == 404
