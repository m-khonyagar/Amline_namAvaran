"""یادآوری و انقضای SLA قرارداد — هوک برای worker/cron/Temporal."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable


class SlaScheduler:
    """اسکلت: متدها باید به DB و notification_dispatch وصل شوند."""

    def check_expired_invitations(
        self, now: datetime | None = None
    ) -> list[dict[str, Any]]:
        _ = now or datetime.now(timezone.utc)
        return []

    def send_reminders(self, now: datetime | None = None) -> list[dict[str, Any]]:
        _ = now or datetime.now(timezone.utc)
        return []

    def auto_expire_contracts(
        self,
        now: datetime | None = None,
        *,
        on_expire: Callable[[str], None] | None = None,
    ) -> list[dict[str, Any]]:
        _ = now or datetime.now(timezone.utc)
        return []


_sla: SlaScheduler | None = None


def get_sla_scheduler() -> SlaScheduler:
    global _sla
    if _sla is None:
        _sla = SlaScheduler()
    return _sla
