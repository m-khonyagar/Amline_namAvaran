"""P0#4 — unified ErrorResponse envelope and handlers."""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("AMLINE_OTP_DEBUG", "1")

from app.main import app  # noqa: E402


@pytest.fixture
def client() -> TestClient:
    # Avoid propagating ExceptionGroup from middleware when routes raise unexpectedly
    return TestClient(app, raise_server_exceptions=False)


def _assert_error_envelope(data: dict, *, code: str) -> None:
    assert "error" in data
    assert data["error"]["code"] == code
    assert "message" in data["error"]
    assert data["error"].get("request_id")
    assert "request_id" in data
    assert "detail" in data


def test_validation_error_pydantic(client: TestClient) -> None:
    r = client.post("/api/v1/admin/roles", json={})
    assert r.status_code == 422
    data = r.json()
    _assert_error_envelope(data, code="VALIDATION_FAILED")
    assert data.get("field_errors")
    assert isinstance(data["detail"], list)


def test_missing_contract_resource(client: TestClient) -> None:
    r = client.get("/api/v1/contracts/contract-does-not-exist-xyz")
    assert r.status_code == 404
    data = r.json()
    _assert_error_envelope(data, code="CONTRACT_NOT_FOUND")


def test_missing_crm_lead_resource(client: TestClient) -> None:
    r = client.get("/api/v1/admin/crm/leads/crm-nonexistent-999")
    assert r.status_code == 404
    data = r.json()
    _assert_error_envelope(data, code="RESOURCE_NOT_FOUND")


def test_otp_verify_failure(client: TestClient) -> None:
    cid = client.post("/api/v1/contracts/start", json={"party_type": "LANDLORD"}).json()[
        "id"
    ]
    client.post(f"/api/v1/contracts/{cid}/sign", json={"party_id": None})
    r = client.post(
        f"/api/v1/contracts/{cid}/sign/verify",
        json={"otp": "000000", "mobile": "09120000000", "salt": ""},
    )
    assert r.status_code == 400
    data = r.json()
    _assert_error_envelope(data, code="OTP_INVALID_OR_EXPIRED")


def test_signature_flow_wrong_otp_same_as_otp_failure(client: TestClient) -> None:
    """Witness verify with bad OTP uses same domain code."""
    cid = client.post("/api/v1/contracts/start", json={"party_type": "LANDLORD"}).json()[
        "id"
    ]
    client.post(
        f"/api/v1/contracts/{cid}/witness/send-otp",
        json={
            "national_code": "007",
            "mobile": "09120000001",
            "witness_type": "LANDLORD",
        },
    )
    r = client.post(
        f"/api/v1/contracts/{cid}/witness/verify",
        json={
            "otp": "111111",
            "mobile": "09120000001",
            "national_code": "007",
            "salt": "",
            "witness_type": "LANDLORD",
        },
    )
    assert r.status_code == 400
    data = r.json()
    _assert_error_envelope(data, code="OTP_INVALID_OR_EXPIRED")


def test_generic_server_error(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    import app.services.v1.contract_flow_service as cfs

    def boom() -> None:
        raise RuntimeError("simulated failure")

    monkeypatch.setattr(cfs, "get_store", boom)
    r = client.get("/api/v1/contracts/list")
    assert r.status_code == 500
    data = r.json()
    _assert_error_envelope(data, code="INTERNAL_ERROR")


def test_x_request_id_header_echo(client: TestClient) -> None:
    r = client.get(
        "/api/v1/contracts/contract-missing",
        headers={"X-Request-Id": "custom-req-id-1"},
    )
    assert r.status_code == 404
    assert r.headers.get("X-Request-Id") == "custom-req-id-1"
    assert r.json()["request_id"] == "custom-req-id-1"
