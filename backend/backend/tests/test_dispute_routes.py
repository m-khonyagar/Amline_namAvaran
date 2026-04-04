"""API اختلاف قرارداد روی DB درون‌حافظهٔ تست."""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("AMLINE_OTP_DEBUG", "1")

from app.main import app  # noqa: E402

HDR = {"X-User-Permissions": "*"}


@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=True)


def test_dispute_create_list_evidence(client: TestClient) -> None:
    cid = "contract-dispute-api-1"
    r = client.post(
        f"/api/v1/contracts/{cid}/disputes",
        headers=HDR,
        json={"category": "PAYMENT", "raised_by_party_id": "p1"},
    )
    assert r.status_code == 201, r.text
    d = r.json()
    assert d["contract_id"] == cid
    assert d["status"] == "OPEN"
    did = d["id"]

    r2 = client.get(f"/api/v1/contracts/{cid}/disputes", headers=HDR)
    assert r2.status_code == 200
    assert r2.json()["total"] >= 1

    r3 = client.get(f"/api/v1/disputes/{did}", headers=HDR)
    assert r3.status_code == 200

    r4 = client.post(
        f"/api/v1/disputes/{did}/evidence",
        headers=HDR,
        json={
            "type": "AUDIT_REF",
            "storage_uri": "internal://audit/entry-1",
            "hash_sha256": "a" * 64,
        },
    )
    assert r4.status_code == 201, r4.text
    assert r4.json()["dispute_id"] == did
