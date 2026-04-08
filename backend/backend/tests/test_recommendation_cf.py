"""Collaborative-filtering listing recommendations."""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from app.db.session import SessionLocal
from app.models.growth import Rating, RatingTargetType
from app.models.listing import DealType, Listing, ListingStatus, ListingVisibility
from app.services.v1.recommendation_cf import recommend_listings_cf


def _listing(
    lid: str,
) -> Listing:
    return Listing(
        id=lid,
        deal_type=DealType.RENT,
        visibility=ListingVisibility.PUBLIC,
        price_amount=Decimal("1000000000"),
        currency="IRR",
        location_summary="Tehran",
        title="t",
        owner_id="o1",
        status=ListingStatus.PUBLISHED,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def test_cf_suggests_peer_listing() -> None:
    db = SessionLocal()
    try:
        shared = "list-shared"
        novel = "list-novel"
        db.add(_listing(shared))
        db.add(_listing(novel))
        db.add(
            Rating(
                target_type=RatingTargetType.LISTING,
                target_id=shared,
                rater_id="alice",
                stars=5,
                created_at=datetime.now(timezone.utc),
            )
        )
        db.add(
            Rating(
                target_type=RatingTargetType.LISTING,
                target_id=shared,
                rater_id="bob",
                stars=5,
                created_at=datetime.now(timezone.utc),
            )
        )
        db.add(
            Rating(
                target_type=RatingTargetType.LISTING,
                target_id=novel,
                rater_id="bob",
                stars=5,
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

        out = recommend_listings_cf(db, user_id="alice", limit=5)
        ids = [x[0] for x in out]
        assert novel in ids
        assert all(x[2] == "collaborative_filtering_ratings" for x in out if x[0] == novel)
    finally:
        db.close()
