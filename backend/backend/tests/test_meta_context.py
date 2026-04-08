"""Meta context for agency UI."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False)


def test_meta_context_default_agencies(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AMLINE_AGENCIES_JSON", raising=False)
    r = client.get("/api/v1/meta/context")
    assert r.status_code == 200
    body = r.json()
    assert "agency_scope_enabled" in body
    assert isinstance(body["agencies"], list)
    assert body["agencies"]


def test_meta_context_custom_json(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(
        "AMLINE_AGENCIES_JSON",
        '[{"id":"ag1","name_fa":"یک"}]',
    )
    r = client.get("/api/v1/meta/context")
    assert r.status_code == 200
    assert r.json()["agencies"][0]["id"] == "ag1"
