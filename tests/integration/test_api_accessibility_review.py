"""Accessible mode, human review, Vega with the player's context, and text to speech."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api.main import app
from tests.conftest import BASE_ANSWERS

client = TestClient(app)


def _hold(actions: list[str]) -> str:
    return next(a for a in ("hold", "stay_out", "invest_raise_50") if a in actions)


def _new(**extra) -> dict:
    return client.post("/games", json={"answers": BASE_ANSWERS, "seed": 5, **extra}).json()


def _finish(state: dict) -> dict:
    while not state["finished"]:
        body = {"action": _hold(state["available_actions"]), "response_time_ms": 900}
        if state["round_index"] == 1:
            body["feeling_text"] = "me llamo Ana y estoy nerviosa"
        state = client.post(f"/games/{state['game_id']}/decision", json=body).json()
    return state


def test_accessible_mode_doubles_the_time_per_decision() -> None:
    from behaviorlab.game.engine import DEFAULT_TIMEOUT_MS

    normal, accessible = _new(), _new(accessible=True)
    # Slower than the normal limit, faster than the double one.
    late_ms = int(DEFAULT_TIMEOUT_MS * 1.5)
    body = {"action": _hold(normal["available_actions"]), "response_time_ms": late_ms}
    late = client.post(f"/games/{normal['game_id']}/decision", json=body).json()
    ok = client.post(f"/games/{accessible['game_id']}/decision", json=body).json()
    assert late["history"][0]["timed_out"] is True
    assert ok["history"][0]["timed_out"] is False
    assert client.get(f"/games/{accessible['game_id']}/meta").json()["accessible"] is True


def test_new_game_can_continue_an_earlier_one() -> None:
    first = _new()
    second = _new(previous_game_id=first["game_id"])
    meta = client.get(f"/games/{second['game_id']}/meta").json()
    assert meta["previous_game_id"] == first["game_id"]
    assert (
        client.post(
            "/games", json={"answers": BASE_ANSWERS, "previous_game_id": "nope"}
        ).status_code
        == 404
    )


def test_human_review_is_recorded_and_visible_to_the_entity() -> None:
    state = _finish(_new())
    meta = client.post(f"/games/{state['game_id']}/review").json()
    assert meta["review_requested_at"]
    rows = {r["game_id"]: r for r in client.get("/games").json()}
    assert rows[state["game_id"]]["review_requested_at"] == meta["review_requested_at"]


def test_vega_uses_the_results_but_never_free_texts(monkeypatch) -> None:
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    state = _finish(_new())
    body = {"question": "¿Por qué me proponéis esta cartera?", "game_id": state["game_id"]}
    answer = client.post("/assistant", json=body).json()["answer"]
    proposal = client.get(f"/games/{state['game_id']}/proposal").json()
    assert proposal["portfolio_name"] in answer
    assert "Ana" not in answer and "nerviosa" not in answer


def test_tts_without_key_is_unavailable(monkeypatch) -> None:
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)
    assert client.post("/tts", json={"text": "Hola"}).status_code == 503
    assert client.get("/config").json()["tts_available"] is False


def test_tts_serves_the_cache(monkeypatch, tmp_path: Path) -> None:
    from behaviorlab.text.tts import cache_path

    monkeypatch.setenv("TTS_CACHE_DIR", str(tmp_path))
    monkeypatch.setenv("ELEVENLABS_VOICE_ID", "v")
    cache_path("Hola Vega", "v", "eleven_multilingual_v2").write_bytes(b"ID3fake")
    res = client.post("/tts", json={"text": "Hola   Vega"})
    assert res.status_code == 200
    assert res.content == b"ID3fake"


@pytest.mark.parametrize("n", [41])
def test_assistant_has_a_cap_per_game(monkeypatch, n: int) -> None:
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    gid = _new()["game_id"]
    codes = [
        client.post("/assistant", json={"question": "hola", "game_id": gid}).status_code
        for _ in range(n)
    ]
    assert codes[-1] == 429
