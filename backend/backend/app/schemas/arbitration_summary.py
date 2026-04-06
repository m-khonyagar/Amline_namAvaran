from __future__ import annotations

import datetime as dt

from pydantic import BaseModel


class ArbitrationSummaryOut(BaseModel):
    id: str
    status: str
    reason: str
    created_at: dt.datetime

    contract_id: str
    contract_tracking_code: str | None = None

    claimant_id: str
    claimant_mobile: str | None = None

    respondent_id: str
    respondent_mobile: str | None = None

    property_id: str | None = None
    property_city: str | None = None
