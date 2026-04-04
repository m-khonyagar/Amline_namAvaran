"""SSOT contract kinds, catalog, and wizard branching."""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("AMLINE_OTP_DEBUG", "1")

from app.main import app  # noqa: E402


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_ssot_catalog(client: TestClient) -> None:
    r = client.get("/api/v1/contracts/ssot/catalog")
    assert r.status_code == 200
    data = r.json()
    assert "RENT" in data["contract_kinds"]
    assert "LEASE_TO_OWN" in data["contract_kinds"]
    assert data["signature_flow_stages"] == ["S1", "S2", "S3", "S4", "S5"]
    assert data["payment_flow_stages"] == ["P1", "P2", "P3", "P4"]
    assert data["combined_flow"] == "T1"


def test_start_unknown_contract_type(client: TestClient) -> None:
    r = client.post(
        "/api/v1/contracts/start",
        json={"party_type": "LANDLORD", "contract_type": "NOT_A_REAL_TYPE"},
    )
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "CONTRACT_TYPE_UNKNOWN"


def test_start_sets_ssot_meta_and_flow_version(client: TestClient) -> None:
    cid = client.post(
        "/api/v1/contracts/start",
        json={"party_type": "LANDLORD", "contract_type": "EXCHANGE"},
    ).json()["id"]
    body = client.get(f"/api/v1/contracts/{cid}").json()
    assert body["flow_version"] == "0.1.4"
    assert body["ssot_kind"] == "EXCHANGE"
    assert body["signature_flow"]["stages"] == ["S1", "S2", "S3", "S4", "S5"]


def test_renting_rejected_for_exchange(client: TestClient) -> None:
    cid = client.post(
        "/api/v1/contracts/start",
        json={"party_type": "LANDLORD", "contract_type": "EXCHANGE"},
    ).json()["id"]
    r = client.post(f"/api/v1/contracts/{cid}/renting", json={})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "FLOW_INVALID_OPERATION"


def test_lease_to_own_allows_renting_after_mortgage(client: TestClient) -> None:
    cid = client.post(
        "/api/v1/contracts/start",
        json={"party_type": "LANDLORD", "contract_type": "LEASE_TO_OWN"},
    ).json()["id"]
    # advance to RENTING
    client.post(f"/api/v1/contracts/{cid}/party/landlord", json={})
    client.post(
        f"/api/v1/contracts/{cid}/party/landlord/set",
        json={"next_step": "TENANT_INFORMATION"},
    )
    client.post(f"/api/v1/contracts/{cid}/party/tenant", json={})
    client.post(
        f"/api/v1/contracts/{cid}/party/tenant/set",
        json={"next_step": "PLACE_INFORMATION"},
    )
    client.post(
        f"/api/v1/contracts/{cid}/home-info",
        json={"next_step": "DATING"},
    )
    client.post(
        f"/api/v1/contracts/{cid}/dating",
        json={"next_step": "MORTGAGE"},
    )
    client.post(
        f"/api/v1/contracts/{cid}/mortgage",
        json={"next_step": None},
    )
    st = client.get(f"/api/v1/contracts/{cid}/status").json()
    assert st["step"] == "RENTING"
    r = client.post(f"/api/v1/contracts/{cid}/renting", json={})
    assert r.status_code == 201


def test_sign_set_records_ssot_signature_stage(client: TestClient) -> None:
    cid = client.post(
        "/api/v1/contracts/start",
        json={"party_type": "LANDLORD", "contract_type": "SALE"},
    ).json()["id"]
    client.post(f"/api/v1/contracts/{cid}/party/landlord", json={})
    client.post(
        f"/api/v1/contracts/{cid}/party/landlord/set",
        json={"next_step": "TENANT_INFORMATION"},
    )
    client.post(f"/api/v1/contracts/{cid}/party/tenant", json={})
    client.post(
        f"/api/v1/contracts/{cid}/party/tenant/set",
        json={"next_step": "PLACE_INFORMATION"},
    )
    client.post(f"/api/v1/contracts/{cid}/home-info", json={"next_step": "DATING"})
    client.post(f"/api/v1/contracts/{cid}/dating", json={"next_step": "MORTGAGE"})
    client.post(f"/api/v1/contracts/{cid}/mortgage", json={"next_step": "SIGNING"})
    client.post(
        f"/api/v1/contracts/{cid}/sign/set",
        json={"ssot_signature_stage": "S2", "next_step": "WITNESS"},
    )
    body = client.get(f"/api/v1/contracts/{cid}").json()
    assert "S2" in body["signature_flow"]["completed"]
    assert body["signings"][-1].get("ssot_signature_stage") == "S2"
