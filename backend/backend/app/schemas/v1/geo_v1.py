from __future__ import annotations

from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict


class CityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    province_id: str
    name_fa: str
    created_at: datetime


class ProvinceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name_fa: str
    sort_order: int
    created_at: datetime


class ProvinceWithCitiesRead(ProvinceRead):
    cities: List[CityRead] = []
