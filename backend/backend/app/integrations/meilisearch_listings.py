"""Meilisearch REST client for listings index (sync + search + facets)."""

from __future__ import annotations

import logging
import os
from decimal import Decimal
from typing import Any, Optional

import httpx

from app.core.meilisearch_metrics import meilisearch_operations_total
from app.models.listing import DealType, Listing, ListingStatus, ListingVisibility

log = logging.getLogger(__name__)

INDEX = os.getenv("MEILISEARCH_INDEX_LISTINGS", "listings")


def _base_url() -> str:
    u = (os.getenv("MEILISEARCH_URL") or "").strip()
    if u:
        return u.rstrip("/")
    if meilisearch_enabled():
        return "http://127.0.0.1:7700"
    return ""


def _headers() -> dict[str, str]:
    key = os.getenv("MEILISEARCH_API_KEY", "").strip()
    h = {"Content-Type": "application/json"}
    if key:
        h["Authorization"] = f"Bearer {key}"
    return h


def meilisearch_enabled() -> bool:
    return (os.getenv("AMLINE_SEARCH_BACKEND") or "").lower().strip() == "meilisearch"


def is_configured() -> bool:
    return bool(_base_url().strip())


def listing_document(row: Listing) -> dict[str, Any]:
    doc: dict[str, Any] = {
        "id": row.id,
        "title": row.title or "",
        "description": (row.description or "")[:8000],
        "location_summary": row.location_summary or "",
        "search_document": (row.search_document or "")[:16000],
        "deal_type": row.deal_type.value if row.deal_type else "",
        "visibility": row.visibility.value if row.visibility else "",
        "status": row.status.value if row.status else "",
        "price_amount": float(row.price_amount),
        "currency": row.currency or "IRR",
        "owner_id": row.owner_id,
        "area_sqm": float(row.area_sqm) if row.area_sqm is not None else None,
        "room_count": row.room_count,
        "agency_id": row.agency_id,
        "region_id": row.region_id,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }
    if row.latitude is not None and row.longitude is not None:
        doc["_geo"] = {
            "lat": float(row.latitude),
            "lng": float(row.longitude),
        }
    return doc


def ensure_index_settings(timeout: float = 10.0) -> None:
    if not is_configured():
        return
    url = f"{_base_url()}/indexes/{INDEX}/settings"
    body = {
        "searchableAttributes": [
            "title",
            "description",
            "location_summary",
            "search_document",
        ],
        "filterableAttributes": [
            "deal_type",
            "visibility",
            "status",
            "currency",
            "agency_id",
            "region_id",
            "_geo",
        ],
        "sortableAttributes": ["price_amount", "created_at", "updated_at"],
        "rankingRules": [
            "words",
            "typo",
            "proximity",
            "attribute",
            "sort",
            "exactness",
        ],
    }
    try:
        r = httpx.patch(url, json=body, headers=_headers(), timeout=timeout)
        if r.status_code >= 400:
            meilisearch_operations_total.labels(
                operation="settings_patch", result="error"
            ).inc()
            log.warning(
                "meilisearch settings patch failed: %s %s", r.status_code, r.text[:500]
            )
        else:
            meilisearch_operations_total.labels(
                operation="settings_patch", result="ok"
            ).inc()
    except httpx.HTTPError as e:
        meilisearch_operations_total.labels(
            operation="settings_patch", result="error"
        ).inc()
        log.warning("meilisearch settings unreachable: %s", e)


def upsert_listing(row: Listing, timeout: float = 10.0) -> bool:
    if not is_configured():
        return False
    url = f"{_base_url()}/indexes/{INDEX}/documents?primaryKey=id"
    try:
        r = httpx.post(
            url,
            json=[listing_document(row)],
            headers=_headers(),
            timeout=timeout,
        )
        if r.status_code >= 400:
            meilisearch_operations_total.labels(
                operation="upsert", result="error"
            ).inc()
            log.warning("meilisearch upsert failed: %s %s", r.status_code, r.text[:500])
            return False
        meilisearch_operations_total.labels(operation="upsert", result="ok").inc()
        return True
    except httpx.HTTPError as e:
        meilisearch_operations_total.labels(operation="upsert", result="error").inc()
        log.warning("meilisearch upsert error: %s", e)
        return False


def delete_listing(listing_id: str, timeout: float = 10.0) -> None:
    if not is_configured():
        return
    url = f"{_base_url()}/indexes/{INDEX}/documents/{listing_id}"
    try:
        r = httpx.delete(url, headers=_headers(), timeout=timeout)
        if r.status_code >= 400:
            meilisearch_operations_total.labels(
                operation="delete", result="error"
            ).inc()
        else:
            meilisearch_operations_total.labels(operation="delete", result="ok").inc()
    except httpx.HTTPError as e:
        meilisearch_operations_total.labels(operation="delete", result="error").inc()
        log.warning("meilisearch delete error: %s", e)


def search_listings_meili(
    *,
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
    facets: Optional[list[str]] = None,
    timeout: float = 15.0,
) -> tuple[list[str], int, Optional[dict[str, Any]]]:
    """Return (ordered listing ids, estimated total, facetDistribution)."""
    url = f"{_base_url()}/indexes/{INDEX}/search"
    filt: list[str] = []
    if deal_type is not None:
        filt.append(f'deal_type = "{deal_type.value}"')
    if visibility is not None:
        filt.append(f'visibility = "{visibility.value}"')
    if status is not None:
        filt.append(f'status = "{status.value}"')
    if price_min is not None:
        filt.append(f"price_amount >= {float(price_min)}")
    if price_max is not None:
        filt.append(f"price_amount <= {float(price_max)}")
    if all(v is not None for v in (min_lat, max_lat, min_lng, max_lng)):
        filt.append(f"_geoBoundingBox([{min_lat}, {min_lng}], [{max_lat}, {max_lng}])")
    payload: dict[str, Any] = {
        "q": (q or "").strip(),
        "offset": skip,
        "limit": limit,
        "sort": ["created_at:desc"],
    }
    if filt:
        payload["filter"] = " AND ".join(filt)
    if facets:
        payload["facets"] = facets
    try:
        r = httpx.post(url, json=payload, headers=_headers(), timeout=timeout)
        r.raise_for_status()
        data = r.json()
    except (httpx.HTTPError, ValueError) as e:
        meilisearch_operations_total.labels(operation="search", result="error").inc()
        log.warning("meilisearch search failed: %s", e)
        return [], 0, None
    meilisearch_operations_total.labels(operation="search", result="ok").inc()
    hits = data.get("hits") or []
    ids = [str(h.get("id")) for h in hits if h.get("id")]
    total = int(data.get("estimatedTotalHits") or data.get("totalHits") or len(ids))
    fd = data.get("facetDistribution")
    return ids, total, fd if isinstance(fd, dict) else None
