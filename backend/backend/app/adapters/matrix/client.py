"""
Matrix (Element) client — optional C-S API when MATRIX_HOMESERVER_URL + MATRIX_ACCESS_TOKEN are set.
For Synapse deploy steps see docs/MATRIX_SETUP.md.
"""

from __future__ import annotations

import os
from typing import Any, Optional
from urllib.parse import quote

import httpx


def matrix_configured() -> bool:
    return bool((os.getenv("MATRIX_HOMESERVER_URL") or "").strip())


def _headers() -> dict[str, str]:
    token = (os.getenv("MATRIX_ACCESS_TOKEN") or "").strip()
    h: dict[str, str] = {"Content-Type": "application/json"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def _base() -> str:
    return (os.getenv("MATRIX_HOMESERVER_URL") or "").rstrip("/")


def ensure_room_for_agency(agency_id: str, display_name: str) -> Optional[str]:
    """Create a private room for an agency; returns room_id or None if not configured / on error."""
    if not matrix_configured() or not (os.getenv("MATRIX_ACCESS_TOKEN") or "").strip():
        return None
    url = f"{_base()}/_matrix/client/v3/createRoom"
    body = {
        "name": display_name[:200],
        "preset": "private_chat",
        "topic": f"Amline agency {agency_id}",
    }
    try:
        r = httpx.post(url, headers=_headers(), json=body, timeout=15.0)
        if r.status_code >= 400:
            return None
        data = r.json()
        rid = data.get("room_id")
        return str(rid) if rid else None
    except httpx.HTTPError:
        return None


def send_matrix_message(
    room_id: str, body: str, user_id: Optional[str] = None
) -> dict[str, Any]:
    _ = user_id
    if not matrix_configured() or not (os.getenv("MATRIX_ACCESS_TOKEN") or "").strip():
        return {"ok": False, "reason": "matrix_not_configured"}
    rid = quote(room_id, safe=":!$#@[](),;")
    txn = __import__("uuid").uuid4().hex[:16]
    url_txn = f"{_base()}/_matrix/client/v3/rooms/{rid}/send/m.room.message/{txn}"
    try:
        r = httpx.put(
            url_txn,
            headers=_headers(),
            json={"msgtype": "m.text", "body": body},
            timeout=15.0,
        )
        if r.status_code >= 400:
            return {"ok": False, "reason": r.text[:200], "status": r.status_code}
        return {"ok": True, "data": r.json()}
    except httpx.HTTPError as e:
        return {"ok": False, "reason": str(e)}
