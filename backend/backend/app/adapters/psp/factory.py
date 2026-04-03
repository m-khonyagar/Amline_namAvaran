from __future__ import annotations

import os

from app.adapters.psp.base import PspAdapter
from app.adapters.psp.idpay import IdpayPspAdapter
from app.adapters.psp.mock import MockPspAdapter
from app.adapters.psp.nextpay import NextPayPspAdapter
from app.adapters.psp.zarinpal import ZarinpalPspAdapter


def get_psp_adapter() -> PspAdapter:
    p = (os.getenv("AMLINE_PSP_PROVIDER") or "mock").lower().strip()
    if p == "zarinpal":
        return ZarinpalPspAdapter()
    if p == "idpay":
        return IdpayPspAdapter()
    if p in ("nextpay", "next_pay"):
        return NextPayPspAdapter()
    return MockPspAdapter()


def verify_psp_callback_params(provider: str, params: dict) -> bool:
    """
    Legacy hook — real verification is provider REST + callback routes.
    When AMLINE_PSP_VERIFY_STRICT=1, JSON callback must include verified=true (dev only).
    """
    if os.getenv("AMLINE_PSP_VERIFY_STRICT", "").lower() in ("1", "true", "yes"):
        return bool(params.get("verified"))
    return True
