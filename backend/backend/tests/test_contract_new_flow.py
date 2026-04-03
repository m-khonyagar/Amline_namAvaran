"""New Flow 0.1.3 — next_step و بخش‌های قرارداد."""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("AMLINE_OTP_DEBUG", "1")

from app.main import app  # noqa: E402


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_status_exposes_next_step(client: TestClient) -> None:
    cid = client.post("/api/v1/contracts/start", json={"party_type": "LANDLORD"}).json()["id"]
    st = client.get(f"/api/v1/contracts/{cid}/status").json()
    assert st["step"] == "LANDLORD_INFORMATION"
    assert st["next_step"] == "LANDLORD_INFORMATION"


def test_get_contract_includes_next_step_and_flow_version(client: TestClient) -> None:
    cid = client.post("/api/v1/contracts/start", json={"party_type": "LANDLORD"}).json()["id"]
    body = client.get(f"/api/v1/contracts/{cid}").json()
    assert body["next_step"] == body["step"]
    assert body["flow_version"] == "0.1.3"


def test_home_info_stores_payload(client: TestClient) -> None:
    cid = client.post("/api/v1/contracts/start", json={"party_type": "LANDLORD"}).json()["id"]
    client.post(
        f"/api/v1/contracts/{cid}/home-info",
        json={"payload": {"address_line": "تهران، خیابان آزادی"}, "next_step": "DATING"},
    )
    body = client.get(f"/api/v1/contracts/{cid}").json()
    assert body["home_info"]["address_line"] == "تهران، خیابان آزادی"
    assert body["step"] == "DATING"


def test_renting_rejected_for_buy_sell(client: TestClient) -> None:
    cid = client.post(
        "/api/v1/contracts/start",
        json={"party_type": "LANDLORD", "contract_type": "BUYING_AND_SELLING"},
    ).json()["id"]
    r = client.post(f"/api/v1/contracts/{cid}/renting", json={})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "FLOW_INVALID_OPERATION"
