"""Upload media to S3-compatible storage (MinIO) for listing images."""

from __future__ import annotations

import os
import uuid


def s3_media_configured() -> bool:
    return bool(
        (os.getenv("AMLINE_S3_ENDPOINT_URL") or "").strip()
        and (os.getenv("AMLINE_S3_ACCESS_KEY") or "").strip()
        and (os.getenv("AMLINE_S3_SECRET_KEY") or "").strip()
        and (os.getenv("AMLINE_S3_BUCKET") or "").strip()
    )


def _client():
    import boto3

    return boto3.client(
        "s3",
        endpoint_url=os.getenv("AMLINE_S3_ENDPOINT_URL", "").strip(),
        aws_access_key_id=os.getenv("AMLINE_S3_ACCESS_KEY", "").strip(),
        aws_secret_access_key=os.getenv("AMLINE_S3_SECRET_KEY", "").strip(),
        region_name=os.getenv("AMLINE_S3_REGION", "us-east-1"),
    )


def upload_listing_image(
    *,
    filename: str,
    content_type: str,
    body: bytes,
    prefix: str = "listings",
) -> tuple[str, str]:
    """
    Returns (storage_key, public_url).
    public_url uses AMLINE_S3_PUBLIC_BASE_URL + /{bucket}/{key} when set, else virtual path only.
    """
    ext = ""
    if "." in filename:
        ext = "." + filename.rsplit(".", 1)[-1].lower()[:8]
    safe_ext = ext if ext in (".jpg", ".jpeg", ".png", ".webp", ".gif") else ""
    key = f"{prefix}/{uuid.uuid4().hex}{safe_ext or '.bin'}"
    bucket = os.getenv("AMLINE_S3_BUCKET", "").strip()
    cli = _client()
    cli.put_object(Bucket=bucket, Key=key, Body=body, ContentType=content_type)
    base_pub = (os.getenv("AMLINE_S3_PUBLIC_BASE_URL") or "").rstrip("/")
    if base_pub:
        public_url = f"{base_pub}/{bucket}/{key}"
    else:
        public_url = f"s3://{bucket}/{key}"
    return key, public_url
