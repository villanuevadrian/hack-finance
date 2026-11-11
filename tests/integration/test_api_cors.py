"""CORS: any local port is allowed (the web port is configurable); foreign origins are not."""

import pytest
from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)


def _preflight(origin: str) -> str | None:
    resp = client.options(
        "/config", headers={"Origin": origin, "Access-Control-Request-Method": "GET"}
    )
    return resp.headers.get("access-control-allow-origin")


@pytest.mark.parametrize(
    "origin", ["http://localhost:5280", "http://127.0.0.1:5290", "http://localhost:5173"]
)
def test_local_ports_allowed(origin: str) -> None:
    assert _preflight(origin) == origin


@pytest.mark.parametrize("origin", ["https://evil.example", "http://localhost.evil.example:5280"])
def test_foreign_origins_rejected(origin: str) -> None:
    assert _preflight(origin) is None
