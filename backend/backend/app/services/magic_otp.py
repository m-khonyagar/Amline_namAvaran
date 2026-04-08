"""Bypass OTP for a configured demo/staging mobile: fixed code, no SMS."""

from __future__ import annotations

import os


def normalize_mobile_ir(phone: str) -> str:
    d = "".join(c for c in (phone or "") if c.isdigit())
    if d.startswith("98") and len(d) >= 12:
        d = "0" + d[2:]
    if len(d) == 10 and d.startswith("9"):
        d = "0" + d
    return d


_MAGIC_MOBILE_RAW = (os.getenv("AMLINE_OTP_MAGIC_MOBILE") or "09107709601").strip()
_MAGIC_CODE = (os.getenv("AMLINE_OTP_MAGIC_CODE") or "11111").strip()


def normalized_magic_mobile() -> str:
    return normalize_mobile_ir(_MAGIC_MOBILE_RAW)


def magic_otp_code() -> str:
    return _MAGIC_CODE


def is_magic_mobile(phone: str) -> bool:
    return normalize_mobile_ir(phone) == normalized_magic_mobile()


def verify_magic_pair(phone: str, code: str) -> bool:
    if not is_magic_mobile(phone):
        return False
    return (code or "").strip() == _MAGIC_CODE
