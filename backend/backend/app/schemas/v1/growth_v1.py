from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.growth import RatingTargetType, RequirementStatus
from app.models.listing import DealType
from app.schemas.v1.listings import ListingRead


# --- Requirements ---
class RequirementCreate(BaseModel):
    deal_type: DealType
    budget_min: Decimal
    budget_max: Decimal
    location_keywords: str = ""
    title_hint: str = ""


class RequirementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    owner_user_id: str
    deal_type: DealType
    budget_min: Decimal
    budget_max: Decimal
    location_keywords: str
    title_hint: str
    status: RequirementStatus
    created_at: datetime
    updated_at: datetime


# --- Matching ---
class MatchSuggestionItem(BaseModel):
    listing_id: str
    score: float
    breakdown: dict[str, float]


class MatchSuggestionsResponse(BaseModel):
    requirement_id: str
    items: List[MatchSuggestionItem]


# --- Pricing ---
class PriceEstimateResponse(BaseModel):
    listing_id: str
    suggested_price: Decimal
    currency: str
    confidence: float
    basis: str
    peer_sample_size: int


# --- Chat ---
class ConversationCreate(BaseModel):
    title: str = ""
    listing_id: Optional[str] = None
    requirement_id: Optional[str] = None
    participant_user_ids: List[str] = Field(default_factory=list)


class ConversationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    listing_id: Optional[str]
    requirement_id: Optional[str]
    created_by: str
    participants: List[str]
    created_at: datetime

    @classmethod
    def from_orm_conv(cls, c: Any) -> "ConversationRead":
        import json

        parts = json.loads(c.participants_json or "[]")
        return cls(
            id=c.id,
            title=c.title,
            listing_id=c.listing_id,
            requirement_id=c.requirement_id,
            created_by=c.created_by,
            participants=parts if isinstance(parts, list) else [],
            created_at=c.created_at,
        )


class MessageCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=8000)


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    conversation_id: str
    sender_id: str
    body: str
    created_at: datetime
    read_at: Optional[datetime]


class MessageListResponse(BaseModel):
    items: List[MessageRead]
    total: int
    skip: int
    limit: int


class ConversationListResponse(BaseModel):
    items: List[ConversationRead]
    total: int
    skip: int
    limit: int


# --- Ratings ---
class RatingCreate(BaseModel):
    target_type: RatingTargetType
    target_id: str
    rater_id: str = Field(default="mock-001")
    stars: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class RatingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    target_type: RatingTargetType
    target_id: str
    rater_id: str
    stars: int
    comment: Optional[str]
    created_at: datetime


class RatingSummaryResponse(BaseModel):
    target_type: RatingTargetType
    target_id: str
    average_stars: float
    count: int


# --- Mobile ---
class MobileMetaResponse(BaseModel):
    api_version: str
    default_page_size: int
    max_page_size: int
    pagination_style: str = "cursor"
    features: dict[str, str]


class ListingCursorResponse(BaseModel):
    items: List[ListingRead]
    next_cursor: Optional[str]
    limit: int


# --- Search ---
class SearchListingsResponse(BaseModel):
    items: List[ListingRead]
    total: int
    skip: int
    limit: int
    engine: str = "sqlite_fts_fallback"
    facets: Optional[dict[str, Any]] = None


# --- Analytics ---
class AnalyticsEventIngest(BaseModel):
    event_name: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    properties: Optional[dict[str, Any]] = None


class AnalyticsEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    event_name: str
    user_id: Optional[str]
    session_id: Optional[str]
    created_at: datetime


class AnalyticsSummaryResponse(BaseModel):
    groups: List[dict[str, Any]]


# --- Public / SEO ---
class SiteMetaResponse(BaseModel):
    site_name: str
    description: str
    base_url: str
    language: str = "fa"


class PublicListingFeedResponse(BaseModel):
    items: List[ListingRead]
    total: int
    page: int
    limit: int
