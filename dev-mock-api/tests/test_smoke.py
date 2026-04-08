"""Smoke tests for dev-mock-api extended routes (no running server required)."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_health(client: TestClient) -> None:
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


def test_contracts_start_requires_party_type(client: TestClient) -> None:
    r = client.post("/contracts/start", json={"contract_type": "PROPERTY_RENT"})
    assert r.status_code == 422


def test_contracts_resolve_info_not_shadowed(client: TestClient) -> None:
    r = client.get("/contracts/resolve-info")
    assert r.status_code == 200
    assert r.json().get("result") == "ok"


def _advance_to_mortgage(client: TestClient, cid: str) -> None:
    assert (
        client.post(
            f"/contracts/{cid}/party/landlord/set",
            json={"next_step": "TENANT_INFORMATION"},
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/contracts/{cid}/party/tenant/set",
            json={"next_step": "PLACE_INFORMATION"},
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/contracts/{cid}/home-info",
            json={},
        ).status_code
        == 201
    )
    assert (
        client.post(
            f"/contracts/{cid}/dating",
            json={"start_date": "2025-01-01", "end_date": "2026-01-01"},
        ).status_code
        == 201
    )


def test_wizard_invalid_step_transition(client: TestClient) -> None:
    r = client.post(
        "/contracts/start",
        json={"contract_type": "PROPERTY_RENT", "party_type": "LANDLORD"},
    )
    assert r.status_code == 201
    cid = r.json()["id"]
    bad = client.post(
        f"/contracts/{cid}/mortgage",
        json={"total_amount": 100, "stages": [{"due_date": "2025-01-01", "payment_type": "CASH", "amount": 100}]},
    )
    assert bad.status_code == 422
    detail = bad.json().get("detail")
    assert isinstance(detail, dict) and detail.get("code") == "invalid_step_transition"


def test_wizard_mortgage_after_happy_path(client: TestClient) -> None:
    r = client.post(
        "/contracts/start",
        json={"contract_type": "PROPERTY_RENT", "party_type": "LANDLORD"},
    )
    assert r.status_code == 201
    cid = r.json()["id"]
    _advance_to_mortgage(client, cid)
    ok = client.post(
        f"/contracts/{cid}/mortgage",
        json={"total_amount": 100, "stages": [{"due_date": "2025-01-01", "payment_type": "CASH", "amount": 100}]},
    )
    assert ok.status_code == 201
    assert ok.json().get("next_step") == "RENTING"


def test_admin_users_list_shape(client: TestClient) -> None:
    r = client.get("/admin/users")
    assert r.status_code == 200
    data = r.json()
    assert "items" in data and "total" in data
    assert isinstance(data["items"], list)


def test_admin_user_detail_and_subroutes(client: TestClient) -> None:
    r = client.get("/admin/users/mock-001")
    assert r.status_code == 200
    assert r.json().get("id") == "mock-001"

    for path in (
        "/admin/users/mock-001/timeline",
        "/admin/users/mock-001/payments",
        "/admin/users/mock-001/wallet/ledger",
        "/admin/users/mock-001/tickets",
    ):
        sub = client.get(path)
        assert sub.status_code == 200
        assert "items" in sub.json()


def test_admin_contract_moderation(client: TestClient) -> None:
    start = client.post(
        "/contracts/start",
        json={"contract_type": "PROPERTY_RENT", "party_type": "SELF"},
    )
    assert start.status_code == 201
    cid = start.json()["id"]

    r = client.post(f"/admin/contracts/{cid}/approve")
    assert r.status_code == 200
    assert r.json().get("ok") is True

    one = client.get(f"/contracts/{cid}")
    assert one.status_code == 200
    assert one.json().get("status") == "ACTIVE"


def test_notifications_patch_and_read_all(client: TestClient) -> None:
    lst = client.get("/admin/notifications")
    assert lst.status_code == 200
    payload = lst.json()
    items = payload.get("items") or []
    if not items:
        pytest.skip("no notifications seeded")
    nid = items[0]["id"]
    r = client.patch(f"/admin/notifications/{nid}", json={"read": True})
    assert r.status_code == 200
    ra = client.post("/admin/notifications/read-all")
    assert ra.status_code == 200


def test_delete_role_system_forbidden(client: TestClient) -> None:
    r = client.delete("/admin/roles/role-admin")
    assert r.status_code == 400


def test_admin_ads_and_workspace(client: TestClient) -> None:
    ads = client.get("/admin/ads")
    assert ads.status_code == 200
    assert "items" in ads.json()

    tasks = client.get("/admin/workspace/tasks")
    assert tasks.status_code == 200
    assert "items" in tasks.json()


def test_admin_consultant_applications(client: TestClient) -> None:
    r = client.get("/admin/consultants/applications")
    assert r.status_code == 200
    assert "items" in r.json()


def test_hamgit_financials_wallets_alias(client: TestClient) -> None:
    r = client.get("/admin/financials/wallets")
    assert r.status_code == 200
    data = r.json()
    assert "items" in data and data["total"] >= 0
    mc = client.post("/admin/financials/wallets/manual-charge", json={})
    assert mc.status_code == 200


def test_pr_contracts_list(client: TestClient) -> None:
    r = client.get("/admin/pr-contracts/list")
    assert r.status_code == 200
    assert r.json().get("items") == []


def test_hamgit_port_stubs(client: TestClient) -> None:
    assert client.get("/admin/settlements/users").status_code == 200
    assert client.get("/admin/custom-invoices/users").status_code == 200
    assert client.get("/admin/ads/properties").status_code == 200
    assert client.get("/admin/contracts/base-clauses").status_code == 200
    assert client.get("/financials/promos").status_code == 200


def test_pending_commission_status_and_sign_blocked_until_paid(client: TestClient) -> None:
    r = client.post(
        "/contracts/start",
        json={"contract_type": "PROPERTY_RENT", "party_type": "LANDLORD"},
    )
    assert r.status_code == 201
    cid = r.json()["id"]
    _advance_to_mortgage(client, cid)
    assert (
        client.post(
            f"/contracts/{cid}/mortgage",
            json={
                "total_amount": 100,
                "stages": [{"due_date": "2025-01-01", "payment_type": "CASH", "amount": 100}],
            },
        ).status_code
        == 201
    )
    assert (
        client.post(
            f"/contracts/{cid}/renting",
            json={
                "monthly_rent_amount": 1_000_000,
                "rent_due_day_of_month": 1,
                "stages": [{"due_date": "2025-01-01", "payment_type": "CASH", "amount": 1_000_000}],
            },
        ).status_code
        == 201
    )
    st = client.get(f"/contracts/{cid}/status").json()
    assert st.get("step") == "SIGNING"
    assert st.get("status") == "PENDING_COMMISSION"
    assert client.post(f"/contracts/{cid}/sign").status_code == 400
    assert (
        client.post(
            f"/contracts/{cid}/commission/pay",
            json={"use_wallet_credit": True},
        ).status_code
        == 200
    )
    assert client.get(f"/contracts/{cid}/status").json().get("status") == "DRAFT"
    assert client.post(f"/contracts/{cid}/sign").status_code == 201
