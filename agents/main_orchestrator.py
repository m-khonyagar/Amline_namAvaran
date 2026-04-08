"""Main Orchestrator — coordinates all agents via a LangGraph StateGraph workflow.

Pipeline (automatic):
  PLAN → CODE → TEST+REVIEW (parallel) → EXECUTE → PR

Conditional edge: if REVIEW rejects the code and retries remain, route back to CODE.
Human approval is required for: MERGE & DEPLOY
"""

from __future__ import annotations

import concurrent.futures
import logging
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

from langgraph.graph import END, StateGraph
from typing import TypedDict

from agents.coding_agent import CodingAgent, CodeResult
from agents.config import AgentConfig
from agents.executor_agent import ExecutorAgent, ExecutionResult
from agents.planning_agent import Plan, PlanningAgent
from agents.pr_agent import PRAgent, PRResult
from agents.review_agent import ReviewAgent, ReviewResult
from agents.testing_agent import TestingAgent, TestResult

log = logging.getLogger(__name__)

# Maximum times we re-run CODE when REVIEW rejects it
_MAX_REVIEW_RETRIES = 2


# ── LangGraph state schema ────────────────────────────────────────────────────

class WorkflowState(TypedDict):
    """Typed state shared across all LangGraph nodes."""

    issue_number: int
    title: str
    body: str
    workspace_path: str
    # Agent result objects (stored directly; LangGraph doesn't serialise them)
    plan: Optional[Any]           # Plan | None
    code_result: Optional[Any]    # CodeResult | None
    files_written: list           # list[str]
    test_result: Optional[Any]    # TestResult | None
    review_result: Optional[Any]  # ReviewResult | None
    exec_result: Optional[Any]    # ExecutionResult | None
    pr_result: Optional[Any]      # PRResult | None
    errors: list                  # list[str]
    audit_log: list               # list[dict]
    review_retries: int


# ── Backward-compatible dataclass (used by tests / external code) ─────────────

@dataclass
class AgentState:
    """Shared state dataclass kept for backward compatibility."""

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


# ── Orchestrator ──────────────────────────────────────────────────────────────

