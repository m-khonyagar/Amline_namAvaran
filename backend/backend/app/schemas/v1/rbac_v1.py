from __future__ import annotations

from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict


class RoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    label: str
    permissions_json: str
    created_at: datetime


class UserRolesAssignBody(BaseModel):
    role_codes: List[str]


class UserRolesRead(BaseModel):
    user_id: str
    role_codes: List[str]
