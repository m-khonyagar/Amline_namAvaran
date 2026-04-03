"""Strip/redact PII from PostHog event properties when AMLINE_POSTHOG_STRIP_PII is enabled."""

from __future__ import annotations

import os
import re
from copy import deepcopy
from typing import Any

_SENSITIVE_KEYS = frozenset(
    {
        "email",
        "phone",
        "mobile",
        "national_id",
        "password",
        "token",
        "session_id",
        "credit_card",
    }
)


def sanitize_posthog_properties(props: dict[str, Any] | None) -> dict[str, Any]:
    if not props:
        return {}
    if os.getenv("AMLINE_POSTHOG_STRIP_PII", "").lower() not in ("1", "true", "yes"):
        return props
    out = deepcopy(props)
    for k in list(out.keys()):
        lk = k.lower()
        if lk in _SENSITIVE_KEYS or "email" in lk or "phone" in lk or "mobile" in lk:
            out[k] = "[redacted]"
        elif isinstance(out[k], str) and _looks_like_email(out[k]):
            out[k] = "[redacted]"
    return out


def _looks_like_email(s: str) -> bool:
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", s.strip()))
