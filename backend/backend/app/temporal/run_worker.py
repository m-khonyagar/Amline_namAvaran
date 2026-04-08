"""Run Temporal worker: python -m app.temporal.run_worker"""

from __future__ import annotations

import asyncio
import logging
import os

from temporalio.client import Client
from temporalio.worker import Worker

from app.temporal.activities import contract_lifecycle_milestone, log_platform_signal
from app.temporal.workflow_defs import AmlineSignalWorkflow, ContractLifecycleJourneyWorkflow

log = logging.getLogger(__name__)


async def _main() -> None:
    host = os.getenv("AMLINE_TEMPORAL_HOST", "localhost:7233").strip()
    queue = os.getenv("AMLINE_TEMPORAL_TASK_QUEUE", "amline-tasks").strip()
    log.info("Temporal worker connecting to %s queue=%s", host, queue)
    client = await Client.connect(host)
    worker = Worker(
        client,
        task_queue=queue,
        workflows=[AmlineSignalWorkflow, ContractLifecycleJourneyWorkflow],
        activities=[log_platform_signal, contract_lifecycle_milestone],
    )
    await worker.run()


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    asyncio.run(_main())


if __name__ == "__main__":
    main()
