from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.main import app
from app.models.user import User, UserRole


def _auth(client: TestClient, mobile: str) -> dict:
    r = client.post("/auth/send-otp", json={"mobile": mobile})
    assert r.status_code == 200
    code = r.json().get("dev_code")

    r = client.post("/auth/verify-otp", json={"mobile": mobile, "code": code})
    assert r.status_code == 200
    return r.json()


def test_arbitration_create_and_resolve_and_tenant_score_increment():
    with TestClient(app) as client:
        # owner
        m1 = "09" + uuid.uuid4().hex[:9]
        t1 = _auth(client, m1)
        h1 = {"Authorization": f"Bearer {t1['access_token']}"}

        # tenant
        m2 = "09" + uuid.uuid4().hex[:9]
        t2 = _auth(client, m2)
        h2 = {"Authorization": f"Bearer {t2['access_token']}"}

        # fund tenant wallet (dev-only)
        r = client.post("/wallet/deposit", headers=h2, json={"amount": 500})
        assert r.status_code == 200

        # create property
        r = client.post(
            "/properties",
            headers=h1,
            json={
                "city": "Tehran",
                "address": "Test Address",
                "area": 85.5,
                "rooms": 2,
                "year_built": 1395,
                "property_type": "apartment",
            },
        )
        assert r.status_code == 200
        prop_id = r.json()["id"]

        tenant_id = client.get("/users/me", headers=h2).json()["id"]

        # create contract
        r = client.post(
            "/contracts-v2",
            headers=h1,
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
        assert r.status_code == 200
        contract_id = r.json()["id"]

        # pay rent as tenant
        r = client.post(
            "/payments/pay-rent",
            headers=h2,
            json={"contract_id": contract_id, "amount": 200, "payment_type": "rent"},
        )
        assert r.status_code == 200
        payment_id = r.json()["id"]

        # verify tenant score increment
        score = client.get("/tenant-score/me", headers=h2).json()["tenant_score"]
        assert score >= 1

        # create arbitration by tenant against owner
        owner_id = client.get("/users/me", headers=h1).json()["id"]
        r = client.post(
            "/arbitrations",
            headers=h2,
            json={
                "contract_id": contract_id,
                "respondent_id": owner_id,
                "reason": "payment_dispute",
                "description": "test",
            },
        )
        assert r.status_code == 200
        arb_id = r.json()["id"]

        # Promote owner to Moderator directly via DB (avoid admin bootstrap dependency in CI)
        db = SessionLocal()
        try:
            u = db.query(User).filter(User.mobile == m1).one()
            u.role = UserRole.moderator
            db.commit()
        finally:
            db.close()

        # resolve as moderator
        r = client.post(
            f"/arbitrations/{arb_id}/resolve",
            headers=h1,
            json={"status": "resolved", "resolution": "ok"},
        )
        assert r.status_code == 200
        assert r.json()["status"] == "resolved"
