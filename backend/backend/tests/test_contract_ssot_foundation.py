"""SSOT §3.1–3.2 foundation — kinds, lifecycle, external_refs, party metadata."""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("AMLINE_OTP_DEBUG", "1")

from app.core.errors import AmlineError  # noqa: E402
from app.domain.contracts.ssot import (  # noqa: E402
    ContractLifecycleStatus,
    assert_transition_ok,
    can_transition,
    normalize_ssot_kind,
)
from app.main import app  # noqa: E402


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_normalize_ssot_kind_maps_legacy_types() -> None:
    assert normalize_ssot_kind("PROPERTY_RENT") == "RENT"
    assert normalize_ssot_kind("BUYING_AND_SELLING") == "SALE"
    assert normalize_ssot_kind("EXCHANGE") == "EXCHANGE"


def test_lifecycle_graph_revoke_from_draft() -> None:
    assert can_transition(ContractLifecycleStatus.DRAFT.value, ContractLifecycleStatus.REVOKED.value)
    assert_transition_ok(
        ContractLifecycleStatus.DRAFT.value, ContractLifecycleStatus.REVOKED.value
    )


def test_contract_start_exposes_ssot_kind_and_external_refs(client: TestClient) -> None:
    r = client.post(
        "/api/v1/contracts/start",
        json={
            "party_type": "LANDLORD",
            "contract_type": "BUYING_AND_SELLING",
            "created_by": "scribe-1",
            "external_refs": {"tracking_code": "TC-99"},
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert body["ssot_kind"] == "SALE"
    assert body["created_by"] == "scribe-1"
    assert body["external_refs"]["tracking_code"] == "TC-99"
    assert body["external_refs"]["khodnevis_id"] is None
    assert body["witnesses"] == []
    assert body["amendments"] == []
    assert body["payments"] == {}
    assert body["status"] == ContractLifecycleStatus.DRAFT.value


def test_patch_external_refs_merge(client: TestClient) -> None:
    cid = client.post(
        "/api/v1/contracts/start", json={"party_type": "LANDLORD"}
    ).json()["id"]
    r = client.patch(
        f"/api/v1/contracts/{cid}/external-refs",
        json={"khodnevis_id": "kn-1"},
    )
    assert r.status_code == 200
    refs = r.json()["external_refs"]
    assert refs["khodnevis_id"] == "kn-1"
    assert refs["katib_id"] is None
    r2 = client.patch(
        f"/api/v1/contracts/{cid}/external-refs",
        json={"katib_id": "kt-2"},
    )
    assert r2.json()["external_refs"]["khodnevis_id"] == "kn-1"
    assert r2.json()["external_refs"]["katib_id"] == "kt-2"


def test_party_patch_signature_fields(client: TestClient) -> None:
    cid = client.post(
        "/api/v1/contracts/start", json={"party_type": "LANDLORD"}
    ).json()["id"]
    client.post(f"/api/v1/contracts/{cid}/party/landlord")
    lst = client.get(f"/api/v1/contracts/{cid}").json()["parties"]["landlords"]
    pid = lst[0]["id"]
    pr = client.patch(
        f"/api/v1/contracts/{cid}/party/{pid}",
        json={
            "signature_status": "PENDING",
            "signature_method": "SMS",
            "agent_user_id": "agent-7",
        },
    )
    assert pr.status_code == 200
    assert pr.json()["signature_status"] == "PENDING"
    assert pr.json()["signature_method"] == "SMS"
    assert pr.json()["agent_user_id"] == "agent-7"
    assert pr.json()["ssot_role"] == "LANDLORD"


def test_landlord_set_promotes_in_progress(client: TestClient) -> None:
    cid = client.post(
        "/api/v1/contracts/start", json={"party_type": "LANDLORD"}
    ).json()["id"]
    client.post(f"/api/v1/contracts/{cid}/party/landlord/set", json={})
    st = client.get(f"/api/v1/contracts/{cid}/status").json()
    assert st["status"] == ContractLifecycleStatus.IN_PROGRESS.value


def test_revoke_invalid_from_completed_not_used() -> None:
    with pytest.raises(AmlineError) as exc:
        assert_transition_ok(
            ContractLifecycleStatus.COMPLETED.value,
            ContractLifecycleStatus.REVOKED.value,
        )
    assert exc.value.code == "CONTRACT_STATUS_TRANSITION_INVALID"
