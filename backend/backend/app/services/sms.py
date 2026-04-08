"""SMS service — Kavenegar with fallback to log."""
from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)


def send_otp_sms(mobile: str, code: str) -> bool:
    """
    ارسال OTP از طریق Kavenegar.
    اگر KAVENEGAR_API_KEY تنظیم نشده باشد، کد را فقط log می‌کند (برای staging).
    """
    api_key = os.getenv("KAVENEGAR_API_KEY", "")
    template = os.getenv("KAVENEGAR_OTP_TEMPLATE", "")

    if not api_key:
        # staging/dev: فقط log کن
        logger.warning("SMS not sent (no KAVENEGAR_API_KEY). OTP for %s: %s", mobile, code)
        return False

    try:
        import httpx
        if template:
            # ارسال با template
            url = f"https://api.kavenegar.com/v1/{api_key}/verify/lookup.json"
            resp = httpx.post(url, data={
                "receptor": mobile,
                "token": code,
                "template": template,
            }, timeout=10)
        else:
            # ارسال پیامک ساده
            url = f"https://api.kavenegar.com/v1/{api_key}/sms/send.json"
            resp = httpx.post(url, data={
                "receptor": mobile,
                "message": f"کد تأیید اَملاین: {code}",
                "sender": os.getenv("KAVENEGAR_SENDER", ""),
            }, timeout=10)

        if resp.status_code == 200:
            logger.info("OTP SMS sent to %s", mobile)
            return True
        else:
            logger.error("Kavenegar error %s: %s", resp.status_code, resp.text)
            return False
    except Exception as e:
        logger.error("SMS send failed: %s", e)
        return False
