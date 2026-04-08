"""Contract OTP sign / witness flows (P0#3)."""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("AMLINE_OTP_DEBUG", "1")

from app.main import app  # noqa: E402


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_sign_request_and_verify(client: TestClient) -> None:
    r = client.post("/api/v1/contracts/start", json={"party_type": "LANDLORD"})
    assert r.status_code == 201
    cid = r.json()["id"]
    r2 = client.post(f"/api/v1/contracts/{cid}/sign", json={"party_id": None})
    assert r2.status_code == 201
    body = r2.json()
    assert body.get("ok") is True
    code = body.get("debug_code")
    assert code and str(code).isdigit()
    r3 = client.post(
        f"/api/v1/contracts/{cid}/sign/verify",
        json={"otp": code, "mobile": "09120000000", "salt": "t"},
    )
    assert r3.status_code == 200
    assert r3.json() == {"ok": True}


def test_magic_mobile_contract_otp(client: TestClient) -> None:
    magic = os.getenv("AMLINE_OTP_MAGIC_MOBILE", "09107709601")
    code = os.getenv("AMLINE_OTP_MAGIC_CODE", "11111")
    r = client.post("/api/v1/contracts/start", json={"party_type": "LANDLORD"})
    assert r.status_code == 201
    cid = r.json()["id"]
    r2 = client.post(
        f"/api/v1/contracts/{cid}/sign/request",
        json={"party_id": None, "mobile": magic},
    )
    assert r2.status_code == 201
    assert r2.json().get("debug_code") == code
    r3 = client.post(
        f"/api/v1/contracts/{cid}/sign/verify",
        json={"otp": code, "mobile": magic, "salt": "t"},
    )
    assert r3.status_code == 200
    assert r3.json() == {"ok": True}


def test_witness_send_and_verify(client: TestClient) -> None:
    r = client.post("/api/v1/contracts/start", json={"party_type": "LANDLORD"})
    cid = r.json()["id"]
    r2 = client.post(
        f"/api/v1/contracts/{cid}/witness/send-otp",
        json={
            "national_code": "0012345678",
            "mobile": "09123334444",
            "witness_type": "TENANT",
        },
    )
    assert r2.status_code == 201
    code = r2.json()["debug_code"]
    r3 = client.post(
        f"/api/v1/contracts/{cid}/witness/verify",
        json={
            "otp": code,
            "mobile": "09123334444",
            "national_code": "0012345678",
            "salt": "",
            "witness_type": "TENANT",
        },
    )
    assert r3.status_code == 200
    assert r3.json()["ok"] is True
    assert r3.json()["next_step"] == "FINISH"
