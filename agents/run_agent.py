"""Entry-point script for the GitHub Actions agent workflow.

All issue fields are read from environment variables — they are NEVER
interpolated into code at the workflow level, preventing code injection.
"""

from __future__ import annotations

import json
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

from agents.config import AgentConfig
from agents.main_orchestrator import MainOrchestrator


def main() -> int:
    issue_number_raw = os.environ.get("ISSUE_NUMBER", "0")
    try:
        issue_number = int(issue_number_raw)
    except ValueError:
        logging.error("ISSUE_NUMBER is not a valid integer: %r", issue_number_raw)
        return 1

    title = os.environ.get("ISSUE_TITLE", "")
    body = os.environ.get("ISSUE_BODY", "")

    if not issue_number or not title:
        logging.error("ISSUE_NUMBER and ISSUE_TITLE must be set.")
        return 1

    cfg = AgentConfig.from_env()
    orch = MainOrchestrator(config=cfg)
    report = orch.run(issue_number=issue_number, title=title, body=body)

    print(json.dumps(report, indent=2, default=str))

    if report.get("errors"):
        logging.error("Errors encountered: %s", report["errors"])
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
