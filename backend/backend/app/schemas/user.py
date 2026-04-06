from __future__ import annotations

import datetime as dt

from pydantic import BaseModel


class UserMe(BaseModel):
    id: str
    mobile: str
    national_code: str | None = None
    name: str | None = None
    role: str
    tenant_score: int
    referral_code: str | None = None
    created_at: dt.datetime


class UserUpdate(BaseModel):
    national_code: str | None = None
    name: str | None = None

class UserLookupOut(BaseModel):
    id: str
    mobile: str
    name: str | None = None


