from __future__ import annotations

import datetime as dt

from pydantic import BaseModel


class DocumentOut(BaseModel):
    id: str
    contract_id: str
    html_s3_key: str | None
    pdf_s3_key: str | None
    html_local_path: str | None
    pdf_local_path: str | None
    created_at: dt.datetime


class PresignResponse(BaseModel):
    url: str
    expires_in_seconds: int
