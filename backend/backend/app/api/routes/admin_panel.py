"""Admin panel endpoints — RBAC, audit, activity, metrics, CRM, sessions, notifications."""
from __future__ import annotations

import datetime as dt
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.authz import require_admin_or_moderator
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.contract_wizard import WizardContract
from app.models.crm import CrmActivity, CrmActivityType, CrmLead, CrmLeadSource
from app.models.crm_lead import CrmTask
from app.models.notification import Notification
from app.models.role import Role
from app.models.user import User, UserRole
from app.schemas.crm import (
    CrmConversionReport,
    CrmStatsResponse,
    CrmTaskCreateBody,
    CrmTaskOut,
    CrmTaskPatchBody,
)

router = APIRouter()

# ─────────────────────────── constants ──────────────────────────

FULL_ADMIN_PERMS: List[str] = [
    "contracts:read", "contracts:write",
    "users:read", "users:write",
    "ads:read", "ads:write",
    "wallets:read", "wallets:write",
    "settings:read", "settings:write",
    "audit:read", "roles:read", "roles:write",
    "reports:read", "notifications:read",
    "crm:read", "crm:write",
]

ROLE_PERMISSIONS: Dict[str, List[str]] = {
    "Admin": FULL_ADMIN_PERMS,
    "Moderator": [
        "contracts:read", "contracts:write",
        "users:read", "crm:read", "crm:write",
        "reports:read", "notifications:read",
    ],
    "Agent": ["contracts:read", "contracts:write", "crm:read", "crm:write"],
    "User": ["contracts:read", "contracts:write"],
}


def _user_permissions(user: User) -> List[str]:
    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    return ROLE_PERMISSIONS.get(role_val, [])


def _seed_default_roles(db: Session) -> None:
    if db.query(Role).count() > 0:
        return
    defaults = [
        Role(name="مدیر کامل", description="دسترسی به همه ماژول‌ها", permissions=FULL_ADMIN_PERMS),
        Role(name="پشتیبانی", description="مشاهده قرارداد و CRM", permissions=ROLE_PERMISSIONS["Moderator"]),
        Role(name="سوپروایزر", description="نظارت و گزارش", permissions=[
            "contracts:read", "users:read", "audit:read",
            "reports:read", "wallets:read", "notifications:read",
        ]),
    ]
    db.add_all(defaults)
    db.commit()


# ─────────────────────────── /auth/me ───────────────────────────

@router.get("/auth/me")
def auth_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    return {
        "id": str(user.id),
        "mobile": user.mobile,
        "full_name": user.name,
        "role": role_val,
        "role_id": f"role-{role_val.lower()}",
        "permissions": _user_permissions(user),
    }


# ─────────────────────────── heartbeat ──────────────────────────

@router.post("/auth/heartbeat")
def heartbeat(_: User = Depends(get_current_user)):
    return {"ok": "true"}


# ─────────────────────────── users (admin) ──────────────────────

@router.get("/users")
def admin_users_list(
    skip: int = 0,
    limit: int = 50,
    _: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
):
    total = db.query(func.count(User.id)).scalar() or 0
    users = db.query(User).offset(skip).limit(limit).all()
    data = [
        {
            "id": str(u.id),
            "mobile": u.mobile,
            "full_name": u.name,
            "role": u.role.value if hasattr(u.role, "value") else str(u.role),
            "permissions": _user_permissions(u),
        }
        for u in users
    ]
    return {"total_count": total, "start_index": skip, "end_index": skip + len(data), "data": data}


@router.get("/users/{user_id}")
def admin_user_get(
    user_id: str,
    _: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
):
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_user_id")
    u = db.get(User, uid)
    if not u:
        raise HTTPException(status_code=404, detail="user_not_found")
    return {
        "id": str(u.id),
        "mobile": u.mobile,
        "full_name": u.name,
        "role": u.role.value if hasattr(u.role, "value") else str(u.role),
        "permissions": _user_permissions(u),
    }


# ─────────────────────────── roles ──────────────────────────────

