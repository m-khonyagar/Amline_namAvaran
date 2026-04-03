from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.legal import LegalReviewStatus


class LegalReviewCreate(BaseModel):
    contract_id: str


class LegalDecisionBody(BaseModel):
    approve: bool
    comment: Optional[str] = None
    reviewer_id: Optional[str] = None


class LegalReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    contract_id: str
    status: LegalReviewStatus
    comment: Optional[str]
    reviewer_id: Optional[str]
    created_at: datetime
    decided_at: Optional[datetime]


class LegalReviewListResponse(BaseModel):
    items: list[LegalReviewRead]
    total: int
    skip: int
    limit: int
