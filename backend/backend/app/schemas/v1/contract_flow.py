"""اسکیماهای Pydantic جریان قرارداد (هم‌تراز SwaggerHub 0.1.3)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ContractStartBody(BaseModel):
    model_config = ConfigDict(extra="allow")

    contract_type: Optional[str] = "PROPERTY_RENT"
    party_type: Optional[str] = None


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


class ContractSummaryJson(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    type: str
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
