from __future__ import annotations

from typing import List

from app.adapters.sms.base import SmsAdapter


class FallbackSmsAdapter:
    """Try adapters in order until one returns True (or last raises)."""

    def __init__(self, adapters: List[SmsAdapter]) -> None:
        self._adapters = adapters

    def send_sms(self, phone: str, message: str) -> bool:
        last_exc: BaseException | None = None
        for a in self._adapters:
            try:
                if a.send_sms(phone, message):
                    return True
            except BaseException as e:
                last_exc = e
                continue
        if last_exc:
            raise last_exc
        return False
