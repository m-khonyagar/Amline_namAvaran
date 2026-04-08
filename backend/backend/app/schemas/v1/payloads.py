from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class OtpBody(BaseModel):
    mobile: str


class LoginBody(BaseModel):
    mobile: str
    otp: str


class StartBody(BaseModel):
    contract_type: Optional[str] = "PROPERTY_RENT"
    party_type: Optional[str] = None


class SetStepBody(BaseModel):
    next_step: Optional[str] = None


class RoleCreateBody(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: List[str] = Field(default_factory=list)


class RolePatchBody(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[List[str]] = None


class AuditCreateBody(BaseModel):
    action: str
    entity: str
    metadata: Optional[Dict[str, Any]] = None
    user_id: Optional[str] = None


class CrmLeadCreateBody(BaseModel):
    full_name: str
    mobile: str
    need_type: str
    status: Optional[str] = "NEW"
    notes: Optional[str] = ""
    assigned_to: Optional[str] = None
    contract_id: Optional[str] = None


class CrmLeadPatchBody(BaseModel):
    full_name: Optional[str] = None
    mobile: Optional[str] = None
    need_type: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    contract_id: Optional[str] = None


class CrmActivityBody(BaseModel):
    """lead_id optional when URL path already contains the lead (admin-ui / tests)."""

    lead_id: Optional[str] = None
    type: str
    note: Optional[str] = ""
    user_id: Optional[str] = None


class AdminNotificationCreateBody(BaseModel):
    title: str
    body: Optional[str] = ""
    type: Optional[str] = "system"