class RoleCreateBody(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: List[str] = []


class RolePatchBody(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[List[str]] = None


@router.get("/roles")
def roles_list(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _seed_default_roles(db)
    roles = db.query(Role).all()
    return [
        {"id": str(r.id), "name": r.name, "description": r.description, "permissions": r.permissions}
        for r in roles
    ]


@router.post("/roles", status_code=201)
def roles_create(
    body: RoleCreateBody,
    _: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
):
    r = Role(name=body.name, description=body.description or "", permissions=body.permissions)
    db.add(r)
    db.commit()
    db.refresh(r)
    return {"id": str(r.id), "name": r.name, "description": r.description, "permissions": r.permissions}


@router.patch("/roles/{role_id}")
def roles_patch(
    role_id: str,
    body: RolePatchBody,
    _: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
):
    try:
        rid = uuid.UUID(role_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_role_id")
    r = db.get(Role, rid)
    if not r:
        raise HTTPException(status_code=404, detail="role_not_found")
    if body.name is not None:
        r.name = body.name
    if body.description is not None:
        r.description = body.description
    if body.permissions is not None:
        r.permissions = body.permissions
    db.commit()
    db.refresh(r)
    return {"id": str(r.id), "name": r.name, "description": r.description, "permissions": r.permissions}


# ─────────────────────────── audit ──────────────────────────────

class AuditCreateBody(BaseModel):
    action: str
    entity: str
    metadata: Optional[Dict[str, Any]] = None
    user_id: Optional[str] = None


@router.post("/audit", status_code=201)
def audit_create(
    body: AuditCreateBody,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    uid = body.user_id or str(user.id)
    ip = request.client.host if request.client else None
    log = AuditLog(
        user_id=uid,
        action=f"{body.entity}.{body.action}",
        ip_address=ip,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {
        "id": str(log.id),
        "user_id": log.user_id,
        "action": body.action,
        "entity": body.entity,
        "metadata": body.metadata or {},
        "created_at": log.timestamp.isoformat(),
    }


@router.get("/audit")
def audit_list(
    skip: int = 0,
    limit: int = 50,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    limit = min(max(limit, 1), 200)
    total = db.query(func.count(AuditLog.id)).scalar() or 0
    items = (
        db.query(AuditLog)
        .order_by(AuditLog.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": [
            {
                "id": str(l.id),
                "user_id": l.user_id,
                "action": l.action.split(".")[-1] if "." in l.action else l.action,
                "entity": l.action.split(".")[0] if "." in l.action else l.action,
                "metadata": {},
                "created_at": l.timestamp.isoformat(),
            }
            for l in items
        ],
    }


# ─────────────────────────── activity ───────────────────────────

@router.get("/staff/activity")
def staff_activity(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    user_id: Optional[str] = None,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(
        AuditLog.user_id,
        func.date(AuditLog.timestamp).label("date"),
        func.count(AuditLog.id).label("event_count"),
    ).group_by(AuditLog.user_id, func.date(AuditLog.timestamp))

    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    if from_date:
        q = q.filter(func.date(AuditLog.timestamp) >= from_date)
    if to_date:
        q = q.filter(func.date(AuditLog.timestamp) <= to_date)

    rows = q.order_by(func.date(AuditLog.timestamp).desc()).all()
    items = [
        {"user_id": r.user_id, "date": str(r.date), "event_count": r.event_count}
        for r in rows
    ]
    return {"items": items, "total": len(items)}


# ─────────────────────────── sessions ───────────────────────────

@router.get("/sessions")
def sessions_list(
    skip: int = 0,
    limit: int = 50,
    _: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
):
    total = (
        db.query(func.count(AuditLog.id))
        .filter(AuditLog.action == "auth.login")
        .scalar() or 0
    )
    items = (
        db.query(AuditLog)
        .filter(AuditLog.action == "auth.login")
        .order_by(AuditLog.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": [
            {
                "id": str(l.id),
                "user_id": l.user_id,
                "started_at": l.timestamp.isoformat(),
                "last_seen_at": l.timestamp.isoformat(),
                "ip": l.ip_address or "unknown",
            }
            for l in items
        ],
    }


# ─────────────────────────── metrics ────────────────────────────

@router.get("/metrics/summary")
def metrics_summary(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = dt.date.today()
    contracts_total = db.query(func.count(WizardContract.id)).scalar() or 0
    contracts_today = (
        db.query(func.count(WizardContract.id))
        .filter(func.date(WizardContract.created_at) == today)
        .scalar() or 0
    )
    users_total = db.query(func.count(User.id)).scalar() or 0
    active_leads = (
        db.query(func.count(CrmLead.id))
        .filter(CrmLead.status.notin_(["LOST", "CONTRACTED"]))
        .scalar() or 0
    )
    audit_total = db.query(func.count(AuditLog.id)).scalar() or 0
    return {
        "contracts_total": contracts_total,
        "contracts_today": contracts_today,
        "users_total": users_total,
        "active_leads": active_leads,
        "audit_events_total": audit_total,
    }


# ─────────────────────────── notifications ──────────────────────

@router.get("/notifications")
def notifications_list(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    return {
        "items": [
            {
                "id": str(n.id),
                "title": n.type,
                "body": f"وضعیت: {n.status}",
                "read": n.status == "sent",
                "created_at": n.created_at.isoformat(),
            }
            for n in items
        ],
        "total": len(items),
    }


# ─────────────────────────── CRM ────────────────────────────────

class CrmLeadCreateBody(BaseModel):
    full_name: str
    mobile: str
    need_type: str
    status: Optional[str] = "NEW"
    notes: Optional[str] = ""
    assigned_to: Optional[str] = None
    contract_id: Optional[str] = None


class CrmLeadPatchBody(BaseModel):
    full_name: Optional[str] = None
    mobile: Optional[str] = None
    need_type: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    contract_id: Optional[str] = None


class CrmActivityBody(BaseModel):
    lead_id: str
    type: str
    note: Optional[str] = ""
    user_id: Optional[str] = None


def _lead_out(lead: CrmLead) -> Dict[str, Any]:
    src = lead.source
    return {
        "id": str(lead.id),
        "full_name": lead.full_name,
        "mobile": lead.mobile,
        "need_type": lead.need_type,
        "status": lead.status,
        "notes": lead.notes,
        "assigned_to": lead.assigned_to,
        "contract_id": lead.contract_id,
        "source": src.value if hasattr(src, "value") else str(src),
        "created_at": lead.created_at.isoformat(),
        "updated_at": (lead.updated_at or lead.created_at).isoformat(),
    }


@router.get("/crm/leads")
def crm_leads_list(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    leads = db.query(CrmLead).order_by(CrmLead.created_at.desc()).all()
    return [_lead_out(l) for l in leads]


@router.post("/crm/leads", status_code=201)
def crm_lead_create(
    body: CrmLeadCreateBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = CrmLead(
        full_name=body.full_name,
        mobile=body.mobile,
        need_type=body.need_type,
        status=body.status or "NEW",
        notes=body.notes or "",
        assigned_to=body.assigned_to,
        contract_id=body.contract_id,
        source=CrmLeadSource.MANUAL,
    )
    db.add(lead)
    log = AuditLog(user_id=str(user.id), action="crm.lead.create")
    db.add(log)
    db.commit()
    db.refresh(lead)
    return _lead_out(lead)


@router.get("/crm/leads/{lead_id}")
def crm_lead_get(
    lead_id: str,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        lid = uuid.UUID(lead_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_lead_id")
    lead = db.get(CrmLead, str(lid))
    if not lead:
        raise HTTPException(status_code=404, detail="not_found")
    return _lead_out(lead)


@router.patch("/crm/leads/{lead_id}")
def crm_lead_patch(
    lead_id: str,
    body: CrmLeadPatchBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        lid = uuid.UUID(lead_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_lead_id")
    lead = db.get(CrmLead, str(lid))
    if not lead:
        raise HTTPException(status_code=404, detail="not_found")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(lead, field, val)
    lead.updated_at = dt.datetime.now(dt.timezone.utc)
    log = AuditLog(user_id=str(user.id), action="crm.lead.update")
    db.add(log)
    db.commit()
    db.refresh(lead)
    return _lead_out(lead)


@router.get("/crm/leads/{lead_id}/activities")
def crm_activities_list(
    lead_id: str,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    acts = (
        db.query(CrmActivity)
        .filter(CrmActivity.lead_id == lead_id)
        .order_by(CrmActivity.created_at.desc())
        .all()
    )
    return [
        {
            "id": str(a.id),
            "lead_id": a.lead_id,
            "type": a.type.value if hasattr(a.type, "value") else str(a.type),
            "note": a.note,
            "content": a.note,
            "user_id": a.user_id,
            "created_by": a.user_id,
            "created_at": a.created_at.isoformat(),
        }
        for a in acts
    ]


@router.post("/crm/leads/{lead_id}/activities", status_code=201)
def crm_activity_create(
    lead_id: str,
    body: CrmActivityBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        atype = CrmActivityType(body.type)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="invalid_activity_type") from exc
    act = CrmActivity(
        lead_id=lead_id,
        type=atype,
        note=body.note or "",
        user_id=body.user_id or str(user.id),
    )
    db.add(act)
    db.commit()
    db.refresh(act)
    return {
        "id": str(act.id),
        "lead_id": act.lead_id,
        "type": act.type.value,
        "note": act.note,
        "content": act.note,
        "user_id": act.user_id,
        "created_by": act.user_id,
        "created_at": act.created_at.isoformat(),
    }


# ─────────────────────────── CRM: delete lead ───────────────────

@router.delete("/crm/leads/{lead_id}", status_code=204)
def crm_lead_delete(
    lead_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        lid = uuid.UUID(lead_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_lead_id")
    lead = db.get(CrmLead, str(lid))
    if not lead:
        raise HTTPException(status_code=404, detail="not_found")
    db.delete(lead)
    log = AuditLog(user_id=str(user.id), action="crm.lead.delete")
    db.add(log)
    db.commit()


# ─────────────────────────── CRM: tasks ─────────────────────────

def _task_out(task: CrmTask) -> Dict[str, Any]:
    return {
        "id": str(task.id),
        "lead_id": task.lead_id,
        "title": task.title,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "done": task.done,
        "created_at": task.created_at.isoformat(),
    }


@router.get("/crm/leads/{lead_id}/tasks")
def crm_tasks_list(
    lead_id: str,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tasks = (
        db.query(CrmTask)
        .filter(CrmTask.lead_id == lead_id)
        .order_by(CrmTask.created_at.asc())
        .all()
    )
    return [_task_out(t) for t in tasks]


@router.post("/crm/leads/{lead_id}/tasks", status_code=201)
def crm_task_create(
    lead_id: str,
    body: CrmTaskCreateBody,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    due = None
    if body.due_date:
        due = dt.date.fromisoformat(body.due_date)
    task = CrmTask(
        lead_id=lead_id,
        title=body.title,
        due_date=due,
        done=False,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _task_out(task)


@router.patch("/crm/leads/{lead_id}/tasks/{task_id}")
def crm_task_patch(
    lead_id: str,
    task_id: str,
    body: CrmTaskPatchBody,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        tid = uuid.UUID(task_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_task_id")
    task = db.query(CrmTask).filter(CrmTask.id == tid, CrmTask.lead_id == lead_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="not_found")
    if body.title is not None:
        task.title = body.title
    if body.due_date is not None:
        task.due_date = dt.date.fromisoformat(body.due_date)
    if body.done is not None:
        task.done = body.done
    db.commit()
    db.refresh(task)
    return _task_out(task)


@router.delete("/crm/leads/{lead_id}/tasks/{task_id}", status_code=204)
def crm_task_delete(
    lead_id: str,
    task_id: str,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        tid = uuid.UUID(task_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_task_id")
    task = db.query(CrmTask).filter(CrmTask.id == tid, CrmTask.lead_id == lead_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="not_found")
    db.delete(task)
    db.commit()


# ─────────────────────────── CRM: stats ─────────────────────────

@router.get("/crm/stats", response_model=CrmStatsResponse)
def crm_stats(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = dt.date.today()
    month_start = today.replace(day=1)

    total_leads = db.query(func.count(CrmLead.id)).scalar() or 0
    contracted_leads = (
        db.query(func.count(CrmLead.id))
        .filter(CrmLead.status == "CONTRACTED")
        .scalar() or 0
    )
    lost_leads = (
        db.query(func.count(CrmLead.id))
        .filter(CrmLead.status == "LOST")
        .scalar() or 0
    )
    active_leads = (
        db.query(func.count(CrmLead.id))
        .filter(CrmLead.status.notin_(["LOST", "CONTRACTED"]))
        .scalar() or 0
    )
    leads_this_month = (
        db.query(func.count(CrmLead.id))
        .filter(func.date(CrmLead.created_at) >= month_start)
        .scalar() or 0
    )
    conversion_rate = int(contracted_leads / total_leads * 100) if total_leads > 0 else 0

    return CrmStatsResponse(
        active_leads=active_leads,
        contracted_leads=contracted_leads,
        total_leads=total_leads,
        conversion_rate=conversion_rate,
        leads_this_month=leads_this_month,
        lost_leads=lost_leads,
    )


# ─────────────────────────── CRM: conversion report ─────────────

@router.get("/crm/reports/conversion", response_model=CrmConversionReport)
def crm_conversion_report(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(CrmLead)
    if from_date:
        q = q.filter(func.date(CrmLead.created_at) >= from_date)
    if to_date:
        q = q.filter(func.date(CrmLead.created_at) <= to_date)

    leads = q.all()
    total_leads = len(leads)
    converted_leads = sum(1 for l in leads if l.status == "CONTRACTED")
    lost_leads = sum(1 for l in leads if l.status == "LOST")
    conversion_rate = int(converted_leads / total_leads * 100) if total_leads > 0 else 0

    # monthly breakdown: count contracted leads per year-month
    monthly: Dict[str, int] = {}
    for lead in leads:
        if lead.status == "CONTRACTED":
            key = lead.created_at.strftime("%Y-%m")
            monthly[key] = monthly.get(key, 0) + 1

    monthly_breakdown = [
        {"month": month, "count": count}
        for month, count in sorted(monthly.items())
    ]

    return CrmConversionReport(
        total_leads=total_leads,
        converted_leads=converted_leads,
        lost_leads=lost_leads,
        conversion_rate=conversion_rate,
        monthly_breakdown=monthly_breakdown,
    )
