from __future__ import annotations

import datetime as dt

from pydantic import BaseModel


class ArbitrationMessageCreate(BaseModel):
    body: str


class ArbitrationMessageOut(BaseModel):
    id: str
    arbitration_id: str
    author_id: str
    body: str
    created_at: dt.datetime


class ArbitrationAttachmentOut(BaseModel):
    id: str
    arbitration_id: str
    uploader_id: str
    filename: str
    content_type: str
    size_bytes: int
    created_at: dt.datetime


class ArbitrationStatusChange(BaseModel):
    status: str
    resolution: str | None = None
