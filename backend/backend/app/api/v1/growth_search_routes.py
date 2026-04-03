"""Listing search — Postgres FTS/ILIKE or Meilisearch (AMLINE_SEARCH_BACKEND)."""

from __future__ import annotations

from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.rbac_deps import require_permission
from app.core.simple_cache import search_cache
from app.db.session import get_db
from app.integrations import meilisearch_listings as meili
from app.models.listing import DealType, ListingStatus, ListingVisibility
from app.repositories.listing_repository import ListingRepository
from app.schemas.v1.growth_v1 import SearchListingsResponse
from app.schemas.v1.listings import ListingRead

router = APIRouter(prefix="/search", tags=["search"])


def _search_with_meilisearch(
    *,
    db: Session,
    q: Optional[str],
    deal_type: Optional[DealType],
    visibility: Optional[ListingVisibility],
    status: Optional[ListingStatus],
    price_min: Optional[Decimal],
    price_max: Optional[Decimal],
    min_lat: Optional[float],
    max_lat: Optional[float],
    min_lng: Optional[float],
    max_lng: Optional[float],
    skip: int,
    limit: int,
) -> SearchListingsResponse:
    ids, total, facets = meili.search_listings_meili(
        q=q,
        deal_type=deal_type,
        visibility=visibility,
        status=status,
        price_min=price_min,
        price_max=price_max,
        min_lat=min_lat,
        max_lat=max_lat,
        min_lng=min_lng,
        max_lng=max_lng,
        skip=skip,
        limit=limit,
        facets=["deal_type", "visibility", "status"],
    )
    repo = ListingRepository(db)
    rows = repo.get_by_ids_ordered(ids)
    return SearchListingsResponse(
        items=[ListingRead.model_validate(r) for r in rows],
        total=total,
        skip=skip,
        limit=limit,
        engine="meilisearch",
        facets=facets,
    )


@router.get("/listings", response_model=SearchListingsResponse)
def search_listings(
    response: Response,
    q: Optional[str] = None,
    deal_type: Optional[DealType] = None,
    visibility: Optional[ListingVisibility] = None,
    status: Optional[ListingStatus] = None,
    price_min: Optional[Decimal] = None,
    price_max: Optional[Decimal] = None,
    min_lat: Optional[float] = None,
    max_lat: Optional[float] = None,
    min_lng: Optional[float] = None,
    max_lng: Optional[float] = None,
    skip: int = 0,
    limit: int = 30,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("listings:read")),
) -> SearchListingsResponse:
    if limit < 1 or limit > 100:
        limit = 30

    use_meili = meili.meilisearch_enabled() and meili.is_configured()
    cache_key = (
        "search",
        "meili" if use_meili else "pg",
        q or "",
        str(deal_type),
        str(visibility),
        str(status),
        str(price_min),
        str(price_max),
        str(min_lat),
        str(max_lat),
        str(min_lng),
        str(max_lng),
        skip,
        limit,
    )

    def _run() -> SearchListingsResponse:
        if use_meili:
            return _search_with_meilisearch(
                db=db,
                q=q,
                deal_type=deal_type,
                visibility=visibility,
                status=status,
                price_min=price_min,
                price_max=price_max,
                min_lat=min_lat,
                max_lat=max_lat,
                min_lng=min_lng,
                max_lng=max_lng,
                skip=skip,
                limit=limit,
            )
        bind = db.get_bind()
        engine_name = bind.dialect.name
        repo = ListingRepository(db)
        rows, total = repo.search_listings(
            q=q,
            deal_type=deal_type,
            visibility=visibility,
            status=status,
            price_min=price_min,
            price_max=price_max,
            skip=skip,
            limit=limit,
        )
        if engine_name == "postgresql" and q and q.strip():
            label = "postgresql_fts_tsvector"
        elif engine_name == "postgresql":
            label = "postgresql_ilike_layer"
        else:
            label = "sqlite_fts_fallback"
        return SearchListingsResponse(
            items=[ListingRead.model_validate(r) for r in rows],
            total=total,
            skip=skip,
            limit=limit,
            engine=label,
            facets=None,
        )

    out = search_cache.get_or_set(cache_key, _run, ttl_seconds=25.0)
    response.headers["X-Search-Backend"] = out.engine
    return out


@router.get("/listings/map", response_model=SearchListingsResponse)
def search_listings_map(
    response: Response,
    min_lat: float,
    max_lat: float,
    min_lng: float,
    max_lng: float,
    deal_type: Optional[DealType] = None,
    visibility: Optional[ListingVisibility] = None,
    status: Optional[ListingStatus] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("listings:read")),
) -> SearchListingsResponse:
    if limit < 1 or limit > 100:
        limit = 50
    use_meili = meili.meilisearch_enabled() and meili.is_configured()
    if use_meili:
        out = _search_with_meilisearch(
            db=db,
            q=None,
            deal_type=deal_type,
            visibility=visibility,
            status=status,
            price_min=None,
            price_max=None,
            min_lat=min_lat,
            max_lat=max_lat,
            min_lng=min_lng,
            max_lng=max_lng,
            skip=skip,
            limit=limit,
        )
        response.headers["X-Search-Backend"] = "meilisearch_map"
        return out
    repo = ListingRepository(db)
    rows, total = repo.search_listings_map_bbox(
        min_lat=min_lat,
        max_lat=max_lat,
        min_lng=min_lng,
        max_lng=max_lng,
        deal_type=deal_type,
        visibility=visibility,
        status=status,
        skip=skip,
        limit=limit,
    )
    response.headers["X-Search-Backend"] = "postgres_map_bbox"
    return SearchListingsResponse(
        items=[ListingRead.model_validate(r) for r in rows],
        total=total,
        skip=skip,
        limit=limit,
        engine="postgres_map_bbox",
        facets=None,
    )
