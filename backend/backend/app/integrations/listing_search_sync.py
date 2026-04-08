"""Push listing changes to external search (Meilisearch) — best-effort."""

from __future__ import annotations

import logging

from app.integrations import meilisearch_listings as meili
from app.models.listing import Listing, ListingStatus

log = logging.getLogger(__name__)


def sync_listing_to_external_search(row: Listing) -> None:
    if not meili.meilisearch_enabled():
        return
    if not meili.is_configured():
        log.debug("meilisearch URL not set; skip sync")
        return
    if row.status == ListingStatus.ARCHIVED:
        meili.delete_listing(row.id)
        return
    meili.ensure_index_settings()
    meili.upsert_listing(row)


def remove_listing_from_external_search(listing_id: str) -> None:
    if not meili.meilisearch_enabled():
        return
    meili.delete_listing(listing_id)
