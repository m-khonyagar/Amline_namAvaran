from __future__ import annotations

import os
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.errors import AmlineError
from app.core.rbac_deps import require_permission
from app.db.session import get_db
from app.repositories.v1.p1_repositories import AuditDbRepository, LegalRepository
from app.schemas.v1.legal_v1 import (
    LegalDecisionBody,
    LegalReviewCreate,
    LegalReviewListResponse,
    LegalReviewRead,
)
from app.services.v1.legal_contract_hook import apply_legal_decision_to_memory_contract

router = APIRouter(prefix="/legal", tags=["legal-review"])


@router.get("/reviews", response_model=LegalReviewListResponse)
def list_legal_reviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    contract_id: Optional[str] = None,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("legal:read")),
) -> LegalReviewListResponse:
    repo = LegalRepository(db)
    rows, total = repo.list_reviews(skip=skip, limit=limit, contract_id=contract_id)
    return LegalReviewListResponse(
        items=[LegalReviewRead.model_validate(r) for r in rows],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("/reviews", response_model=LegalReviewRead, status_code=201)
def enqueue_legal_review(
    body: LegalReviewCreate,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("legal:write")),
) -> LegalReviewRead:
    repo = LegalRepository(db)
    row = repo.create(body.contract_id)
    AuditDbRepository(db).write(
        user_id=os.getenv("AMLINE_AUDIT_USER_ID", "mock-001"),
        action="legal.review.enqueue",
        entity="legal_review",
        metadata={"review_id": row.id, "contract_id": body.contract_id},
    )
    db.commit()
    db.refresh(row)
    return LegalReviewRead.model_validate(row)


@router.post("/reviews/{review_id}/decide", response_model=LegalReviewRead)
def decide_legal_review(
    review_id: str,
    body: LegalDecisionBody,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("legal:write")),
) -> LegalReviewRead:
    repo = LegalRepository(db)
    row = repo.get(review_id)
    if not row:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "پرونده حقوقی یافت نشد.",
            status_code=404,
            details={"entity": "legal_review"},
        )
    rid = body.reviewer_id or os.getenv("AMLINE_AUDIT_USER_ID", "mock-001")
    repo.decide(row, body.approve, body.comment, rid)
    apply_legal_decision_to_memory_contract(row.contract_id, body.approve)
    AuditDbRepository(db).write(
        user_id=rid,
        action="legal.review.decide",
        entity="legal_review",
        metadata={"review_id": review_id, "approve": body.approve},
    )
    db.commit()
    db.refresh(row)
    return LegalReviewRead.model_validate(row)
