"""Optional IP allowlist and proxy-aware client extraction for PSP callbacks."""

from __future__ import annotations

import ipaddress
import os

from fastapi import Request

from app.core.errors import AmlineError


def _client_ip(request: Request) -> str:
    if os.getenv("AMLINE_PSP_TRUST_X_FORWARDED_FOR", "").lower() in (
        "1",
        "true",
        "yes",
    ):
        xff = request.headers.get("x-forwarded-for") or request.headers.get(
            "X-Forwarded-For"
        )
        if xff:
            return xff.split(",")[0].strip()
    if request.client:
        return request.client.host
    return ""


def assert_psp_callback_ip_allowed(request: Request) -> None:
    """If AMLINE_PSP_CALLBACK_CIDRS is set, require client IP ∈ one of the networks."""
    raw = (os.getenv("AMLINE_PSP_CALLBACK_CIDRS") or "").strip()
    if not raw:
        return
    ip_s = _client_ip(request)
    if not ip_s:
        raise AmlineError(
            "PSP_CALLBACK_FORBIDDEN",
            "آدرس فراخوان مشخص نیست.",
            status_code=403,
        )
    try:
        addr = ipaddress.ip_address(ip_s)
    except ValueError as e:
        raise AmlineError(
            "PSP_CALLBACK_FORBIDDEN",
            "آدرس فراخوان نامعتبر است.",
            status_code=403,
            details={"client": ip_s},
        ) from e
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            if addr in ipaddress.ip_network(part, strict=False):
                return
        except ValueError:
            continue
    raise AmlineError(
        "PSP_CALLBACK_FORBIDDEN",
        "آدرس فراخوان در محدودهٔ مجاز نیست.",
        status_code=403,
        details={"client": ip_s},
    )
