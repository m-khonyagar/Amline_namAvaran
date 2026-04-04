"""API اختلاف برای قراردادهای New Flow (شناسهٔ رشته‌ای)."""

from __future__ import annotations

import os

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.errors import AmlineError
from app.core.rbac_deps import require_permission
from app.db.session import get_db
from app.models.dispute import DisputeCategory, DisputeEvidenceType
from app.repositories.v1.dispute_repository import DisputeRepository
from app.repositories.v1.p1_repositories import AuditDbRepository
from app.schemas.v1.dispute_v1 import (
    DisputeCreate,
    DisputeEvidenceCreate,
    DisputeEvidenceRead,
    DisputeListResponse,
    DisputeRead,
)

router = APIRouter(tags=["contract-disputes"])


@router.post(
    "/contracts/{contract_id}/disputes",
    response_model=DisputeRead,
    status_code=status.HTTP_201_CREATED,
)
def create_contract_dispute(
    contract_id: str,
    body: DisputeCreate,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("contracts:write")),
) -> DisputeRead:
    repo = DisputeRepository(db)
    cat = DisputeCategory(body.category.value)
    row = repo.create(
        contract_id,
        raised_by_party_id=body.raised_by_party_id,
        category=cat,
    )
    AuditDbRepository(db).write(
        user_id=os.getenv("AMLINE_AUDIT_USER_ID", "mock-001"),
        action="contract.dispute.opened",
        entity="contract_dispute",
        metadata={"dispute_id": row.id, "contract_id": contract_id},
    )
    db.commit()
    db.refresh(row)
    return DisputeRead.model_validate(row)


@router.get(
    "/contracts/{contract_id}/disputes",
    response_model=DisputeListResponse,
)
def list_contract_disputes(
    contract_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("contracts:read")),
) -> DisputeListResponse:
    repo = DisputeRepository(db)
    rows, total = repo.list_for_contract(contract_id)
    return DisputeListResponse(
        items=[DisputeRead.model_validate(r) for r in rows],
        total=total,
    )


@router.get("/disputes/{dispute_id}", response_model=DisputeRead)
def get_dispute(
    dispute_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("contracts:read")),
) -> DisputeRead:
    repo = DisputeRepository(db)
    row = repo.get(dispute_id)
    if not row:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "اختلاف یافت نشد.",
            status_code=404,
            details={"entity": "dispute"},
        )
    return DisputeRead.model_validate(row)


@router.post(
    "/disputes/{dispute_id}/evidence",
    response_model=DisputeEvidenceRead,
    status_code=status.HTTP_201_CREATED,
)
def add_dispute_evidence(
    dispute_id: str,
    body: DisputeEvidenceCreate,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("contracts:write")),
) -> DisputeEvidenceRead:
    repo = DisputeRepository(db)
    parent = repo.get(dispute_id)
    if not parent:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "اختلاف یافت نشد.",
            status_code=404,
            details={"entity": "dispute"},
        )
    ev = repo.add_evidence(
        dispute_id,
        ev_type=DisputeEvidenceType(body.type.value),
        storage_uri=body.storage_uri,
        hash_sha256=body.hash_sha256,
        submitted_by=body.submitted_by,
    )
    AuditDbRepository(db).write(
        user_id=os.getenv("AMLINE_AUDIT_USER_ID", "mock-001"),
        action="contract.dispute.evidence",
        entity="contract_dispute_evidence",
        metadata={"dispute_id": dispute_id, "evidence_id": ev.id},
    )
    db.commit()
    db.refresh(ev)
    return DisputeEvidenceRead.model_validate(ev)
