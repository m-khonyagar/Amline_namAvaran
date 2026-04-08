"""بارگذاری روتر قرارداد از ``endpoints`` (New Flow 0.1.3).

``get_store`` برای monkeypatch در تست‌ها حفظ شده است.
"""

from __future__ import annotations

from app.api.v1.endpoints.contracts import router
from app.repositories.memory.state import get_store

__all__ = ["router", "get_store"]
