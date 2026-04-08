"""Temporal workflow definitions (deterministic sandbox)."""

from __future__ import annotations

from datetime import timedelta

from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from app.temporal.activities import contract_lifecycle_milestone, log_platform_signal


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


@workflow.defn
class ContractLifecycleJourneyWorkflow:
    """مسیر قرارداد طبق Master Spec v2 — milestoneهای قابل گسترش با signal بعدی."""

    @workflow.run
    async def run(self, payload: dict) -> dict:
        cid = str(payload.get("entity_id") or payload.get("contract_id") or "")
        base = {**payload, "contract_id": cid}
        for name in ("draft_started", "awaiting_signatures", "finalize_pipeline_ready"):
            await workflow.execute_activity(
                contract_lifecycle_milestone,
                {**base, "milestone": name},
                start_to_close_timeout=timedelta(seconds=30),
            )
        return {"ok": True, "contract_id": cid, "workflow": "ContractLifecycleJourneyWorkflow"}
