"""Listing media upload → S3/MinIO + optional Thumbor derivative URLs."""

from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, File, UploadFile

from app.core.errors import AmlineError
from app.core.rbac_deps import require_permission
from app.core.s3_media import s3_media_configured, upload_listing_image
from app.core.thumbor_urls import thumbor_image_url, thumbor_preset_url

router = APIRouter(prefix="/media", tags=["media"])

_MAX_BYTES = 12 * 1024 * 1024


@router.post("/listing-image", status_code=201)
def upload_listing_media(
    file: UploadFile = File(...),
    width: int = 640,
    height: int = 480,
    preset: Optional[str] = None,
    _: None = Depends(require_permission("listings:write")),
) -> dict[str, Any]:
    if not s3_media_configured():
        raise AmlineError(
            "INTEGRATION_NOT_CONFIGURED",
            "ذخیرهٔ فایل (S3/MinIO) پیکربندی نشده است.",
            status_code=503,
            details={"env": ["AMLINE_S3_ENDPOINT_URL", "AMLINE_S3_BUCKET", "..."]},
        )
    ct = (file.content_type or "application/octet-stream").split(";")[0].strip().lower()
    if not ct.startswith("image/"):
        raise AmlineError(
            "VALIDATION_ERROR",
            "فقط تصویر مجاز است.",
            status_code=422,
            details={"content_type": ct},
        )
    raw = file.file.read(_MAX_BYTES + 1)
    if len(raw) > _MAX_BYTES:
        raise AmlineError(
            "VALIDATION_ERROR",
            "حجم فایل بیش از حد مجاز است.",
            status_code=422,
            details={"max_bytes": _MAX_BYTES},
        )
    fn = file.filename or "upload"
    key, public_url = upload_listing_image(
        filename=fn, content_type=ct or "image/jpeg", body=raw
    )
    if preset:
        thumb = thumbor_preset_url(key, preset, smart=True)
    else:
        thumb = thumbor_image_url(key, width=width, height=height, smart=True)
    return {
        "storage_key": key,
        "public_url": public_url,
        "thumbor_url": thumb,
        "thumbor_preset": preset,
        "content_type": ct,
    }
