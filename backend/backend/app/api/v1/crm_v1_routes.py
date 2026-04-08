"""DB-backed CRM (P1) — canonical `/crm/*` under `/api/v1`; legacy `/admin/crm/*` unchanged."""

from __future__ import annotations

import os
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.agency_scope import effective_agency_id
from app.core.errors import AmlineError
from app.core.n8n_outbound import n8n_dispatch
from app.core.posthog_server import posthog_capture
from app.core.rbac_deps import require_permission
from app.db.session import get_db
from app.integrations.temporal_workflows import schedule_crm_lead_workflow
from app.models.crm import CrmLead, CrmLeadSource
from app.models.geo import City, Province
from app.repositories.listing_repository import ListingRepository
from app.repositories.v1.p1_repositories import AuditDbRepository, CrmV1Repository
from app.schemas.v1.crm_v1 import (
    CrmActivityCreate,
    CrmActivityRead,
    CrmLeadCreate,
    CrmLeadListResponse,
    CrmLeadPatch,
    CrmLeadRead,
)

router = APIRouter(prefix="/crm", tags=["crm-v1"])


def _validate_lead_geo(
    db: Session, province_id: str | None, city_id: str | None
) -> None:
    if province_id:
        p = db.get(Province, province_id)
        if not p:
            raise AmlineError(
                "RESOURCE_NOT_FOUND",
                "استان یافت نشد.",
                status_code=404,
                details={"entity": "province", "province_id": province_id},
            )
    if city_id:
        c = db.get(City, city_id)
        if not c:
            raise AmlineError(
                "RESOURCE_NOT_FOUND",
                "شهر یافت نشد.",
                status_code=404,
                details={"entity": "city", "city_id": city_id},
            )
        if province_id and c.province_id != province_id:
            raise AmlineError(
                "VALIDATION_ERROR",
                "شهر با استان انتخاب‌شده هم‌خوانی ندارد.",
                status_code=422,
                details={"city_id": city_id, "province_id": province_id},
            )


def _enrich_lead_read(row: CrmLead, db: Session) -> CrmLeadRead:
    out = CrmLeadRead.model_validate(row)
    upd: dict[str, str | None] = {}
    if row.province_id:
        p = db.get(Province, row.province_id)
        upd["province_name_fa"] = p.name_fa if p else None
    if row.city_id:
        c = db.get(City, row.city_id)
        upd["city_name_fa"] = c.name_fa if c else None
    return out.model_copy(update=upd)


def _sla_hours() -> int:
    return int(os.getenv("AMLINE_CRM_SLA_HOURS", "48"))


@router.get("/leads", response_model=CrmLeadListResponse)
def list_crm_leads(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    source: Optional[CrmLeadSource] = None,
    status: Optional[str] = None,
    sla_overdue_only: bool = False,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("crm:read")),
) -> CrmLeadListResponse:
    repo = CrmV1Repository(db)
    rows, total = repo.list_leads(
        skip=skip,
        limit=limit,
        source=source,
        status=status,
        sla_overdue_only=sla_overdue_only,
        agency_id=effective_agency_id(request),
    )
    return CrmLeadListResponse(
        items=[_enrich_lead_read(r, db) for r in rows],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("/leads", response_model=CrmLeadRead, status_code=201)
def create_crm_lead(
    body: CrmLeadCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("crm:write")),
) -> CrmLeadRead:
    if body.listing_id:
        lr = ListingRepository(db)
        if not lr.get(body.listing_id):
            raise AmlineError(
                "RESOURCE_NOT_FOUND",
                "آگهی یافت نشد.",
                status_code=404,
                details={"entity": "listing", "listing_id": body.listing_id},
            )
    _validate_lead_geo(db, body.province_id, body.city_id)
    repo = CrmV1Repository(db)
    row = repo.create_lead(body, _sla_hours())
    AuditDbRepository(db).write(
        user_id=os.getenv("AMLINE_AUDIT_USER_ID", "mock-001"),
        action="crm.lead.create_db",
        entity="crm_lead",
        metadata={"lead_id": row.id},
    )
    db.commit()
    db.refresh(row)
    background_tasks.add_task(
        n8n_dispatch,
        "crm.lead.created",
        {
            "lead_id": row.id,
            "listing_id": row.listing_id,
            "source": row.source.value if row.source else None,
            "status": row.status,
        },
    )
    distinct = row.mobile or row.id
    background_tasks.add_task(
        posthog_capture,
        distinct,
        "crm_lead_created",
        {"lead_id": row.id, "listing_id": row.listing_id},
    )
    background_tasks.add_task(
        schedule_crm_lead_workflow,
        row.id,
        {"listing_id": row.listing_id, "source": row.source.value},
    )
    return _enrich_lead_read(row, db)


@router.get("/leads/{lead_id}", response_model=CrmLeadRead)
def get_crm_lead(
    lead_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("crm:read")),
) -> CrmLeadRead:
    repo = CrmV1Repository(db)
    row = repo.get_lead(lead_id)
    if not row:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "لید یافت نشد.",
            status_code=404,
            details={"entity": "crm_lead", "lead_id": lead_id},
        )
    return _enrich_lead_read(row, db)


@router.patch("/leads/{lead_id}", response_model=CrmLeadRead)
def patch_crm_lead(
    lead_id: str,
    body: CrmLeadPatch,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("crm:write")),
) -> CrmLeadRead:
    repo = CrmV1Repository(db)
    row = repo.get_lead(lead_id)
    if not row:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "لید یافت نشد.",
            status_code=404,
            details={"entity": "crm_lead", "lead_id": lead_id},
        )
    if body.listing_id:
        lr = ListingRepository(db)
        if not lr.get(body.listing_id):
            raise AmlineError(
                "RESOURCE_NOT_FOUND",
                "آگهی یافت نشد.",
                status_code=404,
                details={"entity": "listing"},
            )
    patch_keys = body.model_dump(exclude_unset=True).keys()
    if patch_keys & {"province_id", "city_id"}:
        eff_province = (
            body.province_id if "province_id" in patch_keys else row.province_id
        )
        eff_city = body.city_id if "city_id" in patch_keys else row.city_id
        _validate_lead_geo(db, eff_province, eff_city)
    repo.patch_lead(row, body)
    db.commit()
    db.refresh(row)
    return _enrich_lead_read(row, db)


@router.get("/leads/{lead_id}/activities", response_model=List[CrmActivityRead])
def list_lead_activities(
    lead_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("crm:read")),
) -> List[CrmActivityRead]:
    repo = CrmV1Repository(db)
    lead = repo.get_lead(lead_id)
    if not lead:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "لید یافت نشد.",
            status_code=404,
            details={"entity": "crm_lead", "lead_id": lead_id},
        )
    acts = repo.list_activities(lead_id)
    return [CrmActivityRead.model_validate(a) for a in acts]


@router.post(
    "/leads/{lead_id}/activities",
    response_model=CrmActivityRead,
    status_code=201,
)
def add_lead_activity(
    lead_id: str,
    body: CrmActivityCreate,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("crm:write")),
) -> CrmActivityRead:
    repo = CrmV1Repository(db)
    lead = repo.get_lead(lead_id)
    if not lead:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "لید یافت نشد.",
            status_code=404,
            details={"entity": "crm_lead", "lead_id": lead_id},
        )
    uid = body.user_id or os.getenv("AMLINE_AUDIT_USER_ID", "mock-001")
    act = repo.add_activity(lead, body, uid)
    db.commit()
    db.refresh(act)
    return CrmActivityRead.model_validate(act)
