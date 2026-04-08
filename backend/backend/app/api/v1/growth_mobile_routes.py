"""P2 — mobile client metadata and cursor pagination for listings."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.rbac_deps import require_permission
from app.db.session import get_db
from app.models.listing import ListingStatus, ListingVisibility
from app.repositories.listing_repository import ListingRepository
from app.schemas.v1.growth_v1 import ListingCursorResponse, MobileMetaResponse
from app.schemas.v1.listings import ListingRead

router = APIRouter(prefix="/mobile", tags=["mobile"])


@router.get("/meta", response_model=MobileMetaResponse)
def mobile_meta() -> MobileMetaResponse:
    return MobileMetaResponse(
        api_version="1.0.0-p2",
        default_page_size=20,
        max_page_size=100,
        pagination_style="cursor",
        features={
            "push_notifications": "placeholder_queued_via_notifications_dispatch",
            "offline_cache": "client_responsibility",
            "biometric_auth": "client_responsibility",
            "beta_onboarding": "/api/v1/onboarding/events",
            "subscriptions": "/api/v1/billing/plans",
            "theme_dark_mode": "client_tokens_optional",
        },
    )


@router.get("/listings", response_model=ListingCursorResponse)
def mobile_listings_cursor(
    response: Response,
    cursor: Optional[str] = None,
    limit: int = 20,
    visibility: Optional[ListingVisibility] = None,
    status: Optional[ListingStatus] = None,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("listings:read")),
) -> ListingCursorResponse:
    if limit < 1:
        limit = 20
    if limit > 100:
        limit = 100
    repo = ListingRepository(db)
    rows, next_c = repo.list_page_cursor(
        limit=limit, cursor_id=cursor, visibility=visibility, status=status
    )
    response.headers["Cache-Control"] = "private, max-age=30"
    response.headers["X-Amline-Api-Layer"] = "mobile-cursor"
    return ListingCursorResponse(
        items=[ListingRead.model_validate(r) for r in rows],
        next_cursor=next_c,
        limit=limit,
    )
