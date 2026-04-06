"""
Staging E2E smoke tests — run against real backend (not mock).
Usage:
    AMLINE_DATABASE_URL=... AMLINE_REDIS_URL=... AMLINE_JWT_SECRET=... \
    python -m pytest tests/test_staging_e2e.py -v

These tests verify the full flow works end-to-end with real DB and Redis.
"""
from __future__ import annotations

import os
import pytest
from fastapi.testclient import TestClient

# Skip if not in staging mode
pytestmark = pytest.mark.skipif(
    os.getenv("AMLINE_ENV", "dev") == "dev",
    reason="Staging E2E tests only run when AMLINE_ENV != dev",
)


@pytest.fixture(scope="module")
def client():
    from app.main import app
    return TestClient(app)


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_otp_send_and_login(client):
    """Full OTP login flow."""
    mobile = os.getenv("TEST_MOBILE", "09120000000")

    # Send OTP
    resp = client.post("/admin/otp/send", json={"mobile": mobile})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True

    # In dev mode, code is returned in response
    code = data.get("dev_code")
    if not code:
        pytest.skip("No dev_code in response — real SMS sent, cannot auto-verify in CI")

    # Login
    resp = client.post("/admin/login", json={"mobile": mobile, "otp": code})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    return data["access_token"]


def test_contract_wizard_full_flow(client):
    """Start a contract and verify it reaches LANDLORD_INFORMATION step."""
    mobile = os.getenv("TEST_MOBILE", "09120000000")

    # Login
    resp = client.post("/admin/otp/send", json={"mobile": mobile})
    code = resp.json().get("dev_code")
    if not code:
        pytest.skip("No dev_code available")

    resp = client.post("/admin/login", json={"mobile": mobile, "otp": code})
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Start contract
    resp = client.post(
        "/contracts/start",
        json={"contract_type": "PROPERTY_RENT", "party_type": "LANDLORD"},
        headers=headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "DRAFT"
    assert data["step"] == "LANDLORD_INFORMATION"
    contract_id = data["id"]

    # Get status
    resp = client.get(f"/contracts/{contract_id}/status", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["contract_id"] == contract_id

    # List contracts
    resp = client.get("/contracts/list", headers=headers)
    assert resp.status_code == 200
    items = resp.json()
    assert any(c["id"] == contract_id for c in items)


def test_crm_leads_crud(client):
    """Create, read, update, delete a CRM lead."""
    mobile = os.getenv("TEST_MOBILE", "09120000000")

    resp = client.post("/admin/otp/send", json={"mobile": mobile})
    code = resp.json().get("dev_code")
    if not code:
        pytest.skip("No dev_code available")

    resp = client.post("/admin/login", json={"mobile": mobile, "otp": code})
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create lead
    resp = client.post(
        "/admin/crm/leads",
        json={"full_name": "تست E2E", "mobile": "09199999999", "need_type": "RENT"},
        headers=headers,
    )
    assert resp.status_code == 201
    lead_id = resp.json()["id"]

    # Get lead
    resp = client.get(f"/admin/crm/leads/{lead_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "تست E2E"

    # Update status
    resp = client.patch(
        f"/admin/crm/leads/{lead_id}",
        json={"status": "CONTACTED"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "CONTACTED"

    # Delete
    resp = client.delete(f"/admin/crm/leads/{lead_id}", headers=headers)
    assert resp.status_code == 204

    # Verify deleted
    resp = client.get(f"/admin/crm/leads/{lead_id}", headers=headers)
    assert resp.status_code == 404


def test_crm_stats(client):
    """CRM stats endpoint returns expected fields."""
    mobile = os.getenv("TEST_MOBILE", "09120000000")

    resp = client.post("/admin/otp/send", json={"mobile": mobile})
    code = resp.json().get("dev_code")
    if not code:
        pytest.skip("No dev_code available")

    resp = client.post("/admin/login", json={"mobile": mobile, "otp": code})
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/admin/crm/stats", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    for field in ["active_leads", "total_leads", "conversion_rate", "leads_this_month"]:
        assert field in data
