from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class BetaInviteCreate(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    ttl_days: int = Field(14, ge=1, le=90)


class BetaInviteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    status: str
    expires_at: datetime
    created_at: datetime
    token: str | None = None


class BetaAcceptBody(BaseModel):
    token: str = Field(..., min_length=8)
    user_id: str = Field(..., min_length=1, max_length=64)


class OnboardingEventCreate(BaseModel):
    user_id: str | None = None
    step: str = Field(..., min_length=1, max_length=64)
    metadata: dict[str, Any] | None = None


class OnboardingEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    step: str
    created_at: datetime


class OnboardingStatusResponse(BaseModel):
    user_id: str
    steps: List[str]
    last_step: str | None
    events: List[OnboardingEventRead]


class SupportTicketCreate(BaseModel):
    subject: str = Field(..., min_length=2, max_length=512)
    body: str = Field(..., min_length=1)
    priority: str = Field("NORMAL", pattern="^(LOW|NORMAL|HIGH)$")


class SupportTicketRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    subject: str
    status: str
    priority: str
    created_at: datetime
    updated_at: datetime


class SupportMessageCreate(BaseModel):
    body: str = Field(..., min_length=1)


class SupportMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    ticket_id: str
    author_user_id: str
    body: str
    created_at: datetime


class SupportTicketPatch(BaseModel):
    status: str = Field(..., pattern="^(OPEN|IN_PROGRESS|RESOLVED|CLOSED)$")


class SubscriptionPlanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    name_fa: str
    price_cents: int
    cycle: str


class SubscribeBody(BaseModel):
    plan_code: str = Field(..., min_length=2, max_length=64)


class UserSubscriptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    plan_id: str
    status: str
    current_period_end: datetime | None


class InvoiceLineRead(BaseModel):
    description: str
    amount_cents: int


class BillingInvoiceRead(BaseModel):
    subscription_id: str | None = None
    status: str | None = None
    lines: List[InvoiceLineRead]
    total_cents: int
    period_end: datetime | None = None


class AgentKpiResponse(BaseModel):
    visits_total: int
    crm_leads_total: int
    listings_total: int
    payments_completed_total: int


class RecommendationItem(BaseModel):
    listing_id: str
    score: float
    reason: str


class ListingRecommendationsResponse(BaseModel):
    items: List[RecommendationItem]


class ClientErrorIngest(BaseModel):
    message: str = Field(..., max_length=1024)
    stack: Optional[str] = None
    url: Optional[str] = None
    user_id: Optional[str] = None
    fingerprint: Optional[str] = None


class OpsAlertingStatus(BaseModel):
    prometheus_metrics_enabled: bool
    client_error_ingest_key_configured: bool
    error_webhook_configured: bool


class I18nBundleResponse(BaseModel):
    locale: str
    strings: dict[str, str]


class GamificationRead(BaseModel):
    user_id: str
    points: int
    level: int
    badges: list[str]
