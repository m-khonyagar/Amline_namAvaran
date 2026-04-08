"""Post-launch surface: beta, onboarding, support, billing, ops, PSP factory, ML registry."""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("AMLINE_OTP_DEBUG", "1")

from app.adapters.psp.factory import get_psp_adapter
from app.main import app

HDR = {"X-User-Permissions": "*", "X-User-Id": "launch-tester"}


@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False)


def test_beta_invite_accept_flow(client: TestClient) -> None:
    r = client.post(
        "/api/v1/admin/beta/invitations",
        json={"email": "beta@example.com", "ttl_days": 7},
        headers=HDR,
    )
    assert r.status_code == 201
    token = r.json().get("token")
    assert token
    r2 = client.post(
        "/api/v1/beta/accept",
        json={"token": token, "user_id": "u-beta-1"},
    )
    assert r2.status_code == 204


def test_onboarding_support_billing_gamification(client: TestClient) -> None:
    r = client.post(
        "/api/v1/onboarding/events",
        json={"step": "profile_done", "metadata": {"k": "v"}},
        headers=HDR,
    )
    assert r.status_code == 201
    uid = HDR["X-User-Id"]
    r2 = client.get(f"/api/v1/onboarding/status/{uid}", headers=HDR)
    assert r2.status_code == 200
    assert "profile_done" in r2.json()["steps"]

    r3 = client.post(
        "/api/v1/support/tickets",
        json={"subject": "Cannot login", "body": "details here", "priority": "HIGH"},
        headers=HDR,
    )
    assert r3.status_code == 201
    tid = r3.json()["id"]

    r4 = client.get(f"/api/v1/support/tickets/{tid}/messages", headers=HDR)
    assert r4.status_code == 200
    assert len(r4.json()) >= 1

    r5 = client.get("/api/v1/billing/plans", headers=HDR)
    assert r5.status_code == 200
    assert len(r5.json()) >= 1

    r6 = client.post(
        "/api/v1/billing/subscribe",
        json={"plan_code": "starter"},
        headers=HDR,
    )
    assert r6.status_code == 201

    r7 = client.get("/api/v1/gamification/me", headers=HDR)
    assert r7.status_code == 200
    assert r7.json()["user_id"] == uid


def test_dashboard_recommendations_ops(client: TestClient) -> None:
    r = client.get("/api/v1/dashboard/agent-kpis", headers=HDR)
    assert r.status_code == 200
    body = r.json()
    assert "visits_total" in body

    r2 = client.get("/api/v1/recommendations/listings?limit=3", headers=HDR)
    assert r2.status_code == 200

    r3 = client.post(
        "/api/v1/ops/client-errors",
        json={"message": "TypeError: x is undefined", "url": "/crm"},
    )
    assert r3.status_code == 201

    r4 = client.get("/api/v1/ops/alerting/status")
    assert r4.status_code == 200


def test_i18n_bundle_and_ml_status(client: TestClient) -> None:
    r = client.get("/api/v1/i18n/bundle?locale=en")
    assert r.status_code == 200
    assert r.json()["locale"] == "en"

    r2 = client.get("/api/v1/ai/ml/status")
    assert r2.status_code == 200
    assert r2.json()["matching_backend"]


def test_psp_factory_mock_default(monkeypatch: pytest.MonkeyPatch) -> None:
    from unittest.mock import MagicMock

    from app.models.payment import PaymentIntent, PaymentIntentStatus

    monkeypatch.delenv("AMLINE_PSP_PROVIDER", raising=False)
    ad = get_psp_adapter()
    repo = MagicMock()
    intent = PaymentIntent(
        id="abc",
        user_id="u",
        amount_cents=1000,
        currency="IRR",
        idempotency_key="idem-psp-mock",
        status=PaymentIntentStatus.PENDING,
    )
    url = ad.initiate_checkout(repo, intent, "https://cb/c")
    assert "mock-psp" in url or "example" in url


def test_psp_factory_zarinpal(monkeypatch: pytest.MonkeyPatch) -> None:
    from unittest.mock import MagicMock, patch

    from app.models.payment import PaymentIntent, PaymentIntentStatus

    monkeypatch.setenv("AMLINE_PSP_PROVIDER", "zarinpal")
    monkeypatch.setenv("ZARINPAL_MERCHANT_ID", "test-merchant")
    ad = get_psp_adapter()
    repo = MagicMock()
    intent = PaymentIntent(
        id="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        user_id="u",
        amount_cents=500,
        currency="IRR",
        idempotency_key="idem-psp-zp",
        status=PaymentIntentStatus.PENDING,
    )
    with patch("app.adapters.psp.zarinpal.httpx.post") as mock_post:
        mock_post.return_value.raise_for_status = MagicMock()
        mock_post.return_value.json.return_value = {"Status": 100, "Authority": "A" * 36}
        url = ad.initiate_checkout(repo, intent, "https://cb/z")
    assert "zarinpal" in url.lower() or "sandbox" in url.lower()
    monkeypatch.delenv("AMLINE_PSP_PROVIDER", raising=False)
    monkeypatch.delenv("ZARINPAL_MERCHANT_ID", raising=False)
