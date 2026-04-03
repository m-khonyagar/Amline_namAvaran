"""Lightweight collaborative-filtering style listing recommendations from ratings."""

from __future__ import annotations

from collections import defaultdict
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.growth import Rating, RatingTargetType


def recommend_listings_cf(
    db: Session,
    *,
    user_id: str,
    limit: int = 10,
    min_peer_stars: int = 4,
) -> list[tuple[str, float, str]]:
    """
    Returns [(listing_id, score, reason), ...].
    Peers = users who rated highly (>=min_peer_stars) the same listings as user_id.
    Scores = sum of peer stars for candidate listings not yet rated by user_id.
    """
    my_ratings = list(
        db.scalars(
            select(Rating).where(
                Rating.rater_id == user_id,
                Rating.target_type == RatingTargetType.LISTING,
            )
        ).all()
    )
    my_listing_ids = {r.target_id for r in my_ratings}
    if not my_listing_ids:
        return []

    peer_rows = list(
        db.scalars(
            select(Rating).where(
                Rating.target_type == RatingTargetType.LISTING,
                Rating.target_id.in_(my_listing_ids),
                Rating.rater_id != user_id,
                Rating.stars >= min_peer_stars,
            )
        ).all()
    )
    peers = {r.rater_id for r in peer_rows}
    if not peers:
        return []

    candidate_scores: dict[str, float] = defaultdict(float)
    for r in db.scalars(
        select(Rating).where(
            Rating.target_type == RatingTargetType.LISTING,
            Rating.rater_id.in_(peers),
            Rating.stars >= min_peer_stars,
        )
    ).all():
        if r.target_id in my_listing_ids:
            continue
        candidate_scores[r.target_id] += float(r.stars)

    ranked = sorted(candidate_scores.items(), key=lambda x: -x[1])[:limit]
    return [(lid, score, "collaborative_filtering_ratings") for lid, score in ranked]


def fallback_recent_listings(db: Session, limit: int) -> list[tuple[str, float, str]]:
    from app.repositories.listing_repository import ListingRepository

    rows, _ = ListingRepository(db).list(skip=0, limit=limit)
    return [
        (r.id, 1.0 - i * 0.01, "recent_publication_order") for i, r in enumerate(rows)
    ]


def listing_recommendations_mixed(
    db: Session,
    *,
    user_id: Optional[str],
    limit: int,
) -> list[tuple[str, float, str]]:
    if user_id:
        cf = recommend_listings_cf(db, user_id=user_id, limit=limit)
        if cf:
            return cf
    return fallback_recent_listings(db, limit)
