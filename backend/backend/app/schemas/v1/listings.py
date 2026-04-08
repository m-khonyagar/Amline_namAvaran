from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.listing import DealType, ListingStatus, ListingVisibility


class ListingCreate(BaseModel):
    deal_type: DealType
    visibility: ListingVisibility = ListingVisibility.NETWORK
    price_amount: Decimal
    currency: str = "IRR"
    location_summary: str = ""
    title: str = ""
    description: Optional[str] = None
    owner_id: str = Field(default="mock-001", description="Temporary until users table")
    status: ListingStatus = ListingStatus.DRAFT
    inventory_file_id: Optional[str] = None
    area_sqm: Optional[Decimal] = None
    room_count: Optional[int] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None


class ListingUpdate(BaseModel):
    deal_type: Optional[DealType] = None
    visibility: Optional[ListingVisibility] = None
    price_amount: Optional[Decimal] = None
    currency: Optional[str] = None
    location_summary: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ListingStatus] = None
    inventory_file_id: Optional[str] = None
    area_sqm: Optional[Decimal] = None
    room_count: Optional[int] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None


class ListingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    deal_type: DealType
    visibility: ListingVisibility
    price_amount: Decimal
    currency: str
    location_summary: str
    title: str
    description: Optional[str]
    owner_id: str
    status: ListingStatus
    inventory_file_id: Optional[str]
    area_sqm: Optional[Decimal] = None
    room_count: Optional[int] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime


class ListingListResponse(BaseModel):
    items: List[ListingRead]
    total: int
    skip: int
    limit: int
