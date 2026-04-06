from __future__ import annotations

import datetime as dt
import os
import subprocess
import tempfile
from pathlib import Path

import pystache

from app.core.config import settings
from app.services.s3 import get_s3_client


def render_contract_html(context: dict) -> str:
    template_path = Path(__file__).resolve().parents[1] / "templates" / "contract.mustache"
    tpl = template_path.read_text(encoding="utf-8")
    return pystache.render(tpl, context)


def html_to_pdf(html: str) -> bytes | None:
    # Uses wkhtmltopdf binary if available.
    wk = "wkhtmltopdf"
    with tempfile.TemporaryDirectory() as td:
        td_path = Path(td)
        html_path = td_path / "contract.html"
        pdf_path = td_path / "contract.pdf"
        html_path.write_text(html, encoding="utf-8")

        try:
            subprocess.run([wk, str(html_path), str(pdf_path)], check=True, capture_output=True)
        except FileNotFoundError:
            return None
        except subprocess.CalledProcessError:
            return None

        return pdf_path.read_bytes()


def store_document_bytes(*, key: str, data: bytes, content_type: str) -> None:
    s3 = get_s3_client()
    if not s3:
        raise RuntimeError("s3_not_configured")

    s3.client.put_object(
        Bucket=settings.s3_bucket,
        Key=key,
        Body=data,
        ContentType=content_type,
    )


def presign_get_url(*, key: str, expires_in_seconds: int = 3600) -> str:
    s3 = get_s3_client()
    if not s3:
        raise RuntimeError("s3_not_configured")

    return s3.client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket, "Key": key},
        ExpiresIn=expires_in_seconds,
    )


def local_write(*, filename: str, data: bytes) -> str:
    base = Path(__file__).resolve().parents[2] / "var"
    base.mkdir(parents=True, exist_ok=True)
    path = base / filename
    path.write_bytes(data)
    return str(path)


def new_doc_key(*, contract_id: str, ext: str) -> str:
    ts = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return f"contracts/{contract_id}/{ts}.{ext}"
