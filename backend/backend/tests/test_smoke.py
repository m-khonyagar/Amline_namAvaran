from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from app.main import app


def test_health_and_auth_wallet_flow():
    mobile = "09" + uuid.uuid4().hex[:9]

    with TestClient(app) as client:
        r = client.get("/health")
        assert r.status_code == 200

        r = client.post("/auth/send-otp", json={"mobile": mobile})
        assert r.status_code == 200
        code = r.json().get("dev_code")
        assert code and len(code) == 6

        r = client.post("/auth/verify-otp", json={"mobile": mobile, "code": code})
        assert r.status_code == 200
        tokens = r.json()
        assert tokens["access_token"]

        headers = {"Authorization": f"Bearer {tokens['access_token']}"}

        r = client.get("/users/me", headers=headers)
        assert r.status_code == 200
        assert r.json()["mobile"] == mobile

        r = client.get("/wallet/balance", headers=headers)
        assert r.status_code == 200
        assert float(r.json()["balance"]) == 0.0

        r = client.get("/financials/wallets", headers=headers)
        assert r.status_code == 200
        fw = r.json()
        assert fw.get("status") == "ACTIVE"
        assert float(fw.get("credit", -1)) == 0.0
        assert fw.get("user_id")


def test_admin_login_fixed_test_otp_without_prior_send():
    """کانون تست: 09100000000 + 11111 در env=dev بدون /admin/otp/send."""
    with TestClient(app) as client:
        r = client.post("/admin/login", json={"mobile": "09100000000", "otp": "11111"})
        assert r.status_code == 200
        body = r.json()
        assert body.get("access_token")
        assert (body.get("user") or {}).get("mobile") == "09100000000"
