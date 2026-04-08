from __future__ import annotations

import datetime as dt

from pydantic import BaseModel, Field


class MarketRentSummaryOut(BaseModel):
    city: str
    property_type: str | None = None
    rooms: int | None = None
    area: float | None = None
    window_days: int = 365

    sample_size: int
    avg_rent_amount: float | None = None
    median_rent_amount: float | None = None
    p25_rent_amount: float | None = None
    p75_rent_amount: float | None = None

    avg_deposit_amount: float | None = None
    median_deposit_amount: float | None = None

    avg_rent_per_sqm: float | None = None
    median_rent_per_sqm: float | None = None

    last_contract_created_at: dt.datetime | None = None


class RentEstimateIn(BaseModel):
    city: str = Field(min_length=2, max_length=64)
    property_type: str | None = Field(default=None, max_length=64)
    rooms: int | None = Field(default=None, ge=0, le=20)
    area: float = Field(gt=0)
    year_built: int | None = Field(default=None, ge=1200, le=2000)


class RentEstimateOut(BaseModel):
    city: str
    property_type: str | None = None
    rooms: int | None = None
    area: float
    year_built: int | None = None

    estimate_rent_amount: float
    low_rent_amount: float
    high_rent_amount: float
    sample_size: int
    confidence: float
    method: str


class PropertyPerformanceOut(BaseModel):
    property_id: str
    city: str
    property_type: str
    owner_id: str

    total_contracts: int
    active_contracts: int
    total_rent_collected: float
    last_rent_payment_at: dt.datetime | None = None
