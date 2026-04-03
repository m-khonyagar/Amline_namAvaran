"""Temporal workflow definitions (deterministic sandbox)."""
from __future__ import annotations

from datetime import timedelta

from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from app.temporal.activities import log_platform_signal


@workflow.defn
class AmlineSignalWorkflow:
    """CRM / visit / contract signal با یک activity لاگ برای ردیابی عملیاتی."""

    @workflow.run
    async def run(self, payload: dict) -> dict:
        await workflow.execute_activity(
            log_platform_signal,
            payload,
            start_to_close_timeout=timedelta(seconds=30),
        )
        return {
            "ok": True,
            "kind": payload.get("kind"),
            "entity_id": payload.get("entity_id"),
        }
