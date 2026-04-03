from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter

from app.core.errors import AmlineError
from app.repositories.memory.state import get_store
from app.schemas.v1.payloads import AuditCreateBody, RoleCreateBody, RolePatchBody

router = APIRouter(tags=["admin"])


@router.get("/admin/users")
def admin_users() -> dict:
    s = get_store()
    u = s.mock_user
    return {
        "total_count": 1,
        "start_index": 0,
        "end_index": 1,
        "data": [u],
    }


@router.get("/admin/users/{user_id}")
def admin_user(user_id: str) -> dict:
    return get_store().mock_user


@router.get("/admin/roles")
def admin_roles_list() -> List[dict]:
    return list(get_store().roles)


@router.post("/admin/roles", status_code=201)
def admin_roles_create(body: RoleCreateBody) -> dict:
    s = get_store()
    rid = f"role-{len(s.roles) + 1}"
    row = {
        "id": rid,
        "name": body.name,
        "description": body.description or "",
        "permissions": list(body.permissions),
    }
    s.roles.append(row)
    return row


@router.patch("/admin/roles/{role_id}")
def admin_roles_patch(role_id: str, body: RolePatchBody) -> dict:
    s = get_store()
    for r in s.roles:
        if r["id"] == role_id:
            if body.name is not None:
                r["name"] = body.name
            if body.description is not None:
                r["description"] = body.description
            if body.permissions is not None:
                r["permissions"] = list(body.permissions)
            return r
    raise AmlineError(
        "RESOURCE_NOT_FOUND",
        "نقش یافت نشد.",
        status_code=404,
        details={"entity": "role", "role_id": role_id},
    )


@router.post("/admin/audit", status_code=201)
def admin_audit_create(body: AuditCreateBody) -> dict:
    s = get_store()
    uid = body.user_id or s.mock_user["id"]
    return s.audit_event(uid, body.action, body.entity, body.metadata)


@router.get("/admin/audit")
def admin_audit_list(skip: int = 0, limit: int = 50) -> dict:
    s = get_store()
    if skip < 0:
        skip = 0
    if limit < 1 or limit > 200:
        limit = 50
    total = len(s.audit_logs)
    items = s.audit_logs[skip : skip + limit]
    return {"total": total, "items": items, "skip": skip, "limit": limit}


@router.post("/admin/auth/heartbeat")
def admin_auth_heartbeat() -> dict:
    return {"ok": "true"}


@router.get("/admin/staff/activity")
def admin_staff_activity(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    user_id: Optional[str] = None,
) -> dict:
    s = get_store()
    rows: List[dict] = []
    for key, cnt in s.activity_by_user_day.items():
        parts = key.split(":", 1)
        if len(parts) != 2:
            continue
        uid, day = parts[0], parts[1]
        if user_id and uid != user_id:
            continue
        if from_date and day < from_date:
            continue
        if to_date and day > to_date:
            continue
        rows.append({"user_id": uid, "date": day, "event_count": cnt})
    rows.sort(key=lambda x: (x["date"], x["user_id"]), reverse=True)
    return {"items": rows, "total": len(rows)}


@router.get("/admin/sessions")
def admin_sessions_list(skip: int = 0, limit: int = 50) -> dict:
    s = get_store()
    total = len(s.sessions_store)
    items = s.sessions_store[skip : skip + limit]
    return {"total": total, "items": items, "skip": skip, "limit": limit}


@router.get("/admin/metrics/summary")
def admin_metrics_summary() -> dict:
    s = get_store()
    today = datetime.now(timezone.utc).date().isoformat()
    contracts_today = sum(
        1 for c in s.contracts.values() if str(c.get("created_at", ""))[:10] == today
    )
    return {
        "contracts_total": len(s.contracts),
        "users_total": 1,
        "active_leads": 3,
        "contracts_today": contracts_today,
        "audit_events_total": len(s.audit_logs),
    }


@router.get("/admin/notifications")
def admin_notifications_list() -> dict:
    s = get_store()
    return {"items": list(s.notifications_store), "total": len(s.notifications_store)}
