from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.models.crm import CrmActivityType, CrmLeadSource


class CrmActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    lead_id: str
    type: CrmActivityType
    note: str
    user_id: str
    created_at: datetime


class CrmLeadCreate(BaseModel):
    source: CrmLeadSource = CrmLeadSource.MANUAL
    full_name: str
    mobile: str
    need_type: str = "RENT"
    status: str = "NEW"
    notes: str = ""
    assigned_to: Optional[str] = None
    contract_id: Optional[str] = None
    listing_id: Optional[str] = None
    requirement_id: Optional[str] = None
    province_id: Optional[str] = None
    city_id: Optional[str] = None


class CrmLeadPatch(BaseModel):
    full_name: Optional[str] = None
    mobile: Optional[str] = None
    need_type: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    contract_id: Optional[str] = None
    listing_id: Optional[str] = None
    requirement_id: Optional[str] = None
    province_id: Optional[str] = None
    city_id: Optional[str] = None


class CrmLeadRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    source: CrmLeadSource
    full_name: str
    mobile: str
    need_type: str
    status: str
    notes: str
    assigned_to: Optional[str]
    contract_id: Optional[str]
    listing_id: Optional[str]
    requirement_id: Optional[str]
    province_id: Optional[str] = None
    city_id: Optional[str] = None
    province_name_fa: Optional[str] = None
    city_name_fa: Optional[str] = None
    sla_due_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class CrmLeadListResponse(BaseModel):
    items: List[CrmLeadRead]
    total: int
    skip: int
    limit: int


class CrmActivityCreate(BaseModel):
    type: CrmActivityType
    note: str = ""
    user_id: Optional[str] = None
