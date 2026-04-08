from __future__ import annotations

import datetime as dt

from pydantic import BaseModel


class TenantScoreEventOut(BaseModel):
    id: str
    user_id: str
    delta: int
    reason: str
    reference_id: str | None
    created_at: dt.datetime
