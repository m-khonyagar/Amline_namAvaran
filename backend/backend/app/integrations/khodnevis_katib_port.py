"""مرز یکپارچگی خودنویس/کاتب — پیاده‌سازی mock تا REST واقعی جایگزین شود."""

from __future__ import annotations

from typing import Any, Optional


class MockKhodnevisKatibAdapter:
    """خروجی هم‌شکل external_refs سند v2."""

    def submit_for_official_tracking(
        self,
        contract_id: str,
        *,
        ssot_kind: str,
        terms: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        return {
            "khodnevis_id": None,
            "katib_id": f"mock-katib-{contract_id[:8]}",
            "tracking_code": None,
            "status": "MOCK_PENDING",
            "ssot_kind": ssot_kind,
        }


_kk: MockKhodnevisKatibAdapter | None = None


def get_khodnevis_katib_adapter() -> MockKhodnevisKatibAdapter:
    global _kk
    if _kk is None:
        _kk = MockKhodnevisKatibAdapter()
    return _kk
