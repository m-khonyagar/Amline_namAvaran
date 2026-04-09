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


def test_wallet_deposit_and_pay_rent_from_wallet():
    with TestClient(app) as client:
        # owner
        m1 = "09" + uuid.uuid4().hex[:9]
        t1 = _auth(client, m1)
        h1 = {"Authorization": f"Bearer {t1['access_token']}"}

        # tenant
        m2 = "09" + uuid.uuid4().hex[:9]
        t2 = _auth(client, m2)
        h2 = {"Authorization": f"Bearer {t2['access_token']}"}

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

        # fund tenant wallet (dev-only)
        r = client.post("/wallet/deposit", headers=h2, json={"amount": 500})
        assert r.status_code == 200

        bal_before = client.get("/wallet/balance", headers=h2).json()["balance"]

        # pay rent from tenant wallet
        r = client.post(
            "/payments/pay-rent",
            headers=h2,
            json={"contract_id": contract_id, "amount": 200, "payment_type": "rent"},
        )
        assert r.status_code == 200
        assert r.json()["status"] == "completed"

        bal_after = client.get("/wallet/balance", headers=h2).json()["balance"]
        assert bal_after == bal_before - 200


def test_financials_wallets_matches_wallet_balance():
    with TestClient(app) as client:
        m = "09" + uuid.uuid4().hex[:9]
        t = _auth(client, m)
        h = {"Authorization": f"Bearer {t['access_token']}"}
        r = client.post("/wallet/deposit", headers=h, json={"amount": 1_234_000})
        assert r.status_code == 200
        bal = float(client.get("/wallet/balance", headers=h).json()["balance"])
        fw = client.get("/financials/wallets", headers=h).json()
        assert float(fw["credit"]) == bal == 1_234_000.0


def test_wizard_commission_paid_from_wallet_when_balance_sufficient():
    with TestClient(app) as client:
        m = "09" + uuid.uuid4().hex[:9]
        t = _auth(client, m)
        h = {"Authorization": f"Bearer {t['access_token']}"}
        r = client.post("/wallet/deposit", headers=h, json={"amount": 6_000_000})
        assert r.status_code == 200
        r = client.post(
            "/wizard/start",
            headers=h,
            json={"contract_type": "PROPERTY_RENT", "party_type": "LANDLORD"},
        )
        assert r.status_code == 201
        cid = r.json()["id"]
        inv_before = client.get(f"/wizard/{cid}/commission/invoice", headers=h).json()
        expected_fee = float(inv_before.get("total_amount", 5_550_000))
        r = client.post(
            f"/wizard/{cid}/commission/pay",
            headers=h,
            json={"use_wallet_credit": True},
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("used_wallet") is True
        assert data.get("redirect_url") == "/"
        bal = float(client.get("/wallet/balance", headers=h).json()["balance"])
        assert bal == 6_000_000.0 - expected_fee
        inv = client.get(f"/wizard/{cid}/commission/invoice", headers=h).json()
        assert inv.get("commission_paid") is True


def test_financials_bank_gateway_returns_html():
    with TestClient(app) as client:
        r = client.get("/financials/bank/gateway")
        assert r.status_code == 200
        assert "html" in r.headers.get("content-type", "").lower()
        assert "mock-verify" in r.text


def test_bank_mock_verify_marks_commission_paid():
    with TestClient(app) as client:
        m = "09" + uuid.uuid4().hex[:9]
        t = _auth(client, m)
        h = {"Authorization": f"Bearer {t['access_token']}"}
        r = client.post(
            "/wizard/start",
            headers=h,
            json={"contract_type": "PROPERTY_RENT", "party_type": "LANDLORD"},
        )
        assert r.status_code == 201
        cid = r.json()["id"]
        r = client.post("/financials/bank/mock-verify", headers=h, json={"contract_id": cid})
        assert r.status_code == 200
        inv = client.get(f"/wizard/{cid}/commission/invoice", headers=h).json()
        assert inv.get("commission_paid") is True
        assert inv.get("commission_paid_at")


def _wizard_to_signing(client: TestClient, headers: dict, contract_id: str) -> None:
    assert (
        client.post(
            f"/wizard/{contract_id}/party/landlord/set",
            json={"next_step": "TENANT_INFORMATION"},
            headers=headers,
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/wizard/{contract_id}/party/tenant/set",
            json={"next_step": "PLACE_INFORMATION"},
            headers=headers,
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/wizard/{contract_id}/home-info",
            json={
                "postal_code": "1234567890",
                "area_m2": 100.0,
                "property_use_type": "RESIDENTIAL",
                "restroom_type": "WC",
                "heating_system_type": "CENTRAL",
                "cooling_system_type": "SPLIT",
            },
            headers=headers,
        ).status_code
        == 201
    )
    assert (
        client.post(
            f"/wizard/{contract_id}/dating",
            json={
                "start_date": "2025-01-01",
                "end_date": "2027-01-01",
                "delivery_date": "2025-02-01",
            },
            headers=headers,
        ).status_code
        == 201
    )
    assert (
        client.post(
            f"/wizard/{contract_id}/mortgage",
            json={
                "total_amount": 100,
                "stages": [{"due_date": "2025-01-01", "payment_type": "CASH", "amount": 100}],
            },
            headers=headers,
        ).status_code
        == 201
    )
    assert (
        client.post(
            f"/wizard/{contract_id}/renting",
            json={
                "monthly_rent_amount": 1_000_000,
                "rent_due_day_of_month": 1,
                "stages": [
                    {"due_date": "2025-01-01", "payment_type": "CASH", "amount": 1_000_000},
                ],
            },
            headers=headers,
        ).status_code
        == 201
    )


def test_status_pending_commission_when_at_signing_unpaid():
    with TestClient(app) as client:
        m = "09" + uuid.uuid4().hex[:9]
        t = _auth(client, m)
        h = {"Authorization": f"Bearer {t['access_token']}"}
        r = client.post(
            "/wizard/start",
            headers=h,
            json={"contract_type": "PROPERTY_RENT", "party_type": "LANDLORD"},
        )
        assert r.status_code == 201
        cid = r.json()["id"]
        _wizard_to_signing(client, h, cid)
        st = client.get(f"/wizard/{cid}/status", headers=h).json()
        assert st.get("step") == "SIGNING"
        assert st.get("status") == "PENDING_COMMISSION"
        r_sign = client.post(f"/wizard/{cid}/sign", headers=h)
        assert r_sign.status_code == 400
        assert r_sign.json().get("detail") == "commission_required"


def test_signing_allowed_after_commission_wallet_pay():
    with TestClient(app) as client:
        m = "09" + uuid.uuid4().hex[:9]
        t = _auth(client, m)
        h = {"Authorization": f"Bearer {t['access_token']}"}
        r = client.post("/wallet/deposit", headers=h, json={"amount": 6_000_000})
        assert r.status_code == 200
        r = client.post(
            "/wizard/start",
            headers=h,
            json={"contract_type": "PROPERTY_RENT", "party_type": "LANDLORD"},
        )
        assert r.status_code == 201
        cid = r.json()["id"]
        _wizard_to_signing(client, h, cid)
        assert client.get(f"/wizard/{cid}/status", headers=h).json().get("status") == "PENDING_COMMISSION"
        r = client.post(
            f"/wizard/{cid}/commission/pay",
            headers=h,
            json={"use_wallet_credit": True},
        )
        assert r.status_code == 200
        assert client.get(f"/wizard/{cid}/status", headers=h).json().get("status") == "DRAFT"
        r_sign = client.post(f"/wizard/{cid}/sign", headers=h)
        assert r_sign.status_code == 201
