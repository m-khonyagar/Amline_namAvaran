from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.agency_scope import effective_agency_id
from app.core.errors import AmlineError
from app.db.session import get_db
from app.integrations.listing_search_sync import sync_listing_to_external_search
from app.models.listing import ListingStatus, ListingVisibility
from app.repositories.listing_repository import ListingRepository
from app.schemas.v1.listings import (
    ListingCreate,
    ListingListResponse,
    ListingRead,
    ListingUpdate,
)

router = APIRouter(prefix="/listings", tags=["listings"])


def _repo(db: Session = Depends(get_db)) -> ListingRepository:
    return ListingRepository(db)


@router.get("", response_model=ListingListResponse)
def list_listings(
    request: Request,
    skip: int = 0,
    limit: int = 50,
    visibility: Optional[ListingVisibility] = None,
    status: Optional[ListingStatus] = None,
    repo: ListingRepository = Depends(_repo),
) -> ListingListResponse:
    if skip < 0:
        skip = 0
    if limit < 1 or limit > 200:
        limit = 50
    aid = effective_agency_id(request)
    rows, total = repo.list(
        skip=skip, limit=limit, visibility=visibility, status=status, agency_id=aid
    )
    return ListingListResponse(
        items=[ListingRead.model_validate(r) for r in rows],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("", response_model=ListingRead, status_code=201)
def create_listing(
    body: ListingCreate,
    repo: ListingRepository = Depends(_repo),
) -> ListingRead:
    row = repo.create(body)
    sync_listing_to_external_search(row)
    return ListingRead.model_validate(row)


@router.get("/{listing_id}", response_model=ListingRead)
def get_listing(
    listing_id: str,
    repo: ListingRepository = Depends(_repo),
) -> ListingRead:
    row = repo.get(listing_id)
    if not row:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "آگهی یافت نشد.",
            status_code=404,
            details={"entity": "listing", "listing_id": listing_id},
        )
    return ListingRead.model_validate(row)


@router.patch("/{listing_id}", response_model=ListingRead)
def patch_listing(
    listing_id: str,
    body: ListingUpdate,
    repo: ListingRepository = Depends(_repo),
) -> ListingRead:
    row = repo.get(listing_id)
    if not row:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "آگهی یافت نشد.",
            status_code=404,
            details={"entity": "listing", "listing_id": listing_id},
        )
    row = repo.update(row, body)
    sync_listing_to_external_search(row)
    return ListingRead.model_validate(row)


@router.post("/{listing_id}/archive", response_model=ListingRead)
def archive_listing(
    listing_id: str,
    repo: ListingRepository = Depends(_repo),
) -> ListingRead:
    row = repo.get(listing_id)
    if not row:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "آگهی یافت نشد.",
            status_code=404,
            details={"entity": "listing", "listing_id": listing_id},
        )
    row = repo.archive(row)
    sync_listing_to_external_search(row)
    return ListingRead.model_validate(row)
