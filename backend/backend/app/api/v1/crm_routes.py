from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.errors import AmlineError
from app.repositories.memory.state import get_store
from app.schemas.v1.payloads import CrmActivityBody, CrmLeadCreateBody, CrmLeadPatchBody

router = APIRouter(tags=["crm"])


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


@router.get("/admin/crm/leads/{lead_id}/activities")
def crm_activities_list(lead_id: str) -> list:
    return list(get_store().crm_activities.get(lead_id, []))


@router.post("/admin/crm/leads/{lead_id}/activities", status_code=201)
def crm_activity_create(lead_id: str, body: CrmActivityBody) -> dict:
    s = get_store()
    row = next((l for l in s.crm_leads if l["id"] == lead_id), None)
    if not row:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "لید یافت نشد.",
            status_code=404,
            details={"entity": "lead", "lead_id": lead_id},
        )
    act = {
        "id": f"act-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        "lead_id": lead_id,
        "type": body.type,
        "note": body.note or "",
        "user_id": body.user_id or s.mock_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    s.crm_activities.setdefault(lead_id, []).append(act)
    return act
