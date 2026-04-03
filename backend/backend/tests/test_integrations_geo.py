"""Integrations health + Nominatim proxy (mocked HTTP)."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False)


def test_integrations_health_summary(client: TestClient) -> None:
    r = client.get("/api/v1/integrations/health/summary")
    assert r.status_code == 200
    body = r.json()
    assert "meilisearch" in body
    assert "n8n" in body
    assert "temporal" in body


def test_nominatim_search_uses_cache_and_http(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[int] = []

    class _Resp:
        status_code = 200

        def raise_for_status(self) -> None:
            return None

        def json(self) -> list[dict]:
            calls.append(1)
            return [{"display_name": "Test Place", "lat": "35.7", "lon": "51.4"}]

    monkeypatch.setattr("app.api.v1.geo_routes.httpx.get", lambda *a, **k: _Resp())
    r1 = client.get("/api/v1/geo/nominatim/search", params={"q": "تهران"})
    assert r1.status_code == 200
    assert r1.json()[0]["display_name"] == "Test Place"
    r2 = client.get("/api/v1/geo/nominatim/search", params={"q": "تهران"})
    assert r2.status_code == 200
    assert len(calls) == 1
