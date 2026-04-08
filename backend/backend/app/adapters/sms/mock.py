from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


class MockSmsAdapter:
    """Default dev adapter: log OTP (no real SMS)."""

    last_sent: tuple[str, str] | None = None

    def send_sms(self, phone: str, message: str) -> bool:
        MockSmsAdapter.last_sent = (phone, message)
        logger.info("MockSMS to=%s msg=%s", phone, message)
        return True
