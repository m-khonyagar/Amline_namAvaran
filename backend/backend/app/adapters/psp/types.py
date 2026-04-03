"""Shared types for PSP adapters (Zarinpal / IDPay / NextPay)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class PspVerifyResult:
    """Result of provider-side verification (REST verify call or callback validation)."""

    success: bool
    psp_reference: Optional[str] = None
    raw_payload: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    provider_status: Optional[Any] = None
