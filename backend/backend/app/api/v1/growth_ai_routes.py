"""P2 — property requirements, rule-based matching, rule-based pricing."""

from __future__ import annotations

import os

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.errors import AmlineError
from app.core.rbac_deps import require_permission
from app.db.session import get_db
from app.repositories.listing_repository import ListingRepository
from app.repositories.v1.p2_repositories import (
    RequirementRepository,
    load_matchable_listings,
)
from app.schemas.v1.growth_v1 import (
    MatchSuggestionItem,
    MatchSuggestionsResponse,
    PriceEstimateResponse,
    RequirementCreate,
    RequirementRead,
)
from app.services.v1.composite_pricing import CompositePricingEngine
from app.services.v1.matching_engine import RuleBasedMatchingEngine
from app.services.v1.ml_registry import describe_ml_stack

router = APIRouter(prefix="/ai", tags=["ai-growth"])


@router.get("/ml/status")
def ml_status() -> dict:
    return describe_ml_stack()


def _owner_id(request: Request) -> str:
    return request.headers.get("X-User-Id") or os.getenv(
        "AMLINE_DEFAULT_USER_ID", "mock-001"
    )


@router.post("/requirements", response_model=RequirementRead, status_code=201)
def create_requirement(
    request: Request,
    body: RequirementCreate,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("ai:write")),
) -> RequirementRead:
    repo = RequirementRepository(db)
    row = repo.create(
        owner_user_id=_owner_id(request),
        deal_type=body.deal_type,
        budget_min=body.budget_min,
        budget_max=body.budget_max,
        location_keywords=body.location_keywords,
        title_hint=body.title_hint,
    )
    return RequirementRead.model_validate(row)


@router.get(
    "/matching/requirements/{requirement_id}/suggestions",
    response_model=MatchSuggestionsResponse,
)
def matching_suggestions(
    requirement_id: str,
    top_n: int = 20,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("ai:read")),
) -> MatchSuggestionsResponse:
    rrepo = RequirementRepository(db)
    req = rrepo.get(requirement_id)
    if not req:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "نیازمندی یافت نشد.",
            status_code=404,
            details={"entity": "requirement", "requirement_id": requirement_id},
        )
    listings = load_matchable_listings(db, limit=500)
    engine = RuleBasedMatchingEngine()
    ranked = engine.rank(listings, req, top_n=min(max(top_n, 1), 100))
    return MatchSuggestionsResponse(
        requirement_id=requirement_id,
        items=[
            MatchSuggestionItem(
                listing_id=m.listing_id, score=m.score, breakdown=m.breakdown
            )
            for m in ranked
        ],
    )


@router.get(
    "/pricing/listings/{listing_id}/estimate", response_model=PriceEstimateResponse
)
def pricing_estimate(
    listing_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("ai:read")),
) -> PriceEstimateResponse:
    lrepo = ListingRepository(db)
    row = lrepo.get(listing_id)
    if not row:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "آگهی یافت نشد.",
            status_code=404,
            details={"entity": "listing", "listing_id": listing_id},
        )
    est = CompositePricingEngine().estimate(db, row)
    return PriceEstimateResponse(
        listing_id=listing_id,
        suggested_price=est.suggested_price,
        currency=est.currency,
        confidence=est.confidence,
        basis=est.basis,
        peer_sample_size=est.peer_sample_size,
    )
