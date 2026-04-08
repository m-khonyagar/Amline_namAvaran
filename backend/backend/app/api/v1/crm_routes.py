from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Response

from app.api.deps import get_current_user
from app.core.errors import AmlineError
from app.models.user import User
from app.repositories.memory.state import get_store
from app.schemas.crm import CrmTaskCreateBody, CrmTaskPatchBody
from app.schemas.v1.payloads import CrmActivityBody, CrmLeadCreateBody, CrmLeadPatchBody

router = APIRouter(tags=["crm"])


@router.get("/admin/crm/stats")
def crm_stats() -> dict:
    """Aggregate CRM counters for admin dashboard (in-memory store, dev/tests)."""
    s = get_store()
    active = sum(
        1
        for lead in s.crm_leads
        if lead.get("status") not in ("LOST", "CONTRACTED")
    )
    return {"active_leads": active}


def _activity_out(act: dict) -> dict:
    return {
        "id": act["id"],
        "lead_id": act["lead_id"],
        "type": act["type"],
        "note": act["note"],
        "content": act["note"],
        "user_id": act["user_id"],
        "created_by": act["user_id"],
        "created_at": act["created_at"],
    }


@router.get("/admin/crm/leads")
def crm_leads_list() -> list:
    return list(get_store().crm_leads)


@router.get("/admin/crm/leads/{lead_id}")
def crm_lead_get(lead_id: str) -> dict:
    s = get_store()
    row = next((l for l in s.crm_leads if l["id"] == lead_id), None)
    if not row:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "لید یافت نشد.",
            status_code=404,
            details={"entity": "lead", "lead_id": lead_id},
        )
    return row


@router.post("/admin/crm/leads", status_code=201)
def crm_lead_create(body: CrmLeadCreateBody) -> dict:
    s = get_store()
    now = datetime.now(timezone.utc).isoformat()
    row = {
        "id": f"crm-{s.crm_seq:03d}",
        "full_name": body.full_name,
        "mobile": body.mobile,
        "need_type": body.need_type,
        "status": body.status or "NEW",
        "notes": body.notes or "",
        "assigned_to": body.assigned_to,
        "contract_id": body.contract_id,
        "created_at": now,
        "updated_at": now,
    }
    s.crm_seq += 1
    s.crm_leads.append(row)
    s.audit_event(s.mock_user["id"], "crm.lead.create", "lead", {"lead_id": row["id"]})
    return row


@router.patch("/admin/crm/leads/{lead_id}")
def crm_lead_patch(lead_id: str, body: CrmLeadPatchBody) -> dict:
    s = get_store()
    row = next((l for l in s.crm_leads if l["id"] == lead_id), None)
    if not row:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "لید یافت نشد.",
            status_code=404,
            details={"entity": "lead", "lead_id": lead_id},
        )
    patch = body.model_dump(exclude_none=True)
    row.update(patch)
    row["updated_at"] = datetime.now(timezone.utc).isoformat()
    s.audit_event(
        s.mock_user["id"], "crm.lead.update", "lead", {"lead_id": lead_id, **patch}
    )
    return row


@router.delete("/admin/crm/leads/{lead_id}")
def crm_lead_delete(lead_id: str) -> Response:
    s = get_store()
    idx = next((i for i, l in enumerate(s.crm_leads) if l["id"] == lead_id), None)
    if idx is None:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "لید یافت نشد.",
            status_code=404,
            details={"entity": "lead", "lead_id": lead_id},
        )
    s.crm_leads.pop(idx)
    s.crm_activities.pop(lead_id, None)
    s.audit_event(s.mock_user["id"], "crm.lead.delete", "lead", {"lead_id": lead_id})
    return Response(status_code=204)


def _crm_lead_row(lead_id: str) -> dict | None:
    return next((l for l in get_store().crm_leads if l["id"] == lead_id), None)


@router.get("/admin/crm/leads/{lead_id}/tasks")
def crm_tasks_list(lead_id: str) -> list:
    if not _crm_lead_row(lead_id):
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "لید یافت نشد.",
            status_code=404,
            details={"entity": "lead", "lead_id": lead_id},
        )
    s = get_store()
    return list(s.crm_tasks_by_lead.get(lead_id, []))


@router.post("/admin/crm/leads/{lead_id}/tasks", status_code=201)
def crm_task_create(lead_id: str, body: CrmTaskCreateBody) -> dict:
    if not _crm_lead_row(lead_id):
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "لید یافت نشد.",
            status_code=404,
            details={"entity": "lead", "lead_id": lead_id},
        )
    s = get_store()
    now = datetime.now(timezone.utc).isoformat()
    tid = f"task-{s.crm_task_seq:04d}"
    s.crm_task_seq += 1
    row = {
        "id": tid,
        "lead_id": lead_id,
        "title": body.title,
        "due_date": body.due_date,
        "done": False,
        "created_at": now,
    }
    s.crm_tasks_by_lead.setdefault(lead_id, []).append(row)
    return row


@router.patch("/admin/crm/leads/{lead_id}/tasks/{task_id}")
def crm_task_patch(lead_id: str, task_id: str, body: CrmTaskPatchBody) -> dict:
    if not _crm_lead_row(lead_id):
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "لید یافت نشد.",
            status_code=404,
            details={"entity": "lead", "lead_id": lead_id},
        )
    s = get_store()
    bucket = s.crm_tasks_by_lead.get(lead_id, [])
    row = next((t for t in bucket if t["id"] == task_id), None)
    if not row:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "وظیفه یافت نشد.",
            status_code=404,
            details={"entity": "task", "task_id": task_id},
        )
    if body.title is not None:
        row["title"] = body.title
    if body.due_date is not None:
        row["due_date"] = body.due_date
    if body.done is not None:
        row["done"] = body.done
    return row


@router.delete("/admin/crm/leads/{lead_id}/tasks/{task_id}", status_code=204)
def crm_task_delete(lead_id: str, task_id: str) -> Response:
    if not _crm_lead_row(lead_id):
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "لید یافت نشد.",
            status_code=404,
            details={"entity": "lead", "lead_id": lead_id},
        )
    s = get_store()
    bucket = s.crm_tasks_by_lead.get(lead_id, [])
    idx = next((i for i, t in enumerate(bucket) if t["id"] == task_id), None)
    if idx is None:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "وظیفه یافت نشد.",
            status_code=404,
            details={"entity": "task", "task_id": task_id},
        )
    bucket.pop(idx)
    return Response(status_code=204)


@router.get("/admin/crm/leads/{lead_id}/activities")
def crm_activities_list(lead_id: str) -> list:
    raw = get_store().crm_activities.get(lead_id, [])
    return [_activity_out(a) for a in raw]


@router.post("/admin/crm/leads/{lead_id}/activities", status_code=201)
def crm_activity_create(
    lead_id: str,
    body: CrmActivityBody,
    user: User = Depends(get_current_user),
) -> dict:
    s = get_store()
    eff_lead_id = body.lead_id or lead_id
    row = next((l for l in s.crm_leads if l["id"] == eff_lead_id), None)
    if not row:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "لید یافت نشد.",
            status_code=404,
            details={"entity": "lead", "lead_id": eff_lead_id},
        )
    uid = body.user_id or str(user.id)
    act = {
        "id": f"act-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        "lead_id": eff_lead_id,
        "type": body.type,
        "note": body.note or "",
        "user_id": uid,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    s.crm_activities.setdefault(eff_lead_id, []).append(act)
    return _activity_out(act)
