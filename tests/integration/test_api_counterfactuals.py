"""Revelation: the same market replayed with fixed policies through the real engine."""

from fastapi.testclient import TestClient

from api.main import app
from tests.conftest import BASE_ANSWERS

client = TestClient(app)


def _pick(actions: list[str], prefer: tuple[str, ...]) -> str:
    return next((a for a in prefer if a in actions), actions[0])


def _play(prefer: tuple[str, ...]) -> tuple[str, dict]:
    state = client.post("/games", json={"answers": BASE_ANSWERS, "seed": 11}).json()
    game_id = state["game_id"]
    assert client.get(f"/games/{game_id}/counterfactuals").status_code == 409
    while not state["finished"]:
        body = {"action": _pick(state["available_actions"], prefer), "response_time_ms": 800}
        state = client.post(f"/games/{game_id}/decision", json=body).json()
    return game_id, state


def test_holding_matches_the_hold_replay() -> None:
    game_id, state = _play(("hold", "stay_out", "invest_raise_0"))
    body = client.get(f"/games/{game_id}/counterfactuals").json()
    hold = next(a for a in body["alternatives"] if a["policy"] == "hold")
    # Playing "do nothing" by hand and replaying it must give the same money, round by round.
    assert abs(hold["final_eur"] - body["actual"]["final_eur"]) < 1e-6
    assert len(hold["wealth_path"]) == len(body["actual"]["wealth_path"]) == state["n_rounds"] + 2


def test_always_add_puts_more_money_in() -> None:
    game_id, _ = _play(("hold", "stay_out", "invest_raise_0"))
    alts = {
        a["policy"]: a
        for a in client.get(f"/games/{game_id}/counterfactuals").json()["alternatives"]
    }
    assert alts["always_add"]["contributed_eur"] > alts["hold"]["contributed_eur"]
