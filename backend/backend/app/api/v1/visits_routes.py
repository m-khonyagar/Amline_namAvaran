from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy.orm import Session

from app.core.errors import AmlineError
from app.core.n8n_outbound import n8n_dispatch
from app.core.rbac_deps import require_permission
from app.db.session import get_db
from app.integrations.temporal_workflows import schedule_visit_workflow
from app.models.visit import VisitStatus
from app.repositories.listing_repository import ListingRepository
from app.repositories.v1.p1_repositories import CrmV1Repository, VisitRepository
from app.schemas.v1.visits import (
    VisitCreate,
    VisitListResponse,
    VisitOutcomeBody,
    VisitRead,
    VisitScheduleBody,
)

router = APIRouter(prefix="/visits", tags=["visits"])


@router.get("", response_model=VisitListResponse)
def list_visits(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    listing_id: Optional[str] = None,
    crm_lead_id: Optional[str] = None,
    status: Optional[VisitStatus] = None,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("visits:read")),
) -> VisitListResponse:
    repo = VisitRepository(db)
    rows, total = repo.list_visits(
        skip=skip,
        limit=limit,
        listing_id=listing_id,
        crm_lead_id=crm_lead_id,
        status=status,
    )
    return VisitListResponse(
        items=[VisitRead.model_validate(r) for r in rows],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("", response_model=VisitRead, status_code=201)
def create_visit(
    body: VisitCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("visits:write")),
) -> VisitRead:
    if body.listing_id:
        lr = ListingRepository(db)
        if not lr.get(body.listing_id):
            raise AmlineError(
                "RESOURCE_NOT_FOUND",
                "آگهی یافت نشد.",
                status_code=404,
                details={"entity": "listing"},
            )
    if body.crm_lead_id:
        cr = CrmV1Repository(db)
        if not cr.get_lead(body.crm_lead_id):
            raise AmlineError(
                "RESOURCE_NOT_FOUND",
                "لید یافت نشد.",
                status_code=404,
                details={"entity": "crm_lead"},
            )
    repo = VisitRepository(db)
    row = repo.create(body)
    db.commit()
    db.refresh(row)
    background_tasks.add_task(
        n8n_dispatch,
        "visit.created",
        {
            "visit_id": row.id,
            "listing_id": row.listing_id,
            "crm_lead_id": row.crm_lead_id,
            "status": row.status.value if row.status else None,
        },
    )
    background_tasks.add_task(
        schedule_visit_workflow,
        row.id,
        {"listing_id": row.listing_id, "crm_lead_id": row.crm_lead_id},
    )
    return VisitRead.model_validate(row)


@router.get("/{visit_id}", response_model=VisitRead)
def get_visit(
    visit_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("visits:read")),
) -> VisitRead:
    repo = VisitRepository(db)
    row = repo.get(visit_id)
    if not row:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "بازدید یافت نشد.",
            status_code=404,
            details={"entity": "visit", "visit_id": visit_id},
        )
    return VisitRead.model_validate(row)


@router.post("/{visit_id}/schedule", response_model=VisitRead)
def schedule_visit(
    visit_id: str,
    body: VisitScheduleBody,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("visits:write")),
) -> VisitRead:
    repo = VisitRepository(db)
    row = repo.get(visit_id)
    if not row:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "بازدید یافت نشد.",
            status_code=404,
            details={"entity": "visit", "visit_id": visit_id},
        )
    repo.schedule(row, body.scheduled_at)
    db.commit()
    db.refresh(row)
    return VisitRead.model_validate(row)


@router.post("/{visit_id}/outcome", response_model=VisitRead)
def visit_outcome(
    visit_id: str,
    body: VisitOutcomeBody,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("visits:write")),
) -> VisitRead:
    repo = VisitRepository(db)
    row = repo.get(visit_id)
    if not row:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "بازدید یافت نشد.",
            status_code=404,
            details={"entity": "visit", "visit_id": visit_id},
        )
    repo.complete(row, body.outcome, body.outcome_notes)
    db.commit()
    db.refresh(row)
    return VisitRead.model_validate(row)
