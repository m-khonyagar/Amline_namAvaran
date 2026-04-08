"""v1 mock admin auth: magic mobile must use configured OTP code."""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_admin_magic_mobile_requires_correct_otp(client: TestClient) -> None:
    magic = os.getenv("AMLINE_OTP_MAGIC_MOBILE", "09107709601")
    code = os.getenv("AMLINE_OTP_MAGIC_CODE", "11111")
    r0 = client.post("/api/v1/admin/otp/send", json={"mobile": magic})
    assert r0.status_code == 200
    bad = client.post("/api/v1/admin/login", json={"mobile": magic, "otp": "00000"})
    assert bad.status_code == 400
    ok = client.post("/api/v1/admin/login", json={"mobile": magic, "otp": code})
    assert ok.status_code == 200
    assert ok.json().get("access_token")


def test_admin_non_magic_still_accepts_any_otp(client: TestClient) -> None:
    r = client.post("/api/v1/admin/login", json={"mobile": "09121111111", "otp": "any"})
    assert r.status_code == 200
