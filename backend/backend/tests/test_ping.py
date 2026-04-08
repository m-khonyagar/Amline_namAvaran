from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


def test_ping_status_code():
    with TestClient(app) as client:
        r = client.get("/api/v1/health")
    assert r.status_code == 200


def test_ping_response_body():
    with TestClient(app) as client:
        r = client.get("/api/v1/health")
    assert r.json() == {"status": "ok"}


def test_ping_content_type():
    with TestClient(app) as client:
        r = client.get("/api/v1/health")
    assert "application/json" in r.headers["content-type"]
