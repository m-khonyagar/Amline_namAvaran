"""هشدارهای امنیتی در استارت اپ (بدون شکستن dev)."""

from __future__ import annotations

import logging
import os

log = logging.getLogger(__name__)


def log_security_warnings() -> None:
    env = (os.getenv("AMLINE_ENV") or os.getenv("ENV") or "").lower()
    if env not in ("production", "prod"):
        return
    if not (os.getenv("AMLINE_JWT_SECRET") or "").strip():
        log.warning(
            "AMLINE_JWT_SECRET is unset while AMLINE_ENV/ENV suggests production — "
            "configure signing keys before exposing this instance."
        )
    if os.getenv("AMLINE_AUTH_USE_MOCK", "").lower() in ("1", "true", "yes"):
        log.warning("AMLINE_AUTH_USE_MOCK is enabled — disable in production.")
