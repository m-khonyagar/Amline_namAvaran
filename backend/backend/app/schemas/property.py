from __future__ import annotations

import datetime as dt

from pydantic import BaseModel


class PropertyCreate(BaseModel):
    city: str
    address: str
    area: float
    rooms: int
    year_built: int | None = None
    property_type: str


class PropertyOut(BaseModel):
    id: str
    owner_id: str
    city: str
    address: str
    area: float
    rooms: int
    year_built: int | None
    property_type: str
    created_at: dt.datetime
