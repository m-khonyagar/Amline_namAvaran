from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.payment import PaymentIntentStatus


class PaymentIntentCreate(BaseModel):
    user_id: str
    amount_cents: int = Field(..., gt=0)
    currency: str = "IRR"
    idempotency_key: str = Field(..., min_length=8, max_length=128)


class PaymentIntentRead(BaseModel):
    id: str
    user_id: str
    amount_cents: int
    currency: str
    idempotency_key: str
    status: PaymentIntentStatus
    psp_reference: Optional[str] = None
    psp_provider: Optional[str] = None
    checkout_url: Optional[str] = None


class PaymentIntentDetailRead(PaymentIntentRead):
    psp_checkout_token: Optional[str] = None
    last_verify_error: Optional[str] = None
    verify_attempt_count: int = 0
    callback_payload: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class PaymentIntentListResponse(BaseModel):
    total: int
    items: List[PaymentIntentDetailRead]


class PaymentCallbackBody(BaseModel):
    intent_id: str
    success: bool
    psp_reference: Optional[str] = None
    raw: Optional[str] = None
