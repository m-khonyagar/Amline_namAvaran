"""IDPay REST v1.1: create payment + verify."""

from __future__ import annotations

import json
import os
from typing import TYPE_CHECKING, Optional

import httpx

from app.adapters.psp.types import PspVerifyResult
from app.core.errors import AmlineError

if TYPE_CHECKING:
    from app.models.payment import PaymentIntent
    from app.repositories.v1.p1_repositories import PaymentRepository


def _api_base() -> str:
    return os.getenv("IDPAY_API_BASE", "https://api.idpay.ir/v1.1").rstrip("/")


class IdpayPspAdapter:
    provider_key = "idpay"

    def resume_checkout_url(self, intent: PaymentIntent) -> Optional[str]:
        if intent.psp_checkout_token:
            base = os.getenv(
                "IDPAY_START_LINK_PREFIX", "https://idpay.ir/p/ws/start"
            ).rstrip("/")
            return f"{base}/{intent.psp_checkout_token}"
        return None

    def initiate_checkout(
        self,
        repo: PaymentRepository,
        intent: PaymentIntent,
        callback_url: str,
    ) -> str:
        existing = self.resume_checkout_url(intent)
        if existing and intent.psp_provider == self.provider_key:
            return existing
        api_key = os.getenv("IDPAY_API_KEY", "").strip()
        if not api_key:
            raise AmlineError(
                "PSP_CONFIG_MISSING",
                "IDPAY_API_KEY تنظیم نشده است.",
                status_code=503,
            )
        sandbox = os.getenv("IDPAY_SANDBOX", "1").lower() in ("1", "true", "yes")
        headers = {
            "Content-Type": "application/json",
            "X-API-KEY": api_key,
            "X-SANDBOX": "1" if sandbox else "0",
        }
        name = os.getenv("IDPAY_PAYER_NAME", "Amline user")[:128]
        payload = {
            "order_id": intent.id,
            "amount": int(intent.amount_cents),
            "callback": callback_url,
            "name": name,
        }
        url = f"{_api_base()}/payment"
        try:
            r = httpx.post(url, headers=headers, json=payload, timeout=30.0)
            r.raise_for_status()
            data = r.json()
        except (httpx.HTTPError, ValueError, json.JSONDecodeError) as e:
            raise AmlineError(
                "PSP_REQUEST_FAILED",
                "درخواست آیدی‌پی ناموفق بود.",
                status_code=502,
                details={"provider": "idpay", "error": str(e)},
            ) from e
        pid = data.get("id")
        link = data.get("link")
        error_msg = data.get("error_message") or data.get("message")
        if not pid or not link:
            raise AmlineError(
                "PSP_REQUEST_INVALID",
                error_msg or "پاسخ آیدی‌پی ناقص است.",
                status_code=502,
                details={"response": data},
            )
        repo.set_psp_session(
            intent, provider=self.provider_key, checkout_token=str(pid)
        )
        return str(link)


def verify_idpay_payment(
    payment_id: str,
    order_id: str,
) -> PspVerifyResult:
    api_key = os.getenv("IDPAY_API_KEY", "").strip()
    if not api_key:
        return PspVerifyResult(
            success=False,
            error_code="PSP_CONFIG_MISSING",
            error_message="IDPAY_API_KEY تنظیم نشده است.",
        )
    sandbox = os.getenv("IDPAY_SANDBOX", "1").lower() in ("1", "true", "yes")
    headers = {
        "Content-Type": "application/json",
        "X-API-KEY": api_key,
        "X-SANDBOX": "1" if sandbox else "0",
    }
    payload = {"id": payment_id, "order_id": order_id}
    url = f"{_api_base()}/payment/verify"
    try:
        r = httpx.post(url, headers=headers, json=payload, timeout=30.0)
        r.raise_for_status()
        data = r.json()
    except (httpx.HTTPError, ValueError, json.JSONDecodeError) as e:
        return PspVerifyResult(
            success=False,
            error_code="PSP_VERIFY_HTTP_ERROR",
            error_message=str(e),
        )
    raw = json.dumps(data, ensure_ascii=False)
    status = data.get("status")
    track_id = data.get("track_id")
    if status in (100, 101):
        ref = str(track_id) if track_id is not None else str(payment_id)
        return PspVerifyResult(
            success=True,
            psp_reference=ref,
            raw_payload=raw,
            provider_status=status,
        )
    return PspVerifyResult(
        success=False,
        raw_payload=raw,
        error_code=f"IDPAY_STATUS_{status}",
        error_message=data.get("error_message") or str(status),
        provider_status=status,
    )
