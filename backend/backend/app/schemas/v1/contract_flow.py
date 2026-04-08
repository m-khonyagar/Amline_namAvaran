"""اسکیماهای Pydantic جریان قرارداد (هم‌تراز SwaggerHub 0.1.3)."""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class ExternalRefsFields(BaseModel):
    """Nullable integration IDs (SSOT §3.1)."""

    model_config = ConfigDict(extra="forbid")

    khodnevis_id: Optional[str] = None
    katib_id: Optional[str] = None
    tracking_code: Optional[str] = None


class ContractStartBody(BaseModel):
    model_config = ConfigDict(extra="allow")

    contract_type: Optional[str] = "PROPERTY_RENT"
    party_type: Optional[str] = None
    external_refs: Optional[ExternalRefsFields] = None
    created_by: Optional[str] = Field(
        default=None, description="Scribe / staff user id (SSOT §3.1)"
    )


class NextStepResponse(BaseModel):
    next_step: str


class SectionPatchBody(BaseModel):
    """بدنهٔ مشترک برای home-info / dating / mortgage / renting."""

    model_config = ConfigDict(extra="allow")

    next_step: Optional[str] = None
    payload: Optional[Dict[str, Any]] = Field(
        default=None, description="دادهٔ بخش مطابق DTO سوگر"
    )


class LandlordSetBody(BaseModel):
    model_config = ConfigDict(extra="allow")

    next_step: Optional[str] = None


class TenantSetBody(BaseModel):
    model_config = ConfigDict(extra="allow")

    next_step: Optional[str] = None


class PartyPatchBody(BaseModel):
    model_config = ConfigDict(extra="allow")

    person_type: Optional[str] = None
    natural_person_detail: Optional[Dict[str, Any]] = None
    legal_person_detail: Optional[Dict[str, Any]] = None
    mobile: Optional[str] = None
    signature_status: Optional[str] = None
    signature_method: Optional[str] = None
    agent_user_id: Optional[str] = None


class ContractExternalRefsPatchBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    khodnevis_id: Optional[str] = None
    katib_id: Optional[str] = None
    tracking_code: Optional[str] = None


class ContractSummaryJson(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    type: str
    ssot_kind: Optional[str] = None
    status: str
    step: str
    parties: Dict[str, Any] = Field(default_factory=dict)
    is_owner: bool = True
    key: str = "mock-key"
    password: Optional[str] = None
    created_at: str
    home_info: Optional[Dict[str, Any]] = None
    dating_info: Optional[Dict[str, Any]] = None
    mortgage_info: Optional[Dict[str, Any]] = None
    renting_info: Optional[Dict[str, Any]] = None
    signings: Optional[List[Dict[str, Any]]] = None


class ContractStatusResponse(BaseModel):
    status: str
    step: str
    contract_id: str
    type: str
    next_step: Optional[str] = Field(
        default=None,
        description="همان گام جاری برای مصرف فرانت؛ پس از هر POST نیز برمی‌گردد",
    )


class ContractTermsPatchBody(BaseModel):
    """شرایط پلی‌مورفیک قرارداد — نگاه کنید به docs/CONTRACT_DATA_MODELS.md."""

    model_config = ConfigDict(extra="forbid")

    terms: Dict[str, Any] = Field(
        default_factory=dict,
        description="JSON مطابق ssot_kind (مثلاً sale/rent/exchange)",
    )


class CommissionCreateBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    commission_type: Literal[
        "RENT_COMMISSION",
        "SALE_COMMISSION",
        "EXCHANGE_COMMISSION",
        "CONSTRUCTION_COMMISSION",
    ]
    paid_by: Literal["PARTY_A", "PARTY_B", "BOTH", "CONTRACT_CREATOR"]
    amount: int = Field(..., ge=0)
    status: Literal["PENDING", "PAID"] = "PENDING"
    payment_method: Optional[Literal["SELF", "AGENT", "ADMIN"]] = None


class CommissionRecordRead(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    contract_id: str
    commission_type: str
    paid_by: str
    amount: int
    status: str
    payment_method: Optional[str] = None
    created_at: str


class CommissionListResponse(BaseModel):
    items: List[CommissionRecordRead]


class CommissionDelegateRequestBody(BaseModel):
    """P2: کاتب می‌خواهد از طرف پرداخت کند — OTP به موبایل طرف."""

    model_config = ConfigDict(extra="forbid")

    party_id: str = Field(..., min_length=1)


class CommissionDelegateVerifyBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    otp: str
    mobile: str
    party_id: str
    challenge_id: Optional[str] = None
    salt: str = ""
