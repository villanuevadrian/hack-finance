"""Vega's help desk and the server config."""

from fastapi.testclient import TestClient

from api.main import app
from behaviorlab.text.assistant import FALLBACK, faq_answer

client = TestClient(app)


def test_config_exposes_time_limit() -> None:
    body = client.get("/config").json()
    assert body["decision_timeout_ms"] >= 1000


def test_faq_never_gives_advice() -> None:
    text = faq_answer("¿Qué cartera me recomiendas comprar?")
    assert "No puedo decirte qué hacer" in text


def test_faq_answers_without_network(monkeypatch) -> None:
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    body = client.post(
        "/assistant", json={"question": "¿Qué es un fondo indexado?", "screen": "intro"}
    ).json()
    assert body["source"] == "faq"
    assert "indexado" in body["answer"]


def test_unknown_question_gets_safe_fallback() -> None:
    assert faq_answer("zzz") == FALLBACK
