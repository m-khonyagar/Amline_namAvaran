"""Temporal activities (I/O allowed)."""

from __future__ import annotations

import logging

from temporalio import activity

log = logging.getLogger("temporal.amline")


@activity.defn
def log_platform_signal(payload: dict) -> str:
    log.info(
        "platform_signal kind=%s entity_id=%s",
        payload.get("kind"),
        payload.get("entity_id"),
    )
    return "logged"


@activity.defn
def contract_lifecycle_milestone(payload: dict) -> str:
    """نقاط قرارداد v2: پیش‌نویس → امضا → نهایی‌سازی (لاگ عملیاتی)."""
    log.info(
        "contract_lifecycle milestone=%s contract_id=%s",
        payload.get("milestone"),
        payload.get("contract_id"),
    )
    return "milestone_logged"
