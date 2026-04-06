from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from app.main import app


def _auth(client: TestClient, mobile: str) -> dict:
    r = client.post("/auth/send-otp", json={"mobile": mobile})
    assert r.status_code == 200
    code = r.json().get("dev_code")

    r = client.post("/auth/verify-otp", json={"mobile": mobile, "code": code})
    assert r.status_code == 200
    return r.json()


def test_arbitration_summary_fields_and_acl():
    with TestClient(app) as client:
        m_owner = "09" + uuid.uuid4().hex[:9]
        m_tenant = "09" + uuid.uuid4().hex[:9]
        m_other = "09" + uuid.uuid4().hex[:9]

        t_owner = _auth(client, m_owner)
        t_tenant = _auth(client, m_tenant)
        t_other = _auth(client, m_other)

        h_owner = {"Authorization": f"Bearer {t_owner['access_token']}"}
        h_tenant = {"Authorization": f"Bearer {t_tenant['access_token']}"}
        h_other = {"Authorization": f"Bearer {t_other['access_token']}"}

        # create property
        rr = client.post(
            "/properties",
            headers=h_owner,
            json={
                "city": "Tehran",
                "address": "Test Address",
                "area": 85.5,
                "rooms": 2,
                "year_built": 1395,
                "property_type": "apartment",
            },
        )
        assert rr.status_code == 200
        prop_id = rr.json()["id"]

        tenant_id = client.get("/users/me", headers=h_tenant).json()["id"]

        # create contract
        rr = client.post(
            "/contracts-v2",
            headers=h_owner,
            json={
                "property_id": prop_id,
                "tenant_id": tenant_id,
                "contract_type": "rent",
                "deposit_amount": 1000,
                "rent_amount": 200,
                "start_date": "2026-03-10",
                "end_date": "2027-03-10",
            },
        )
        assert rr.status_code == 200
        contract_id = rr.json()["id"]
        tracking_code = rr.json().get("tracking_code")

        owner_id = client.get("/users/me", headers=h_owner).json()["id"]

        # create arbitration by tenant against owner
        rr = client.post(
            "/arbitrations",
            headers=h_tenant,
            json={
                "contract_id": contract_id,
                "respondent_id": owner_id,
                "reason": "payment_dispute",
                "description": "test",
            },
        )
        assert rr.status_code == 200
        arb_id = rr.json()["id"]

        # summary visible to tenant
        rr = client.get(f"/arbitrations/{arb_id}/summary", headers=h_tenant)
        assert rr.status_code == 200
        s = rr.json()

        assert s["id"] == arb_id
        assert s["contract_id"] == contract_id
        assert s["property_city"] == "Tehran"
        assert s["claimant_mobile"] == m_tenant
        assert s["respondent_mobile"] == m_owner

        # tracking_code is best-effort (depends on contract implementation)
        if tracking_code is not None:
            assert s["contract_tracking_code"] == tracking_code

        # summary forbidden to unrelated user
        rr = client.get(f"/arbitrations/{arb_id}/summary", headers=h_other)
        assert rr.status_code == 403
