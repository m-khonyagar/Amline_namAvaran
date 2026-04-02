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
