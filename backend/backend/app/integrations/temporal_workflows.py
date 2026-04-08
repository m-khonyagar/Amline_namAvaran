"""Temporal workflow hooks — starts AmlineSignalWorkflow when AMLINE_TEMPORAL_HOST is set."""

from __future__ import annotations

import asyncio
import logging
import os
import uuid
from typing import Any, Optional

log = logging.getLogger(__name__)


def temporal_configured() -> bool:
    return bool((os.getenv("AMLINE_TEMPORAL_HOST") or "").strip())


def _start_workflow(
    kind: str,
    entity_id: str,
    metadata: Optional[dict[str, Any]],
    *,
    workflow_key: str = "signal",
) -> None:
    from temporalio.client import Client

    from app.temporal.workflow_defs import (
        AmlineSignalWorkflow,
        ContractLifecycleJourneyWorkflow,
    )

    host = os.getenv("AMLINE_TEMPORAL_HOST", "localhost:7233").strip()
    queue = os.getenv("AMLINE_TEMPORAL_TASK_QUEUE", "amline-tasks").strip()

    wf_map = {
        "signal": AmlineSignalWorkflow,
        "contract_lifecycle": ContractLifecycleJourneyWorkflow,
    }
    wf_cls = wf_map.get(workflow_key, AmlineSignalWorkflow)

    async def _go() -> None:
        client = await Client.connect(host)
        wf_id = f"{kind}-{entity_id}-{uuid.uuid4().hex[:10]}"
        payload = {"kind": kind, "entity_id": entity_id, **(metadata or {})}
        await client.start_workflow(
            wf_cls.run,
            payload,
            id=wf_id,
            task_queue=queue,
        )

    try:
        asyncio.run(_go())
    except Exception as e:  # noqa: BLE001
        log.warning("temporal workflow start failed: %s", e)


def schedule_contract_workflow(
    contract_id: str, metadata: Optional[dict[str, Any]] = None
) -> None:
    if not temporal_configured():
        return
    _start_workflow("contract", contract_id, metadata, workflow_key="signal")


def schedule_contract_lifecycle_journey(
    contract_id: str, metadata: Optional[dict[str, Any]] = None
) -> None:
    """Workflow milestoneها مطابق سند v2 — کنار workflow سیگنال سبک."""
    if not temporal_configured():
        return
    _start_workflow(
        "contract_lifecycle",
        contract_id,
        metadata,
        workflow_key="contract_lifecycle",
    )


def schedule_crm_lead_workflow(
    lead_id: str, metadata: Optional[dict[str, Any]] = None
) -> None:
    if not temporal_configured():
        return
    _start_workflow("crm_lead", lead_id, metadata)


def schedule_visit_workflow(
    visit_id: str, metadata: Optional[dict[str, Any]] = None
) -> None:
    if not temporal_configured():
        return
    _start_workflow("visit", visit_id, metadata)
