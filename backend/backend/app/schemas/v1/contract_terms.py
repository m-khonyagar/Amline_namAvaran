"""Type-safe Pydantic schemas for polymorphic contract terms (PRD §8.4).

Each ``ssot_kind`` maps to a dedicated schema so that frontend and backend
share a validated, documented data-contract instead of a generic ``Dict``.
"""

from __future__ import annotations

from datetime import date
from typing import List, Optional, Union

from pydantic import BaseModel, ConfigDict, Field


# ────────────────── helper sub-models ──────────────────


class PaymentPlanItem(BaseModel):
    """یک قسط از برنامه پرداخت."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., description="عنوان قسط (مثلاً «پیش‌پرداخت»)")
    amount: int = Field(..., ge=0, description="مبلغ به ریال")
    due_date: date = Field(..., description="سررسید")


class PaymentStage(BaseModel):
    """مرحله پرداخت در پیش‌فروش."""

    model_config = ConfigDict(extra="forbid")

    stage_name: str = Field(..., description="نام مرحله (مثلاً «فونداسیون»)")
    amount: int = Field(..., ge=0, description="مبلغ به ریال")
    due_date: date = Field(..., description="سررسید مرحله")


# ────────────────── terms per contract kind ──────────────────


class RentTerms(BaseModel):
    """شرایط قرارداد رهن و اجاره (ssot_kind=RENT)."""

    model_config = ConfigDict(extra="forbid")

    property_address: str
    rent_amount: int = Field(..., ge=0, description="مبلغ اجاره ماهیانه به ریال")
    deposit_amount: int = Field(..., ge=0, description="مبلغ رهن به ریال")
    contract_duration_months: int = Field(..., ge=1)
    start_date: date
    end_date: date
    special_conditions: Optional[str] = None


class SaleTerms(BaseModel):
    """شرایط قرارداد خرید و فروش (ssot_kind=SALE)."""

    model_config = ConfigDict(extra="forbid")

    property_address: str
    total_price: int = Field(..., ge=0, description="قیمت کل به ریال")
    payment_plan: List[PaymentPlanItem] = Field(default_factory=list)
    transfer_date: date
    has_encumbrance: bool = False
    encumbrance_details: Optional[str] = None


class ExchangeTerms(BaseModel):
    """شرایط قرارداد معاوضه (ssot_kind=EXCHANGE)."""

    model_config = ConfigDict(extra="forbid")

    first_property_address: str
    second_property_address: str
    price_difference: int = Field(
        ..., description="مابه‌التفاوت به ریال (مثبت = طرف اول بیشتر می‌پردازد)"
    )
    payment_plan: List[PaymentPlanItem] = Field(default_factory=list)


class ConstructionTerms(BaseModel):
    """شرایط قرارداد مشارکت در ساخت (ssot_kind=CONSTRUCTION)."""

    model_config = ConfigDict(extra="forbid")

    land_address: str
    land_owner_share_percent: int = Field(
        ..., ge=0, le=100, description="سهم مالک زمین (درصد)"
    )
    contractor_share_percent: int = Field(
        ..., ge=0, le=100, description="سهم سازنده (درصد)"
    )
    estimated_completion_date: date
    penalty_for_delay: int = Field(
        ..., ge=0, description="جریمه تأخیر (ریال/روز)"
    )


class PreSaleTerms(BaseModel):
    """شرایط قرارداد پیش‌فروش آپارتمان (ssot_kind=PRE_SALE)."""

    model_config = ConfigDict(extra="forbid")

    project_name: str
    unit_number: str
    total_price: int = Field(..., ge=0, description="قیمت کل به ریال")
    payment_schedule: List[PaymentStage] = Field(default_factory=list)
    delivery_date: date
    penalty_for_delay: int = Field(
        ..., ge=0, description="جریمه تأخیر تحویل (ریال/روز)"
    )


class LeaseToOwnTerms(BaseModel):
    """شرایط قرارداد اجاره به شرط تملیک (ssot_kind=LEASE_TO_OWN)."""

    model_config = ConfigDict(extra="forbid")

    property_address: str
    monthly_rent: int = Field(..., ge=0, description="اجاره ماهیانه به ریال")
    contract_duration_months: int = Field(..., ge=1)
    final_purchase_price: int = Field(..., ge=0, description="قیمت نهایی خرید به ریال")
    rent_credited_to_price: int = Field(
        ..., ge=0, description="مقدار اجاره قابل محاسبه در قیمت خرید"
    )
    purchase_option_deadline: date


# ────────────────── discriminated union ──────────────────

ContractTermsUnion = Union[
    RentTerms,
    SaleTerms,
    ExchangeTerms,
    ConstructionTerms,
    PreSaleTerms,
    LeaseToOwnTerms,
]

SSOT_KIND_TO_SCHEMA: dict[str, type[BaseModel]] = {
    "RENT": RentTerms,
    "SALE": SaleTerms,
    "EXCHANGE": ExchangeTerms,
    "CONSTRUCTION": ConstructionTerms,
    "PRE_SALE": PreSaleTerms,
    "LEASE_TO_OWN": LeaseToOwnTerms,
}
