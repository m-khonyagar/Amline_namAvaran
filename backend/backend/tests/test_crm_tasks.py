"""Property-based tests for CRM Tasks (tasks 1.2 and 3.5).

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


# ─────────────────────────── Property 10 ─────────────────────────────────────

# Feature: crm-backend-integration, Property 10: round-trip وظیفه (ایجاد، toggle، حذف)
# Validates: Requirements 5.2, 5.3, 5.4

_p10_client: TestClient | None = None
_p10_headers: dict | None = None
_p10_lead_id: str | None = None


def _get_p10_fixtures():
    global _p10_client, _p10_headers, _p10_lead_id
    if _p10_client is None:
        _p10_client = TestClient(app)
        _p10_client.__enter__()
        _p10_headers = _register_and_login(_p10_client)
        r = _p10_client.post(
            "/admin/crm/leads",
            json={
                "full_name": "تست وظیفه",
                "mobile": "09" + uuid.uuid4().hex[:9],
                "need_type": "RENT",
            },
            headers=_p10_headers,
        )
        assert r.status_code == 201, f"Failed to create lead: {r.text}"
        _p10_lead_id = r.json()["id"]
    return _p10_client, _p10_headers, _p10_lead_id


@given(
    title=st.text(
        min_size=1,
        max_size=100,
        alphabet=st.characters(whitelist_categories=("L", "N", "P", "Z")),
    )
)
@settings(max_examples=10, deadline=None)
def test_task_round_trip(title: str) -> None:
    """For any lead and any random task title:
    - Created task must have done=False and appear in GET tasks list
    - After PATCH with done=True, task must have done=True
    - After DELETE, task must not appear in GET tasks list

    **Validates: Requirements 5.2, 5.3, 5.4**
    """
    client, headers, lead_id = _get_p10_fixtures()

    # 1. Create task
    r = client.post(
        f"/admin/crm/leads/{lead_id}/tasks",
        json={"title": title},
        headers=headers,
    )
    assert r.status_code == 201, f"Expected 201 creating task, got {r.status_code}: {r.text}"
    task = r.json()
    task_id = task["id"]

    # 2. Assert done=False on creation
    assert task["done"] is False, (
        f"Expected done=False on creation, got done={task['done']!r} for title={title!r}"
    )

    # 3. Assert task appears in GET list
    r = client.get(f"/admin/crm/leads/{lead_id}/tasks", headers=headers)
    assert r.status_code == 200, f"Expected 200 from GET tasks, got {r.status_code}: {r.text}"
    task_ids = [t["id"] for t in r.json()]
    assert task_id in task_ids, (
        f"Newly created task {task_id} not found in GET tasks list: {task_ids}"
    )

    # 4. PATCH done=True and assert
    r = client.patch(
        f"/admin/crm/leads/{lead_id}/tasks/{task_id}",
        json={"done": True},
        headers=headers,
    )
    assert r.status_code == 200, f"Expected 200 from PATCH task, got {r.status_code}: {r.text}"
    patched = r.json()
    assert patched["done"] is True, (
        f"Expected done=True after PATCH, got done={patched['done']!r}"
    )

    # 5. DELETE task and assert it no longer appears in GET list
    r = client.delete(
        f"/admin/crm/leads/{lead_id}/tasks/{task_id}",
        headers=headers,
    )
    assert r.status_code == 204, f"Expected 204 from DELETE task, got {r.status_code}: {r.text}"

    r = client.get(f"/admin/crm/leads/{lead_id}/tasks", headers=headers)
    assert r.status_code == 200
    remaining_ids = [t["id"] for t in r.json()]
    assert task_id not in remaining_ids, (
        f"Deleted task {task_id} still appears in GET tasks list: {remaining_ids}"
    )
