"""Fire-and-forget webhooks to n8n (or compatible) for CRM / visits / contracts."""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx

log = logging.getLogger(__name__)


def n8n_dispatch(event: str, payload: dict[str, Any]) -> None:
    url = (os.getenv("AMLINE_N8N_WEBHOOK_URL") or "").strip()
    if not url:
        return
    secret = (os.getenv("AMLINE_N8N_WEBHOOK_SECRET") or "").strip()
    headers = {"Content-Type": "application/json"}
    if secret:
        headers["X-Amline-N8N-Secret"] = secret
    body = {"source": "amline", "event": event, "payload": payload}
    try:
        httpx.post(url, json=body, headers=headers, timeout=5.0)
    except httpx.HTTPError as e:
        log.debug("n8n webhook failed: %s", e)
