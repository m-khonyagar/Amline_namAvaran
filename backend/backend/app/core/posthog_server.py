"""Server-side PostHog capture (optional)."""

from __future__ import annotations

import logging
import os
from typing import Any, Optional

from app.core.posthog_properties import sanitize_posthog_properties

log = logging.getLogger(__name__)

_client: Any = None


def _get_client() -> Any:
    global _client
    if _client is not None:
        return _client
    key = (
        os.getenv("POSTHOG_API_KEY") or os.getenv("POSTHOG_PROJECT_API_KEY") or ""
    ).strip()
    host = (os.getenv("POSTHOG_HOST") or "https://app.posthog.com").rstrip("/")
    if not key:
        return None
    try:
        from posthog import Posthog

        _client = Posthog(key, host=host)
    except Exception as e:  # noqa: BLE001
        log.warning("posthog init failed: %s", e)
        _client = False
    return _client


def posthog_capture(
    distinct_id: str,
    event: str,
    properties: Optional[dict[str, Any]] = None,
) -> None:
    if os.getenv("POSTHOG_DISABLED", "").lower() in ("1", "true", "yes"):
        return
    c = _get_client()
    if not c:
        return
    try:
        safe = sanitize_posthog_properties(properties or {})
        c.capture(distinct_id=distinct_id, event=event, properties=safe)
    except Exception as e:  # noqa: BLE001
        log.debug("posthog capture failed: %s", e)


def posthog_feature_enabled(flag_key: str, distinct_id: str) -> Optional[bool]:
    c = _get_client()
    if not c:
        return None
    try:
        return bool(c.get_feature_flag(flag_key, distinct_id))
    except Exception:  # noqa: BLE001
        return None
