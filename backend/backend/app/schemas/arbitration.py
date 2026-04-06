from __future__ import annotations

import datetime as dt

from pydantic import BaseModel


class ArbitrationCreate(BaseModel):
    contract_id: str
    respondent_id: str
    reason: str
    description: str | None = None


class ArbitrationOut(BaseModel):
    id: str
    contract_id: str
    claimant_id: str
    respondent_id: str
    reason: str
    description: str | None
    status: str
    created_at: dt.datetime
    resolved_at: dt.datetime | None
    resolver_id: str | None
    resolution: str | None


class ArbitrationResolve(BaseModel):
    status: str  # resolved|rejected|under_review
    resolution: str | None = None
