"""ML pricing HTTP service with fallback to rule engine."""

from __future__ import annotations

import json
import logging
import os
import time
from decimal import Decimal
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.core.ml_pricing_metrics import ml_pricing_http_total
from app.models.listing import Listing
from app.services.v1.pricing_engine import PriceEstimate, RuleBasedPricingEngine

log = logging.getLogger(__name__)


class CompositePricingEngine:
    """Try AMLINE_ML_PRICING_URL inference; fallback to RuleBasedPricingEngine."""

    def __init__(self) -> None:
        self._rules = RuleBasedPricingEngine()
        self._url = (os.getenv("AMLINE_ML_PRICING_URL") or "").strip()

    def estimate(self, db: Session, listing: Listing) -> PriceEstimate:
        if self._url:
            est = self._ml_estimate(listing)
            if est is not None:
                return est
        return self._rules.estimate(db, listing)

    def _ml_estimate(self, listing: Listing) -> Optional[PriceEstimate]:
        payload = {
            "listing_id": listing.id,
            "deal_type": listing.deal_type.value,
            "price_amount": str(listing.price_amount),
            "currency": listing.currency,
            "location_summary": listing.location_summary,
            "area_sqm": str(listing.area_sqm) if listing.area_sqm else None,
            "room_count": listing.room_count,
        }
        last_exc: Exception | None = None
        for attempt in range(3):
            try:
                r = httpx.post(self._url, json=payload, timeout=8.0)
                r.raise_for_status()
                data = r.json()
                sp = data.get("suggested_price")
                if sp is None:
                    ml_pricing_http_total.labels(result="empty").inc()
                    return None
                ml_pricing_http_total.labels(result="ok").inc()
                return PriceEstimate(
                    suggested_price=Decimal(str(sp)),
                    currency=str(data.get("currency") or listing.currency),
                    confidence=float(data.get("confidence") or 0.7),
                    basis=str(data.get("basis") or "ml_http_service"),
                    peer_sample_size=int(data.get("peer_sample_size") or 0),
                )
            except (httpx.HTTPError, ValueError, json.JSONDecodeError, KeyError) as e:
                last_exc = e
                log.debug("ml pricing attempt %s failed: %s", attempt + 1, e)
                if attempt < 2:
                    time.sleep(0.35 * (attempt + 1))
        ml_pricing_http_total.labels(result="fallback").inc()
        if last_exc:
            log.debug("ml pricing fallback after retries: %s", last_exc)
        return None
