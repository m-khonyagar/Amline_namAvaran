from __future__ import annotations

from typing import Protocol, runtime_checkable


@runtime_checkable
class SmsAdapter(Protocol):
    """SMS delivery abstraction; use Kavenegar (or other) in production."""

    def send_sms(self, phone: str, message: str) -> bool:
        """Return True when the provider accepted the send request."""
        ...
