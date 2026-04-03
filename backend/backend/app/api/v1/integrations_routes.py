"""Internal integration controls: Meilisearch reindex, flags, health hints."""

from __future__ import annotations

import os
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.rbac_deps import require_permission
from app.core.s3_media import s3_media_configured
from app.core.thumbor_urls import THUMBOR_PRESETS, thumbor_image_url, thumbor_preset_url
from app.db.session import get_db
from app.integrations import meilisearch_listings as meili
from app.integrations.meilisearch_listings import INDEX, listing_document
from app.integrations.temporal_workflows import temporal_configured
from app.models.listing import Listing

router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.post("/meilisearch/reindex")
def reindex_meilisearch(
    batch_size: int = 200,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("listings:write")),
) -> dict[str, Any]:
    if not meili.is_configured():
        return {"ok": False, "error": "MEILISEARCH_URL not set"}
    meili.ensure_index_settings()
    url = f"{meili._base_url()}/indexes/{INDEX}/documents?primaryKey=id"
    total = 0
    offset = 0
    bs = max(10, min(batch_size, 500))
    while True:
        rows = list(db.scalars(select(Listing).offset(offset).limit(bs)).all())
        if not rows:
            break
        docs = [listing_document(r) for r in rows]
        r = httpx.post(url, json=docs, headers=meili._headers(), timeout=60.0)
        if r.status_code >= 400:
            return {"ok": False, "error": r.text[:500], "indexed": total}
        total += len(docs)
        offset += bs
    return {"ok": True, "indexed": total}


@router.get("/meilisearch/stats")
def meilisearch_index_stats(
    _: None = Depends(require_permission("listings:read")),
) -> dict[str, Any]:
    """Meilisearch index document count and field distribution (ops / monitoring)."""
    if not meili.is_configured():
        return {"ok": False, "error": "meilisearch_not_configured"}
    url = f"{meili._base_url()}/indexes/{INDEX}/stats"
    try:
        r = httpx.get(url, headers=meili._headers(), timeout=5.0)
        if r.status_code >= 400:
            return {"ok": False, "error": r.text[:300], "status": r.status_code}
        return {"ok": True, "stats": r.json()}
    except httpx.HTTPError as e:
        return {"ok": False, "error": str(e)}


@router.get("/feature-flags")
def feature_flags(
    distinct_id: str = "anonymous",
    _: None = Depends(require_permission("settings:read")),
) -> dict[str, Any]:
    raw = os.getenv("AMLINE_FEATURE_FLAGS_JSON", "").strip()
    static_flags: dict[str, Any] = {}
    if raw:
        import json

        try:
            static_flags = json.loads(raw)
        except json.JSONDecodeError:
            static_flags = {"_error": "invalid JSON"}
    from app.core.posthog_server import posthog_feature_enabled

    ph = posthog_feature_enabled("amline_beta_features", distinct_id)
    return {"static": static_flags, "posthog_beta": ph}


@router.get("/thumbor/demo")
def thumbor_demo(
    path: str = "demo/listing.jpg",
    _: None = Depends(require_permission("listings:read")),
) -> dict[str, Optional[str]]:
    return {"url": thumbor_image_url(path, 320, 240)}


@router.get("/thumbor/presets")
def thumbor_presets(
    path: str = "demo/listing.jpg",
    _: None = Depends(require_permission("listings:read")),
) -> dict[str, Any]:
    """Signed (or unsafe) URLs for each named preset — see THUMBOR_PRESETS."""
    urls: dict[str, str | None] = {}
    for name in THUMBOR_PRESETS:
        urls[name] = thumbor_preset_url(path, name)
    preset_dims = {
        k: {"width": v[0], "height": v[1]} for k, v in THUMBOR_PRESETS.items()
    }
    return {"path": path, "presets": preset_dims, "urls": urls}


@router.get("/matrix/status")
def matrix_status(
    _: None = Depends(require_permission("settings:read")),
) -> dict[str, Any]:
    from app.adapters.matrix import matrix_configured

    return {
        "configured": matrix_configured(),
        "access_token_set": bool((os.getenv("MATRIX_ACCESS_TOKEN") or "").strip()),
    }


@router.get("/health/summary")
def integrations_health_summary() -> dict[str, Any]:
    out: dict[str, Any] = {
        "meilisearch": {
            "configured": meili.is_configured(),
            "enabled": meili.meilisearch_enabled(),
        },
        "n8n": {"webhook_set": bool(os.getenv("AMLINE_N8N_WEBHOOK_URL"))},
        "posthog": {
            "key_set": bool(
                os.getenv("POSTHOG_API_KEY") or os.getenv("POSTHOG_PROJECT_API_KEY")
            )
        },
        "thumbor": {
            "base_set": bool(os.getenv("THUMBOR_BASE_URL")),
            "security_key_set": bool((os.getenv("THUMBOR_SECURITY_KEY") or "").strip()),
            "preset_names": list(THUMBOR_PRESETS.keys()),
        },
        "loki": {"url": "http://loki:3100"},
        "prometheus": {"url": "http://prometheus:9090"},
        "s3_media": {"configured": s3_media_configured()},
        "ml_pricing": {"url_set": bool(os.getenv("AMLINE_ML_PRICING_URL"))},
        "otel": {"endpoint_set": bool(os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT"))},
        "temporal": {"configured": temporal_configured()},
    }
    if meili.is_configured():
        try:
            r = httpx.get(
                f"{meili._base_url()}/health", headers=meili._headers(), timeout=2.0
            )
            out["meilisearch"]["health_status"] = r.status_code
        except httpx.HTTPError:
            out["meilisearch"]["health_status"] = "unreachable"
    return out
