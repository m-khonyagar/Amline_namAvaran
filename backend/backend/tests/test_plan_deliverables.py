"""Tests for plan deliverables: Meilisearch stats, S3 media gate, PostHog PII strip."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.posthog_properties import sanitize_posthog_properties
from app.main import app

HDR = {"X-User-Permissions": "*", "X-User-Id": "plan-test"}


@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False)


def test_meilisearch_stats_when_unconfigured(client: TestClient) -> None:
    r = client.get("/api/v1/integrations/meilisearch/stats", headers=HDR)
    assert r.status_code == 200
    body = r.json()
    assert body.get("ok") is False


def test_media_upload_without_s3_returns_503(client: TestClient) -> None:
    r = client.post(
        "/api/v1/media/listing-image",
        files={"file": ("x.jpg", b"\xff\xd8\xff", "image/jpeg")},
        headers=HDR,
    )
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "INTEGRATION_NOT_CONFIGURED"


def test_sanitize_posthog_properties_redacts_when_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AMLINE_POSTHOG_STRIP_PII", "1")
    out = sanitize_posthog_properties({"email": "a@b.com", "lead_id": "x", "mobile": "0912"})
    assert out["email"] == "[redacted]"
    assert out["mobile"] == "[redacted]"
    assert out["lead_id"] == "x"


def test_sanitize_posthog_noop_when_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AMLINE_POSTHOG_STRIP_PII", raising=False)
    p = {"email": "a@b.com"}
    assert sanitize_posthog_properties(p)["email"] == "a@b.com"


def test_health_summary_includes_s3_media(client: TestClient) -> None:
    r = client.get("/api/v1/integrations/health/summary")
    assert r.status_code == 200
    assert "s3_media" in r.json()
