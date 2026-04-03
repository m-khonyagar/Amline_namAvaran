"""Integration: payment callbacks + ledger (mock + zarinpal HTML with mocked verify)."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

HDR = {"X-User-Permissions": "*"}


@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False)


def test_mock_callback_get_completes_and_credits_wallet(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AMLINE_PSP_PROVIDER", "mock")
    uid = "user-psp-cb-mock"
    pi = client.post(
        "/api/v1/payments/intents",
        json={"user_id": uid, "amount_cents": 2000, "idempotency_key": "psp-cb-mock-1"},
        headers=HDR,
    )
    assert pi.status_code == 201
    intent_id = pi.json()["id"]
    assert pi.json()["psp_provider"] == "mock"
    r = client.get(f"/api/v1/payments/callback/mock?intent={intent_id}&ok=1")
    assert r.status_code == 200
    bal = client.get(f"/api/v1/wallets/{uid}/balance", headers=HDR)
    assert bal.json()["balance_cents"] == 2000


def test_zarinpal_callback_html_success(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AMLINE_PSP_PROVIDER", "zarinpal")
    monkeypatch.setenv("ZARINPAL_MERCHANT_ID", "m1")
    uid = "user-psp-cb-zp"
    with patch("app.adapters.psp.zarinpal.httpx.post") as mock_post:
        mock_post.return_value.raise_for_status = MagicMock()

        def side_effect(url: str, **kwargs: object) -> MagicMock:
            m = MagicMock()
            m.raise_for_status = MagicMock()
            if "PaymentRequest" in url:
                m.json.return_value = {"Status": 100, "Authority": "ZP-AUTH-TEST"}
            else:
                m.json.return_value = {"Status": 100, "RefID": 424242}
            return m

        mock_post.side_effect = side_effect
        pi = client.post(
            "/api/v1/payments/intents",
            json={"user_id": uid, "amount_cents": 3000, "idempotency_key": "psp-cb-zp-1"},
            headers=HDR,
        )
    assert pi.status_code == 201
    assert pi.json()["psp_provider"] == "zarinpal"
    with patch("app.adapters.psp.zarinpal.httpx.post") as mock_verify:
        mock_verify.return_value.raise_for_status = MagicMock()
        mock_verify.return_value.json.return_value = {"Status": 100, "RefID": 424242}
        r = client.get(
            "/api/v1/payments/callback/zarinpal",
            params={"Authority": "ZP-AUTH-TEST", "Status": "OK"},
        )
    assert r.status_code == 200
    assert "موفق" in r.text
    bal = client.get(f"/api/v1/wallets/{uid}/balance", headers=HDR)
    assert bal.json()["balance_cents"] == 3000


def test_list_and_retry_endpoints_exist(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AMLINE_PSP_PROVIDER", "mock")
    client.post(
        "/api/v1/payments/intents",
        json={"user_id": "u-x", "amount_cents": 100, "idempotency_key": "list-psp-1"},
        headers=HDR,
    )
    lst = client.get("/api/v1/payments/intents", headers=HDR)
    assert lst.status_code == 200
    assert lst.json()["total"] >= 1