class MainOrchestrator:
    """Orchestrates the full self-improving agent pipeline via LangGraph."""

    def __init__(self, config: AgentConfig | None = None) -> None:
        self.config = config or AgentConfig.from_env()
        self.planner = PlanningAgent(self.config)
        self.coder = CodingAgent(self.config)
        self.tester = TestingAgent(self.config)
        self.reviewer = ReviewAgent(self.config)
        self.executor = ExecutorAgent(self.config)
        self.pr_agent = PRAgent(self.config)
        self._graph = self._build_graph()

    # ── Public API ────────────────────────────────────────────────────────────

    def run(self, issue_number: int, title: str, body: str = "") -> dict[str, Any]:
        """Run the full pipeline for a GitHub issue and return a report dict."""
        log.info("Orchestrator: starting pipeline for issue #%d", issue_number)

        workspace = Path(self.config.workspace_dir) / f"issue_{issue_number}"
        workspace.mkdir(parents=True, exist_ok=True)

        initial: WorkflowState = {
            "issue_number": issue_number,
            "title": title,
            "body": body,
            "workspace_path": str(workspace),
            "plan": None,
            "code_result": None,
            "files_written": [],
            "test_result": None,
            "review_result": None,
            "exec_result": None,
            "pr_result": None,
            "errors": [],
            "audit_log": [],
            "review_retries": 0,
        }

        final: WorkflowState = self._graph.invoke(initial)

        log.info("Orchestrator: pipeline complete for issue #%d", issue_number)
        return self._state_to_report(final)

    # ── LangGraph graph builder ───────────────────────────────────────────────

    def _build_graph(self) -> Any:
        """Compile and return the LangGraph StateGraph for the agent pipeline.

        Node names are deliberately distinct from state keys to avoid LangGraph's
        name-collision check (e.g. state key 'plan' vs node name 'planning').
        """
        graph: StateGraph = StateGraph(WorkflowState)

        graph.add_node("planning", self._plan_node)
        graph.add_node("coding", self._code_node)
        graph.add_node("test_and_review", self._test_and_review_node)
        graph.add_node("execution", self._execute_node)
        graph.add_node("pull_request", self._pr_node)

        graph.set_entry_point("planning")
        graph.add_edge("planning", "coding")
        graph.add_edge("coding", "test_and_review")
        # Conditional: retry CODE when review rejects and retries remain
        graph.add_conditional_edges(
            "test_and_review",
            self._route_after_review,
            {"coding": "coding", "execution": "execution"},
        )
        graph.add_edge("execution", "pull_request")
        graph.add_edge("pull_request", END)

        return graph.compile()

    # ── Routing condition ─────────────────────────────────────────────────────

    def _route_after_review(self, state: WorkflowState) -> str:
        review = state["review_result"]
        if (
            review is not None
            and not review.approved
            and state["review_retries"] < _MAX_REVIEW_RETRIES
        ):
            log.info(
                "Orchestrator: review rejected — retrying code (attempt %d/%d)",
                state["review_retries"],
                _MAX_REVIEW_RETRIES,
            )
            return "coding"
        return "execution"

    # ── Node implementations ──────────────────────────────────────────────────

    def _plan_node(self, state: WorkflowState) -> dict:
        errors = list(state["errors"])
        audit = list(state["audit_log"])
        plan = None
        try:
            plan = self.planner.plan(
                state["issue_number"], state["title"], state["body"]
            )
            log.info("Orchestrator: ✅ PLAN")
            audit.append({"stage": "PLAN", "ts": time.time(), **plan.to_dict()})
        except Exception as exc:  # noqa: BLE001
            msg = f"PLAN failed: {exc}"
            errors.append(msg)
            log.error("Orchestrator: ❌ %s", msg)
            audit.append({"stage": "PLAN", "ts": time.time(), "error": msg})
        return {"plan": plan, "errors": errors, "audit_log": audit}

    def _code_node(self, state: WorkflowState) -> dict:
        errors = list(state["errors"])
        audit = list(state["audit_log"])
        code_result = None
        files_written: list = []
        plan = state["plan"]
        if plan is None:
            return {"code_result": None, "files_written": [], "errors": errors, "audit_log": audit}
        workspace = Path(state["workspace_path"])
        try:
            code_result = self.coder.implement(plan, workspace)
            files_written = code_result.files_written
            log.info("Orchestrator: ✅ CODE")
            audit.append({"stage": "CODE", "ts": time.time(), **code_result.to_dict()})
        except Exception as exc:  # noqa: BLE001
            msg = f"CODE failed: {exc}"
            errors.append(msg)
            log.error("Orchestrator: ❌ %s", msg)
            audit.append({"stage": "CODE", "ts": time.time(), "error": msg})
        return {
            "code_result": code_result,
            "files_written": files_written,
            "errors": errors,
            "audit_log": audit,
        }

    def _test_and_review_node(self, state: WorkflowState) -> dict:
        """Run TEST and REVIEW in parallel (or sequentially if parallel=False)."""
        plan = state["plan"]
        workspace = Path(state["workspace_path"])
        files = state["files_written"]
        errors = list(state["errors"])
        audit = list(state["audit_log"])
        test_result = None
        review_result = None

        if self.config.parallel:
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
                future_test = ex.submit(self.tester.test, plan, workspace, files)
                future_review = ex.submit(self.reviewer.review, plan, workspace, files)
                try:
                    test_result = future_test.result()
                    log.info("Orchestrator: ✅ TEST (parallel)")
                    audit.append({"stage": "TEST", "ts": time.time(), **test_result.to_dict()})
                except Exception as exc:  # noqa: BLE001
                    msg = f"TEST failed: {exc}"
                    errors.append(msg)
                    log.error("Orchestrator: ❌ %s", msg)
                    audit.append({"stage": "TEST", "ts": time.time(), "error": msg})
                try:
                    review_result = future_review.result()
                    log.info("Orchestrator: ✅ REVIEW (parallel)")
                    audit.append({"stage": "REVIEW", "ts": time.time(), **review_result.to_dict()})
                except Exception as exc:  # noqa: BLE001
                    msg = f"REVIEW failed: {exc}"
                    errors.append(msg)
                    log.error("Orchestrator: ❌ %s", msg)
                    audit.append({"stage": "REVIEW", "ts": time.time(), "error": msg})
        else:
            # Sequential fallback
            try:
                test_result = self.tester.test(plan, workspace, files)
                log.info("Orchestrator: ✅ TEST")
                audit.append({"stage": "TEST", "ts": time.time(), **test_result.to_dict()})
            except Exception as exc:  # noqa: BLE001
                msg = f"TEST failed: {exc}"
                errors.append(msg)
                log.error("Orchestrator: ❌ %s", msg)
            try:
                review_result = self.reviewer.review(plan, workspace, files)
                log.info("Orchestrator: ✅ REVIEW")
                audit.append({"stage": "REVIEW", "ts": time.time(), **review_result.to_dict()})
            except Exception as exc:  # noqa: BLE001
                msg = f"REVIEW failed: {exc}"
                errors.append(msg)
                log.error("Orchestrator: ❌ %s", msg)

        # Increment retry counter when review rejects the code
        new_retries = state["review_retries"]
        if review_result is not None and not review_result.approved:
            new_retries += 1

        return {
            "test_result": test_result,
            "review_result": review_result,
            "review_retries": new_retries,
            "errors": errors,
            "audit_log": audit,
        }

    def _execute_node(self, state: WorkflowState) -> dict:
        errors = list(state["errors"])
        audit = list(state["audit_log"])
        exec_result = None
        workspace = Path(state["workspace_path"])
        try:
            exec_result = self.executor.execute(workspace)
            log.info("Orchestrator: ✅ EXECUTE")
            audit.append({"stage": "EXECUTE", "ts": time.time(), **exec_result.to_dict()})
        except Exception as exc:  # noqa: BLE001
            msg = f"EXECUTE failed: {exc}"
            errors.append(msg)
            log.error("Orchestrator: ❌ %s", msg)
        return {"exec_result": exec_result, "errors": errors, "audit_log": audit}

    def _pr_node(self, state: WorkflowState) -> dict:
        errors = list(state["errors"])
        audit = list(state["audit_log"])
        pr_result = None
        plan = state["plan"]
        if plan is None:
            return {"pr_result": None, "errors": errors, "audit_log": audit}
        workspace = Path(state["workspace_path"])
        test_summary = state["test_result"].summary if state["test_result"] else ""
        review_summary = state["review_result"].summary if state["review_result"] else ""
        try:
            pr_result = self.pr_agent.create_pr(plan, workspace, test_summary, review_summary)
            log.info("Orchestrator: ✅ PR")
            audit.append({"stage": "PR", "ts": time.time(), **pr_result.to_dict()})
        except Exception as exc:  # noqa: BLE001
            msg = f"PR failed: {exc}"
            errors.append(msg)
            log.error("Orchestrator: ❌ %s", msg)
        return {"pr_result": pr_result, "errors": errors, "audit_log": audit}

    # ── Report builder ────────────────────────────────────────────────────────

    @staticmethod
    def _state_to_report(state: WorkflowState) -> dict[str, Any]:
        plan = state["plan"]
        code_result = state["code_result"]
        test_result = state["test_result"]
        review_result = state["review_result"]
        exec_result = state["exec_result"]
        pr_result = state["pr_result"]
        return {
            "issue": state["issue_number"],
            "title": state["title"],
            "plan": plan.to_dict() if plan else None,
            "code": code_result.to_dict() if code_result else None,
            "tests": test_result.to_dict() if test_result else None,
            "review": review_result.to_dict() if review_result else None,
            "execution": exec_result.to_dict() if exec_result else None,
            "pr": pr_result.to_dict() if pr_result else None,
            "errors": state["errors"],
        }
