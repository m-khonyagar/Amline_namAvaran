"""Main Orchestrator — coordinates all agents via a LangGraph workflow.

Pipeline (automatic):
  PLAN → CODE → TEST → REVIEW → EXECUTE → PR

Human approval is required for: MERGE & DEPLOY
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

from agents.coding_agent import CodingAgent, CodeResult
from agents.config import AgentConfig
from agents.executor_agent import ExecutorAgent, ExecutionResult
from agents.planning_agent import Plan, PlanningAgent
from agents.pr_agent import PRAgent, PRResult
from agents.review_agent import ReviewAgent, ReviewResult
from agents.testing_agent import TestingAgent, TestResult

log = logging.getLogger(__name__)


@dataclass
class AgentState:
    """Shared state that flows through the LangGraph nodes."""

    issue_number: int = 0
    title: str = ""
    body: str = ""
    plan: Plan | None = None
    code_result: CodeResult | None = None
    test_result: TestResult | None = None
    review_result: ReviewResult | None = None
    exec_result: ExecutionResult | None = None
    pr_result: PRResult | None = None
    workspace: Path = field(default_factory=lambda: Path("/tmp/agent_workspace"))
    errors: list[str] = field(default_factory=list)
    log: list[dict[str, Any]] = field(default_factory=list)

    def record(self, stage: str, data: dict[str, Any]) -> None:
        self.log.append({"stage": stage, "ts": time.time(), **data})

    def to_report(self) -> dict[str, Any]:
        return {
            "issue": self.issue_number,
            "title": self.title,
            "plan": self.plan.to_dict() if self.plan else None,
            "code": self.code_result.to_dict() if self.code_result else None,
            "tests": self.test_result.to_dict() if self.test_result else None,
            "review": self.review_result.to_dict() if self.review_result else None,
            "execution": self.exec_result.to_dict() if self.exec_result else None,
            "pr": self.pr_result.to_dict() if self.pr_result else None,
            "errors": self.errors,
        }


# ── Node type alias ──────────────────────────────────────────────────────────
Node = Callable[[AgentState], AgentState]


def _try(stage: str, fn: Callable[[], Any], state: AgentState) -> Any:
    """Run a stage and record any error without aborting the pipeline."""
    try:
        result = fn()
        log.info("Orchestrator: ✅ %s", stage)
        return result
    except Exception as exc:  # noqa: BLE001
        msg = f"{stage} failed: {exc}"
        state.errors.append(msg)
        log.error("Orchestrator: ❌ %s", msg)
        return None


class MainOrchestrator:
    """Orchestrates the full self-improving agent pipeline."""

    def __init__(self, config: AgentConfig | None = None) -> None:
        self.config = config or AgentConfig.from_env()
        self.planner = PlanningAgent(self.config)
        self.coder = CodingAgent(self.config)
        self.tester = TestingAgent(self.config)
        self.reviewer = ReviewAgent(self.config)
        self.executor = ExecutorAgent(self.config)
        self.pr_agent = PRAgent(self.config)

    def run(self, issue_number: int, title: str, body: str = "") -> dict[str, Any]:
        """Run the full pipeline for a GitHub issue and return a report."""
        log.info("Orchestrator: starting pipeline for issue #%d", issue_number)

        workspace = Path(self.config.workspace_dir) / f"issue_{issue_number}"
        workspace.mkdir(parents=True, exist_ok=True)

        state = AgentState(
            issue_number=issue_number,
            title=title,
            body=body,
            workspace=workspace,
        )

        # 1 — PLAN
        state.plan = _try(
            "PLAN",
            lambda: self.planner.plan(issue_number, title, body),
            state,
        )
        state.record("PLAN", state.plan.to_dict() if state.plan else {})

        if not state.plan:
            return state.to_report()

        # 2 — CODE
        state.code_result = _try(
            "CODE",
            lambda: self.coder.implement(state.plan, workspace),  # type: ignore[arg-type]
            state,
        )
        state.record("CODE", state.code_result.to_dict() if state.code_result else {})

        files_written = state.code_result.files_written if state.code_result else []

        # 3 — TEST
        state.test_result = _try(
            "TEST",
            lambda: self.tester.test(state.plan, workspace, files_written),  # type: ignore[arg-type]
            state,
        )
        state.record("TEST", state.test_result.to_dict() if state.test_result else {})

        # 4 — REVIEW
        state.review_result = _try(
            "REVIEW",
            lambda: self.reviewer.review(state.plan, workspace, files_written),  # type: ignore[arg-type]
            state,
        )
        state.record("REVIEW", state.review_result.to_dict() if state.review_result else {})

        # 5 — EXECUTE (run CI locally)
        state.exec_result = _try(
            "EXECUTE",
            lambda: self.executor.execute(workspace),
            state,
        )
        state.record("EXECUTE", state.exec_result.to_dict() if state.exec_result else {})

        # 6 — PR (create branch + open PR; merge requires human approval)
        test_summary = state.test_result.summary if state.test_result else ""
        review_summary = state.review_result.summary if state.review_result else ""
        state.pr_result = _try(
            "PR",
            lambda: self.pr_agent.create_pr(
                state.plan, workspace, test_summary, review_summary  # type: ignore[arg-type]
            ),
            state,
        )
        state.record("PR", state.pr_result.to_dict() if state.pr_result else {})

        log.info("Orchestrator: pipeline complete for issue #%d", issue_number)
        return state.to_report()
