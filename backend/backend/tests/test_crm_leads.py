"""Property-based tests for CRM Leads (tasks 6.2 and 6.4).

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


# ─────────────────────────── Property 5 ─────────────────────────────────────

# Feature: crm-backend-integration, Property 5: حذف لید و ناپدید شدن از لیست
# Validates: Requirements 1.9

_p5_client: TestClient | None = None
_p5_headers: dict | None = None


def _get_p5_fixtures():
    global _p5_client, _p5_headers
    if _p5_client is None:
        _p5_client = TestClient(app)
        _p5_client.__enter__()
        _p5_headers = _register_and_login(_p5_client)
    return _p5_client, _p5_headers


@given(dummy=st.just(None))
@settings(max_examples=10, deadline=None)
def test_delete_lead_disappears_from_list(dummy: None) -> None:
    """For any lead, after DELETE /admin/crm/leads/{id} (HTTP 204),
    the lead must not appear in GET /admin/crm/leads.

    **Validates: Requirements 1.9**
    """
    client, headers = _get_p5_fixtures()

    # Create a lead
    r = client.post(
        "/admin/crm/leads",
        json={
            "full_name": f"لید حذفی {uuid.uuid4().hex[:6]}",
            "mobile": "09" + uuid.uuid4().hex[:9],
            "need_type": "BUY",
        },
        headers=headers,
    )
    assert r.status_code == 201, f"Expected 201 creating lead, got {r.status_code}: {r.text}"
    lead_id = r.json()["id"]

    # Delete the lead
    r = client.delete(f"/admin/crm/leads/{lead_id}", headers=headers)
    assert r.status_code == 204, (
        f"Expected 204 from DELETE lead, got {r.status_code}: {r.text}"
    )

    # Assert lead no longer appears in GET list
    r = client.get("/admin/crm/leads", headers=headers)
    assert r.status_code == 200, f"Expected 200 from GET leads, got {r.status_code}: {r.text}"
    lead_ids = [l["id"] for l in r.json()]
    assert lead_id not in lead_ids, (
        f"Deleted lead {lead_id} still appears in GET /admin/crm/leads list"
    )


# ─────────────────────────── Property 6 ─────────────────────────────────────

# Feature: crm-backend-integration, Property 6: round-trip فعالیت (ایجاد و دریافت)
# Validates: Requirements 2.2, 2.5, 11.1, 11.2

_p6_client: TestClient | None = None
_p6_headers: dict | None = None
_p6_lead_id: str | None = None
_p6_user_id: str | None = None


def _get_p6_fixtures():
    global _p6_client, _p6_headers, _p6_lead_id, _p6_user_id
    if _p6_client is None:
        _p6_client = TestClient(app)
        _p6_client.__enter__()
        _p6_headers = _register_and_login(_p6_client)

        # Get the user_id from /admin/auth/me
        r = _p6_client.get("/admin/auth/me", headers=_p6_headers)
        assert r.status_code == 200, f"Failed to get user info: {r.text}"
        _p6_user_id = r.json()["id"]

        # Create a lead to attach activities to
        r = _p6_client.post(
            "/admin/crm/leads",
            json={
                "full_name": "تست فعالیت",
                "mobile": "09" + uuid.uuid4().hex[:9],
                "need_type": "SELL",
            },
            headers=_p6_headers,
        )
        assert r.status_code == 201, f"Failed to create lead: {r.text}"
        _p6_lead_id = r.json()["id"]
    return _p6_client, _p6_headers, _p6_lead_id, _p6_user_id


@given(
    note=st.text(
        min_size=1,
        max_size=200,
        alphabet=st.characters(whitelist_categories=("L", "N", "P", "Z")),
    )
)
@settings(max_examples=10, deadline=None)
def test_activity_round_trip(note: str) -> None:
    """For any lead and any note text, after POST /admin/crm/leads/{lead_id}/activities,
    the activity must appear in GET /admin/crm/leads/{lead_id}/activities
    with content == note and created_by == user_id.

    **Validates: Requirements 2.2, 2.5, 11.1, 11.2**
    """
    client, headers, lead_id, user_id = _get_p6_fixtures()

    # Create activity
    r = client.post(
        f"/admin/crm/leads/{lead_id}/activities",
        json={"lead_id": lead_id, "type": "NOTE", "note": note},
        headers=headers,
    )
    assert r.status_code == 201, (
        f"Expected 201 creating activity, got {r.status_code}: {r.text}"
    )
    created = r.json()
    activity_id = created["id"]

    # Assert content and created_by on the creation response
    assert created.get("content") == note, (
        f"Expected content={note!r} in creation response, got content={created.get('content')!r}"
    )
    assert created.get("created_by") == user_id, (
        f"Expected created_by={user_id!r} in creation response, "
        f"got created_by={created.get('created_by')!r}"
    )

    # Fetch activities list and verify the activity appears with correct fields
    r = client.get(f"/admin/crm/leads/{lead_id}/activities", headers=headers)
    assert r.status_code == 200, (
        f"Expected 200 from GET activities, got {r.status_code}: {r.text}"
    )
    activities = r.json()
    matching = [a for a in activities if a["id"] == activity_id]
    assert len(matching) == 1, (
        f"Expected exactly 1 activity with id={activity_id} in GET list, "
        f"found {len(matching)}"
    )
    act = matching[0]
    assert act.get("content") == note, (
        f"Expected content={note!r} in GET list, got content={act.get('content')!r}"
    )
    assert act.get("created_by") == user_id, (
        f"Expected created_by={user_id!r} in GET list, "
        f"got created_by={act.get('created_by')!r}"
    )
