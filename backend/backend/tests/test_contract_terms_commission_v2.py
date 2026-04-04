"""terms پلی‌مورفیک، کمیسیون، lifecycle_v2."""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from app.domain.contracts.ssot import ContractLifecycleStatus, ContractProductStatusV2

os.environ.setdefault("AMLINE_OTP_DEBUG", "1")

from app.main import app  # noqa: E402


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_contract_json_includes_lifecycle_v2_draft(client: TestClient) -> None:
    cid = client.post("/api/v1/contracts/start", json={"party_type": "LANDLORD"}).json()[
        "id"
    ]
    r = client.get(f"/api/v1/contracts/{cid}")
    assert r.status_code == 200
    body = r.json()
    assert body["lifecycle_v2"] == ContractProductStatusV2.DRAFT.value
    assert body["terms"] == {}
    assert body["commissions"] == []


def test_status_includes_lifecycle_v2(client: TestClient) -> None:
    cid = client.post("/api/v1/contracts/start", json={"party_type": "LANDLORD"}).json()[
        "id"
    ]
    client.post(f"/api/v1/contracts/{cid}/party/landlord/set", json={})
    assert client.post(f"/api/v1/contracts/{cid}/party/tenant").status_code == 201
    client.post(f"/api/v1/contracts/{cid}/party/tenant/set", json={})
    for url, payload in [
        (f"/api/v1/contracts/{cid}/home-info", {"payload": {}}),
        (f"/api/v1/contracts/{cid}/dating", {"payload": {}}),
        (f"/api/v1/contracts/{cid}/mortgage", {"payload": {}}),
        (f"/api/v1/contracts/{cid}/renting", {"payload": {}}),
        (f"/api/v1/contracts/{cid}/sign/set", {"payload": {}}),
    ]:
        client.post(url, json=payload)
    st = client.get(f"/api/v1/contracts/{cid}/status").json()
    assert st["status"] == ContractLifecycleStatus.PENDING_SIGNATURES.value
    assert st["lifecycle_v2"] == ContractProductStatusV2.AWAITING_SIGNATURES.value


def test_patch_terms_and_commissions(client: TestClient) -> None:
    cid = client.post("/api/v1/contracts/start", json={"party_type": "LANDLORD"}).json()[
        "id"
    ]
    tr = client.patch(
        f"/api/v1/contracts/{cid}/terms",
        json={
            "terms": {
                "kind": "SALE",
                "property_address": "تهران",
                "total_price": 10_000_000_000,
            }
        },
    )
    assert tr.status_code == 200
    assert tr.json()["terms"]["kind"] == "SALE"
    cr = client.post(
        f"/api/v1/contracts/{cid}/commissions",
        json={
            "commission_type": "SALE_COMMISSION",
            "paid_by": "BOTH",
            "amount": 5_000_000,
        },
    )
    assert cr.status_code == 201
    assert cr.json()["status"] == "PENDING"
    lst = client.get(f"/api/v1/contracts/{cid}/commissions").json()
    assert len(lst["items"]) == 1
    assert lst["items"][0]["amount"] == 5_000_000


def test_exchange_party_roles_in_ssot() -> None:
    from app.domain.contracts.ssot import is_party_role_allowed_for_kind

    assert is_party_role_allowed_for_kind("EXCHANGE", "EXCHANGER_FIRST")
    assert is_party_role_allowed_for_kind("EXCHANGE", "EXCHANGER_SECOND")
