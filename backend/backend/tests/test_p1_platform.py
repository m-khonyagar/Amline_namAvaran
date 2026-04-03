"""P1 platform modules — CRM DB, visits, wallet, payments, legal, registry, geo, RBAC."""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("AMLINE_OTP_DEBUG", "1")

from app.main import app  # noqa: E402

HDR = {"X-User-Permissions": "*"}


@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False)


def test_geo_provinces_and_cities(client: TestClient) -> None:
    r = client.get("/api/v1/geo/provinces")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert any(p.get("id") == "08" for p in data)
    r2 = client.get("/api/v1/geo/provinces/08/cities")
    assert r2.status_code == 200
    assert len(r2.json()) >= 1


def test_legacy_provinces_misc(client: TestClient) -> None:
    r = client.get("/api/v1/provinces")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_crm_v1_lead_visit_flow(client: TestClient) -> None:
    cities = client.get("/api/v1/geo/provinces/08/cities", headers=HDR).json()
    assert isinstance(cities, list) and len(cities) >= 1
    city_id = cities[0]["id"]
    r = client.post(
        "/api/v1/crm/leads",
        json={
            "source": "MANUAL",
            "full_name": "تست P1",
            "mobile": "09129998877",
            "need_type": "RENT",
            "province_id": "08",
            "city_id": city_id,
        },
        headers=HDR,
    )
    assert r.status_code == 201
    body = r.json()
    lead_id = body["id"]
    assert body.get("province_id") == "08"
    assert body.get("city_id") == city_id
    assert body.get("province_name_fa")
    assert body.get("city_name_fa")
    r2 = client.get(f"/api/v1/crm/leads/{lead_id}", headers=HDR)
    assert r2.status_code == 200
    r3 = client.post(
        "/api/v1/crm/leads/{}/activities".format(lead_id),
        json={"type": "NOTE", "note": "first touch"},
        headers=HDR,
    )
    assert r3.status_code == 201
    v = client.post(
        "/api/v1/visits",
        json={"crm_lead_id": lead_id, "scheduled_at": "2026-05-01T10:00:00+00:00"},
        headers=HDR,
    )
    assert v.status_code == 201
    vid = v.json()["id"]
    oc = client.post(
        "/api/v1/visits/{}/outcome".format(vid),
        json={"outcome": "INTERESTED", "outcome_notes": "ok"},
        headers=HDR,
    )
    assert oc.status_code == 200
    assert oc.json()["status"] == "COMPLETED"


def test_wallet_and_payment_callback(client: TestClient) -> None:
    uid = "user-wallet-p1"
    b = client.get(f"/api/v1/wallets/{uid}/balance", headers=HDR)
    assert b.status_code == 200
    assert b.json()["balance_cents"] == 0
    client.post(
        f"/api/v1/wallets/{uid}/ledger",
        json={
            "amount_cents": 5000,
            "entry_type": "CREDIT",
            "reference_type": "test",
            "idempotency_key": "seed-1",
        },
        headers=HDR,
    )
    b2 = client.get(f"/api/v1/wallets/{uid}/balance", headers=HDR)
    assert b2.json()["balance_cents"] == 5000
    pi = client.post(
        "/api/v1/payments/intents",
        json={
            "user_id": uid,
            "amount_cents": 1000,
            "idempotency_key": "pay-intent-p1-unique",
        },
        headers=HDR,
    )
    assert pi.status_code == 201
    intent_id = pi.json()["id"]
    assert "checkout_url" in pi.json()
    cb = client.post(
        "/api/v1/payments/callback",
        json={"intent_id": intent_id, "success": True, "psp_reference": "MOCK-1"},
    )
    assert cb.status_code == 200
    b3 = client.get(f"/api/v1/wallets/{uid}/balance", headers=HDR)
    assert b3.json()["balance_cents"] == 6000


def test_legal_and_registry(client: TestClient) -> None:
    lr = client.post(
        "/api/v1/legal/reviews",
        json={"contract_id": "contract-p1-test"},
        headers=HDR,
    )
    assert lr.status_code == 201
    rid = lr.json()["id"]
    d = client.post(
        f"/api/v1/legal/reviews/{rid}/decide",
        json={"approve": True, "comment": "ok", "reviewer_id": "rev-1"},
        headers=HDR,
    )
    assert d.status_code == 200
    assert d.json()["status"] == "APPROVED"
    reg = client.post(
        "/api/v1/registry/submissions",
        json={"contract_id": "contract-p1-test", "payload_json": "{}"},
        headers=HDR,
    )
    assert reg.status_code == 201
    assert reg.json()["tracking_code"].startswith("REG-MOCK-")


def test_notifications_dispatch(client: TestClient) -> None:
    r = client.post(
        "/api/v1/notifications/dispatch",
        json={
            "channel": "SMS",
            "recipient": "09120000000",
            "template_key": "p1_test",
            "payload": {"x": 1},
        },
        headers=HDR,
    )
    assert r.status_code == 202
    assert r.json()["notification_id"]


def test_security_roles_and_rbac_enforcement(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    r = client.get("/api/v1/security/roles", headers=HDR)
    assert r.status_code == 200
    codes = {x["code"] for x in r.json()}
    assert {"admin", "agent", "manager", "support"}.issubset(codes)
    monkeypatch.setenv("AMLINE_RBAC_ENFORCE", "1")
    blocked = client.get("/api/v1/crm/leads")
    assert blocked.status_code == 403
    ok = client.get("/api/v1/crm/leads", headers={"X-User-Permissions": "crm:read"})
    assert ok.status_code == 200
    monkeypatch.delenv("AMLINE_RBAC_ENFORCE", raising=False)


def test_health_ready_and_metrics(client: TestClient) -> None:
    assert client.get("/api/v1/health/ready").status_code == 200
    m = client.get("/api/v1/health/metrics")
    assert m.status_code == 200
    assert "crm_leads_total" in m.json()
