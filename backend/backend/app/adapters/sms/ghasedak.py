from __future__ import annotations

import os


class GhasedakSmsAdapter:
    """Ghasedak REST placeholder — set GHASEDAK_API_KEY and implement HTTP call."""

    def __init__(self) -> None:
        self._api_key = os.getenv("GHASEDAK_API_KEY", "")

    def send_sms(self, phone: str, message: str) -> bool:
        if not self._api_key:
            raise RuntimeError(
                "GHASEDAK_API_KEY is not set; use MockSmsAdapter for development."
            )
        raise NotImplementedError(
            "GhasedakSmsAdapter.send_sms: implement with Ghasedak REST API."
        )
