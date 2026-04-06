from __future__ import annotations

from dataclasses import dataclass

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.core.config import settings


@dataclass(frozen=True)
class S3Client:
    client: any


def get_s3_client() -> S3Client | None:
    if not settings.s3_endpoint_url:
        return None
    if not settings.s3_access_key or not settings.s3_secret_key:
        return None

    c = boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        config=Config(signature_version="s3v4"),
    )
    return S3Client(client=c)


def ensure_bucket() -> None:
    s3 = get_s3_client()
    if not s3:
        return

    try:
        s3.client.head_bucket(Bucket=settings.s3_bucket)
        return
    except ClientError:
        pass

    # MinIO (S3 compatible) accepts CreateBucket without LocationConstraint for us-east-1.
    try:
        s3.client.create_bucket(Bucket=settings.s3_bucket)
    except ClientError:
        # bucket may already exist (race)
        return
