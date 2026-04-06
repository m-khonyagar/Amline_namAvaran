"""Property-based tests for CRM Stats (task 4.2).

Uses Hypothesis to verify universal properties across many inputs.
Tag format: # Feature: crm-backend-integration, Property N: <description>
"""
from __future__ import annotations

import uuid

from fastapi.testclient import TestClient
from hypothesis import given, settings
from hypothesis import strategies as st

from app.main import app


# ─────────────────────────── shared helpers ──────────────────────────────────

def _register_and_login(client: TestClient) -> dict:
    """Register a new user via OTP flow and return auth headers."""
    mobile = "09" + uuid.uuid4().hex[:9]
    r = client.post("/auth/send-otp", json={"mobile": mobile})
    assert r.status_code == 200
    code = r.json().get("dev_code")
    r = client.post("/auth/verify-otp", json={"mobile": mobile, "code": code})
    assert r.status_code == 200
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ─────────────────────────── Property 11 ─────────────────────────────────────

# Feature: crm-backend-integration, Property 11: صحت محاسبه active_leads در آمار
# Validates: Requirements 7.1, 7.3

_p11_client: TestClient | None = None
_p11_headers: dict | None = None


def _get_p11_fixtures():
    global _p11_client, _p11_headers
    if _p11_client is None:
        _p11_client = TestClient(app)
        _p11_client.__enter__()
        _p11_headers = _register_and_login(_p11_client)
    return _p11_client, _p11_headers


@given(
    statuses=st.lists(
        st.sampled_from(["NEW", "CONTACTED", "NEGOTIATING", "CONTRACTED", "LOST"]),
        min_size=1,
        max_size=10,
    )
)
@settings(max_examples=10, deadline=None)
def test_active_leads_count_in_stats(statuses: list[str]) -> None:
    """For any set of leads with random statuses, active_leads in GET /admin/crm/stats
    must be >= count of non-terminal (not LOST, not CONTRACTED) leads created in this test.

    **Validates: Requirements 7.1, 7.3**
    """
    client, headers = _get_p11_fixtures()

    # Create leads with the given statuses
    created_ids: list[str] = []
    for status in statuses:
        r = client.post(
            "/admin/crm/leads",
            json={
                "full_name": f"لید آزمایشی {uuid.uuid4().hex[:6]}",
                "mobile": "09" + uuid.uuid4().hex[:9],
                "need_type": "RENT",
                "status": status,
            },
            headers=headers,
        )
        assert r.status_code == 201, f"Expected 201 creating lead, got {r.status_code}: {r.text}"
        created_ids.append(r.json()["id"])

    # Count how many of the created leads are "active" (not LOST, not CONTRACTED)
    active_count_created = sum(
        1 for s in statuses if s not in ("LOST", "CONTRACTED")
    )

    # Call GET /admin/crm/stats
    r = client.get("/admin/crm/stats", headers=headers)
    assert r.status_code == 200, f"Expected 200 from GET stats, got {r.status_code}: {r.text}"
    data = r.json()

    assert "active_leads" in data, f"Response missing 'active_leads' field: {data}"
    reported_active = data["active_leads"]

    # DB may have other leads from other tests, so assert >= not ==
    assert reported_active >= active_count_created, (
        f"Expected active_leads >= {active_count_created} (created in this test), "
        f"but got active_leads={reported_active}. "
        f"Statuses used: {statuses}"
    )
