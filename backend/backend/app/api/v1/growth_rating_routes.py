"""P2 — ratings and aggregates."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.rbac_deps import require_permission
from app.db.session import get_db
from app.models.growth import RatingTargetType
from app.repositories.v1.p2_repositories import RatingRepository
from app.schemas.v1.growth_v1 import RatingCreate, RatingRead, RatingSummaryResponse

router = APIRouter(prefix="/ratings", tags=["ratings"])


@router.post("", response_model=RatingRead, status_code=201)
def upsert_rating(
    body: RatingCreate,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("ratings:write")),
) -> RatingRead:
    repo = RatingRepository(db)
    row = repo.upsert(
        target_type=body.target_type,
        target_id=body.target_id,
        rater_id=body.rater_id,
        stars=body.stars,
        comment=body.comment,
    )
    return RatingRead.model_validate(row)


@router.get("/summary", response_model=RatingSummaryResponse)
def rating_summary(
    target_type: RatingTargetType,
    target_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("ratings:read")),
) -> RatingSummaryResponse:
    avg, cnt = RatingRepository(db).aggregate(target_type, target_id)
    return RatingSummaryResponse(
        target_type=target_type,
        target_id=target_id,
        average_stars=round(avg, 2),
        count=cnt,
    )
