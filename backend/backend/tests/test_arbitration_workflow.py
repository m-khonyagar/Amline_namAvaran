from __future__ import annotations

import io
import uuid

import pytest
from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.main import app
from app.models.user import User, UserRole
import app.services.notification_queue as notification_queue

pytestmark = pytest.mark.redis


def _auth(client: TestClient, mobile: str) -> dict:
    r = client.post("/auth/send-otp", json={"mobile": mobile})
    assert r.status_code == 200
    code = r.json().get("dev_code")

    r = client.post("/auth/verify-otp", json={"mobile": mobile, "code": code})
    assert r.status_code == 200
    return r.json()


def test_arbitration_workflow_messages_attachments_notifications():
    rds = notification_queue.get_redis()

    with TestClient(app) as client:
        m_owner = "09" + uuid.uuid4().hex[:9]
        m_tenant = "09" + uuid.uuid4().hex[:9]

        t_owner = _auth(client, m_owner)
        t_tenant = _auth(client, m_tenant)

        h_owner = {"Authorization": f"Bearer {t_owner['access_token']}"}
        h_tenant = {"Authorization": f"Bearer {t_tenant['access_token']}"}

        # fund tenant wallet (dev-only)
        rr = client.post("/wallet/deposit", headers=h_tenant, json={"amount": 500})
        assert rr.status_code == 200

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

        owner_id = client.get("/users/me", headers=h_owner).json()["id"]

        before = rds.xlen(notification_queue.STREAM_KEY)

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

        assert rds.xlen(notification_queue.STREAM_KEY) >= before + 1

        # post a message
        before = rds.xlen(notification_queue.STREAM_KEY)
        rr = client.post(
            f"/arbitrations/{arb_id}/messages",
            headers=h_tenant,
            json={"body": "hello"},
        )
        assert rr.status_code == 200
        assert rr.json()["body"] == "hello"
        assert rds.xlen(notification_queue.STREAM_KEY) >= before + 1

        # upload attachment
        before = rds.xlen(notification_queue.STREAM_KEY)
        rr = client.post(
            f"/arbitrations/{arb_id}/attachments",
            headers=h_tenant,
            files={"file": ("evidence.txt", io.BytesIO(b"evidence"), "text/plain")},
        )
        assert rr.status_code == 200
        att_id = rr.json()["id"]
        assert rds.xlen(notification_queue.STREAM_KEY) >= before + 1

        # list attachments
        rr = client.get(f"/arbitrations/{arb_id}/attachments", headers=h_tenant)
        assert rr.status_code == 200
        assert any(x["id"] == att_id for x in rr.json())

        # Promote owner to Moderator directly via DB for this test.
        db = SessionLocal()
        try:
            u = db.query(User).filter(User.mobile == m_owner).one()
            u.role = UserRole.moderator
            db.commit()
        finally:
            db.close()

        # move to under_review
        rr = client.post(
            f"/arbitrations/{arb_id}/resolve",
            headers=h_owner,
            json={"status": "under_review", "resolution": None},
        )
        assert rr.status_code == 200
        assert rr.json()["status"] == "under_review"

        # resolve
        rr = client.post(
            f"/arbitrations/{arb_id}/resolve",
            headers=h_owner,
            json={"status": "resolved", "resolution": "ok"},
        )
        assert rr.status_code == 200
        assert rr.json()["status"] == "resolved"

        # message after close forbidden
        rr = client.post(
            f"/arbitrations/{arb_id}/messages",
            headers=h_tenant,
            json={"body": "after"},
        )
        assert rr.status_code in (403, 400)
