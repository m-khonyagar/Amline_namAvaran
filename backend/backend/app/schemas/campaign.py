from __future__ import annotations

import datetime as dt

from pydantic import BaseModel


class CampaignOut(BaseModel):
    id: str
    name: str
    type: str
    discount_percent: int
    start_date: dt.date
    end_date: dt.date
    status: str


class ApplyCampaignRequest(BaseModel):
    campaign_id: str
    contract_id: str | None = None
