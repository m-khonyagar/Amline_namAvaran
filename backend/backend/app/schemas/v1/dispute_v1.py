"""اسکیمای HTTP اختلاف قرارداد."""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class DisputeCategoryBody(str, Enum):
    PAYMENT = "PAYMENT"
    SIGNATURE = "SIGNATURE"
    REGISTRY = "REGISTRY"
    LEGAL = "LEGAL"
    OTHER = "OTHER"


class DisputeEvidenceTypeBody(str, Enum):
    AUDIT_REF = "AUDIT_REF"
    CHAT_EXPORT = "CHAT_EXPORT"
    SIGNATURE_SNAPSHOT = "SIGNATURE_SNAPSHOT"
    UPLOAD = "UPLOAD"


class DisputeCreate(BaseModel):
    raised_by_party_id: str | None = None
    category: DisputeCategoryBody


class DisputeEvidenceCreate(BaseModel):
    type: DisputeEvidenceTypeBody
    storage_uri: str = Field(..., min_length=1)
    hash_sha256: str | None = None
    submitted_by: str | None = None


class DisputeEvidenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    dispute_id: str
    type: str
    storage_uri: str
    hash_sha256: str | None
    submitted_by: str | None
    created_at: datetime


class DisputeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    contract_id: str
    raised_by_party_id: str | None
    category: str
    status: str
    resolution_type: str | None
    resolver_user_id: str | None
    created_at: datetime
    resolved_at: datetime | None


class DisputeListResponse(BaseModel):
    items: list[DisputeRead]
    total: int
