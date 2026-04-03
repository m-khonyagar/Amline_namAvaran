from __future__ import annotations

import os


class KavenegarSmsAdapter:
    """Placeholder — کلید API از محیط؛ پیاده‌سازی HTTP در فاز بعد."""

    def __init__(self) -> None:
        self._api_key = os.getenv("KAVENEGAR_API_KEY", "")

    def send_sms(self, phone: str, message: str) -> bool:
        if not self._api_key:
            raise RuntimeError(
                "KAVENEGAR_API_KEY is not set; use MockSmsAdapter for development."
            )
        raise NotImplementedError(
            "KavenegarSmsAdapter.send_sms: implement with official API client."
        )
