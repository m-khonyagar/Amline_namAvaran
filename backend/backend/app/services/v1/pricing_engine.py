"""Rule-based price suggestion from peer listings; ML-ready via estimator hook."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.listing import Listing, ListingStatus


class PricingEstimator(Protocol):
    def estimate(self, db: Session, listing: Listing) -> "PriceEstimate": ...


@dataclass
class PriceEstimate:
    suggested_price: Decimal
    currency: str
    confidence: float
    basis: str
    peer_sample_size: int


class RuleBasedPricingEngine:
    def estimate(self, db: Session, listing: Listing) -> PriceEstimate:
        n_peers = int(
            db.scalar(
                select(func.count())
                .select_from(Listing)
                .where(
                    Listing.deal_type == listing.deal_type,
                    Listing.status == ListingStatus.PUBLISHED,
                )
            )
            or 0
        )

        avg_val = db.scalar(
            select(func.avg(Listing.price_amount)).where(
                Listing.deal_type == listing.deal_type,
                Listing.status == ListingStatus.PUBLISHED,
            )
        )

        if avg_val is None or n_peers == 0:
            return PriceEstimate(
                suggested_price=listing.price_amount,
                currency=listing.currency,
                confidence=0.35,
                basis="no_peer_data_fallback_current",
                peer_sample_size=0,
            )

        avg = Decimal(str(avg_val))
        loc = (listing.location_summary or "").lower()
        adjustment = Decimal("1.0")
        if "تهران" in loc or "tehran" in loc:
            adjustment = Decimal("1.08")
        elif loc:
            adjustment = Decimal("0.97")

        suggested = (avg * adjustment).quantize(Decimal("0.01"))
        confidence = min(0.92, 0.45 + min(n_peers, 50) * 0.01)
        return PriceEstimate(
            suggested_price=suggested,
            currency=listing.currency,
            confidence=round(confidence, 2),
            basis="peer_avg_times_location_factor",
            peer_sample_size=n_peers,
        )
