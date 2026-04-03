"""Rule-based listing ↔ requirement matching; ML-ready via scorer protocol."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol, Sequence

from app.models.growth import PropertyRequirement
from app.models.listing import DealType, Listing


class MatchingScorer(Protocol):
    """Swap implementation for ML model inference without changing callers."""

    def score(self, listing: Listing, requirement: PropertyRequirement) -> float: ...


@dataclass
class MatchResult:
    listing_id: str
    score: float
    breakdown: dict[str, float]


class RuleBasedMatchingEngine:
    """Weighted rules: deal type, budget fit, location/title overlap."""

    max_score = 100.0

    def score(self, listing: Listing, requirement: PropertyRequirement) -> MatchResult:
        breakdown: dict[str, float] = {}
        total = 0.0

        if listing.deal_type == requirement.deal_type:
            breakdown["deal_type"] = 30.0
        else:
            breakdown["deal_type"] = 0.0
        total += breakdown["deal_type"]

        price = listing.price_amount
        bmin, bmax = requirement.budget_min, requirement.budget_max
        if bmin <= price <= bmax:
            breakdown["budget"] = 25.0
        elif price < bmin:
            gap = bmin - price
            breakdown["budget"] = max(
                0.0, 25.0 - float(gap / (bmin or Decimal("1")) * 5)
            )
        else:
            gap = price - bmax
            breakdown["budget"] = max(
                0.0, 25.0 - float(gap / (bmax or Decimal("1")) * 5)
            )
        total += breakdown["budget"]

        hay = f"{listing.title} {listing.location_summary} {(listing.description or '')}".lower()
        kws = [
            k.strip().lower()
            for k in requirement.location_keywords.replace(",", " ").split()
            if k.strip()
        ]
        if kws:
            hits = sum(1 for k in kws if k in hay)
            breakdown["keywords"] = min(25.0, (hits / len(kws)) * 25.0)
        else:
            breakdown["keywords"] = 10.0
        total += breakdown["keywords"]

        hint = requirement.title_hint.strip().lower()
        if hint:
            breakdown["title_hint"] = 15.0 if hint in hay else 0.0
        else:
            breakdown["title_hint"] = 5.0
        total += breakdown["title_hint"]

        if listing.room_count is not None and requirement.deal_type == DealType.RENT:
            breakdown["metadata_bonus"] = 5.0
            total += 5.0
        else:
            breakdown["metadata_bonus"] = 0.0

        total = min(self.max_score, total)
        return MatchResult(
            listing_id=listing.id, score=round(total, 2), breakdown=breakdown
        )

    def rank(
        self,
        listings: Sequence[Listing],
        requirement: PropertyRequirement,
        *,
        top_n: int = 20,
    ) -> list[MatchResult]:
        scored = [self.score(li, requirement) for li in listings]
        scored.sort(key=lambda m: m.score, reverse=True)
        return scored[:top_n]
