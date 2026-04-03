from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.registry_job import RegistryJobStatus


class RegistrySubmitBody(BaseModel):
    contract_id: str
    payload_json: Optional[str] = None


class RegistryJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    contract_id: str
    status: RegistryJobStatus
    tracking_code: Optional[str]
    created_at: datetime
    updated_at: datetime
