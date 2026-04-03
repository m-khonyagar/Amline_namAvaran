"""P2 — analytics event ingest and dashboard aggregates."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.posthog_server import posthog_capture
from app.core.rbac_deps import require_permission
from app.db.session import get_db
from app.repositories.v1.p2_repositories import AnalyticsRepository
from app.schemas.v1.growth_v1 import (
    AnalyticsEventIngest,
    AnalyticsEventRead,
    AnalyticsSummaryResponse,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.post("/events", response_model=AnalyticsEventRead, status_code=201)
def ingest_event(
    body: AnalyticsEventIngest,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("analytics:write")),
) -> AnalyticsEventRead:
    row = AnalyticsRepository(db).record(
        event_name=body.event_name,
        user_id=body.user_id,
        session_id=body.session_id,
        properties=body.properties,
    )
    posthog_capture(
        body.user_id or "anonymous",
        body.event_name,
        {**(body.properties or {}), "session_id": body.session_id},
    )
    return AnalyticsEventRead.model_validate(row)


@router.get("/summary", response_model=AnalyticsSummaryResponse)
def analytics_summary(
    event_name: Optional[str] = None,
    since: Optional[datetime] = None,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("analytics:read")),
) -> AnalyticsSummaryResponse:
    since_utc = since
    if since_utc and since_utc.tzinfo is None:
        since_utc = since_utc.replace(tzinfo=timezone.utc)
    groups = AnalyticsRepository(db).summary(event_name=event_name, since=since_utc)
    return AnalyticsSummaryResponse(groups=groups)
