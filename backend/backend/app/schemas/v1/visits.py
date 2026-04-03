from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.visit import VisitOutcome, VisitStatus


class VisitCreate(BaseModel):
    listing_id: Optional[str] = None
    crm_lead_id: Optional[str] = None
    scheduled_at: Optional[datetime] = None


class VisitScheduleBody(BaseModel):
    scheduled_at: datetime


class VisitOutcomeBody(BaseModel):
    outcome: VisitOutcome
    outcome_notes: Optional[str] = None


class VisitRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    listing_id: Optional[str]
    crm_lead_id: Optional[str]
    scheduled_at: Optional[datetime]
    completed_at: Optional[datetime]
    status: VisitStatus
    outcome: VisitOutcome
    outcome_notes: Optional[str]
    created_at: datetime
    updated_at: datetime


class VisitListResponse(BaseModel):
    items: list[VisitRead]
    total: int
    skip: int
    limit: int
