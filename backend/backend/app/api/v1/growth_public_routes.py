"""P2 — public SEO feed, sitemap, site metadata."""

from __future__ import annotations

import html
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.errors import AmlineError
from app.core.simple_cache import public_feed_cache
from app.db.session import get_db
from app.repositories.listing_repository import ListingRepository
from app.schemas.v1.growth_v1 import PublicListingFeedResponse, SiteMetaResponse
from app.schemas.v1.listings import ListingRead

router = APIRouter(prefix="/public", tags=["public-seo"])


@router.get("/meta/site", response_model=SiteMetaResponse)
def site_meta() -> SiteMetaResponse:
    base = os.getenv("AMLINE_PUBLIC_BASE_URL", "https://amline.ir")
    return SiteMetaResponse(
        site_name=os.getenv("AMLINE_SITE_NAME", "املاین"),
        description=os.getenv(
            "AMLINE_SITE_DESCRIPTION",
            "پلتفرم املاک و قراردادهای اجاره و فروش",
        ),
        base_url=base.rstrip("/"),
        language="fa",
    )


@router.get("/listings/feed", response_model=PublicListingFeedResponse)
def public_listings_feed(
    response: Response,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
) -> PublicListingFeedResponse:
    if page < 1:
        page = 1
    if limit < 1 or limit > 50:
        limit = 20
    skip = (page - 1) * limit
    cache_key = ("feed", page, limit)

    def _build() -> PublicListingFeedResponse:
        repo = ListingRepository(db)
        rows, total = repo.list_public_published(skip=skip, limit=limit)
        return PublicListingFeedResponse(
            items=[ListingRead.model_validate(r) for r in rows],
            total=total,
            page=page,
            limit=limit,
        )

    out = public_feed_cache.get_or_set(cache_key, _build, ttl_seconds=45.0)
    response.headers["Cache-Control"] = "public, max-age=60"
    return out


@router.get("/sitemap.xml")
def sitemap_xml(
    response: Response,
    db: Session = Depends(get_db),
) -> Response:
    base = os.getenv("AMLINE_PUBLIC_BASE_URL", "https://amline.ir").rstrip("/")
    repo = ListingRepository(db)
    rows, _ = repo.list_public_published(skip=0, limit=500)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        f"  <url><loc>{html.escape(base + '/')}</loc><lastmod>{now}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>",
    ]
    for li in rows:
        loc = html.escape(f"{base}/listings/{li.id}")
        lines.append(
            f"  <url><loc>{loc}</loc><lastmod>{li.updated_at.date().isoformat()}</lastmod>"
            f"<changefreq>weekly</changefreq><priority>0.6</priority></url>"
        )
    lines.append("</urlset>")
    xml = "\n".join(lines)
    return Response(content=xml, media_type="application/xml")


@router.get("/listings/{listing_id}/meta")
def listing_public_meta(
    listing_id: str,
    db: Session = Depends(get_db),
) -> dict:
    row = ListingRepository(db).get(listing_id)
    if not row:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "آگهی یافت نشد.",
            status_code=404,
            details={"entity": "listing", "listing_id": listing_id},
        )
    return {
        "listing_id": row.id,
        "title": row.title,
        "description": (row.description or "")[:280],
        "canonical_path": f"/listings/{row.id}",
        "og_type": "product",
        "robots": "index,follow" if row.visibility.value == "PUBLIC" else "noindex",
    }
