"""Tests for the Self-Improving AI Agent system.

All tests run in offline mode (no real LLM or GitHub calls).
"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from agents.config import AgentConfig, LLMProviderConfig, GitHubConfig
from agents.planning_agent import PlanningAgent, Plan
from agents.coding_agent import CodingAgent
from agents.testing_agent import TestingAgent
from agents.review_agent import ReviewAgent
from agents.executor_agent import ExecutorAgent
from agents.main_orchestrator import MainOrchestrator, AgentState


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture()
def offline_config() -> AgentConfig:
    cfg = AgentConfig()
    cfg.llm = LLMProviderConfig(provider="ollama", model="mistral")
    cfg.github = GitHubConfig(token="", repo="test/repo")
    cfg.workspace_dir = "/tmp/test_agent_workspace"
    return cfg


@pytest.fixture()
def workspace(tmp_path: Path) -> Path:
    return tmp_path / "workspace"


# ── Config tests ──────────────────────────────────────────────────────────────

def test_config_defaults() -> None:
    cfg = AgentConfig()
    assert cfg.llm.provider == "ollama"
    assert cfg.llm.model == "mistral"
    assert cfg.github.auto_merge is False


def test_config_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENT_LLM_PROVIDER", "openrouter")
    monkeypatch.setenv("AGENT_LLM_MODEL", "mistralai/mistral-7b-instruct:free")
    monkeypatch.setenv("GITHUB_TOKEN", "gh_test_token")
    monkeypatch.setenv("GITHUB_REPOSITORY", "owner/repo")

    cfg = AgentConfig.from_env()
    assert cfg.llm.provider == "openrouter"
    assert cfg.llm.model == "mistralai/mistral-7b-instruct:free"
    assert cfg.github.token == "gh_test_token"
    assert cfg.github.repo == "owner/repo"
    # auto_merge must always be False regardless of env
    assert cfg.github.auto_merge is False


def test_config_llm_headers_ollama(offline_config: AgentConfig) -> None:
    headers = offline_config.llm_headers()
    assert "Content-Type" in headers
    # Ollama has no API key header
    assert "Authorization" not in headers


def test_config_llm_headers_openrouter() -> None:
    cfg = AgentConfig()
    cfg.llm = LLMProviderConfig(provider="openrouter", api_key="sk-test")
    headers = cfg.llm_headers()
    assert headers["Authorization"] == "Bearer sk-test"


# ── Planning Agent tests ──────────────────────────────────────────────────────

def test_planning_agent_offline(offline_config: AgentConfig) -> None:
    """PlanningAgent returns a valid Plan even when the LLM is unavailable."""
    with patch("agents.llm_client.LLMClient.chat", return_value="invalid-json"):
        agent = PlanningAgent(offline_config)
        plan = agent.plan(42, "Add logging", "We need structured logging.")

    assert plan.issue_number == 42
    assert plan.title == "Add logging"
    assert len(plan.steps) > 0


def test_planning_agent_parses_json(offline_config: AgentConfig) -> None:
    response = json.dumps({
        "steps": ["Step A", "Step B"],
        "estimated_files": ["src/logger.py"],
        "branch_name": "feat/logging",
    })
    with patch("agents.llm_client.LLMClient.chat", return_value=response):
        agent = PlanningAgent(offline_config)
        plan = agent.plan(1, "Logging", "Add structured logging.")

    assert plan.steps == ["Step A", "Step B"]
    assert plan.estimated_files == ["src/logger.py"]
    assert plan.branch_name == "feat/logging"


# ── Coding Agent tests ─────────────────────────────────────────────────────────

def test_coding_agent_creates_placeholder(offline_config: AgentConfig, workspace: Path) -> None:
    """Without estimated_files the agent creates a placeholder file."""
    plan = Plan(
        issue_number=7,
        title="Test issue",
        description="desc",
        steps=["Do X"],
        estimated_files=[],
        branch_name="feat/test",
    )
    with patch("agents.llm_client.LLMClient.chat", return_value=""):
        agent = CodingAgent(offline_config)
        result = agent.implement(plan, workspace)

    assert result.success
    assert len(result.files_written) == 1
    assert "issue_7" in result.files_written[0]


def test_coding_agent_writes_files(offline_config: AgentConfig, workspace: Path) -> None:
    plan = Plan(
        issue_number=8,
        title="Add utils",
        description="",
        steps=["Create utils.py"],
        estimated_files=["utils.py"],
        branch_name="feat/utils",
    )
    with patch("agents.llm_client.LLMClient.chat", return_value="def hello(): return 'world'"):
        agent = CodingAgent(offline_config)
        result = agent.implement(plan, workspace)

    assert result.success
    assert "utils.py" in result.files_written
    assert (workspace / "utils.py").read_text() == "def hello(): return 'world'"


# ── Testing Agent tests ───────────────────────────────────────────────────────

def test_testing_agent_no_python_files(offline_config: AgentConfig, workspace: Path) -> None:
    plan = Plan(issue_number=9, title="Docs update", description="", steps=[], estimated_files=[])
    workspace.mkdir(parents=True, exist_ok=True)

    # Create a non-Python file
    (workspace / "README.md").write_text("# Hello")

    with patch("agents.llm_client.LLMClient.chat", return_value=""):
        agent = TestingAgent(offline_config)
        result = agent.test(plan, workspace, files_written=["README.md"])

    assert result.passed  # no tests to fail


def test_testing_agent_generates_test_file(offline_config: AgentConfig, workspace: Path) -> None:
    plan = Plan(issue_number=10, title="Utils", description="", steps=[], estimated_files=["utils.py"])
    workspace.mkdir(parents=True, exist_ok=True)
    (workspace / "utils.py").write_text("def add(a, b): return a + b")

    test_code = "def test_add():\n    from utils import add\n    assert add(1, 2) == 3\n"
    with patch("agents.llm_client.LLMClient.chat", return_value=test_code):
        with patch.object(TestingAgent, "_run_pytest") as mock_run:
            from agents.testing_agent import TestResult
            mock_run.return_value = TestResult(passed=True, output="1 passed", summary="All tests passed.")
            agent = TestingAgent(offline_config)
            result = agent.test(plan, workspace, files_written=["utils.py"])

    assert result.passed
    assert len(result.tests_written) == 1


# ── Review Agent tests ────────────────────────────────────────────────────────

def test_review_agent_auto_approves_on_non_json(offline_config: AgentConfig, workspace: Path) -> None:
    workspace.mkdir(parents=True, exist_ok=True)
    (workspace / "utils.py").write_text("def foo(): pass")

    plan = Plan(issue_number=11, title="Utils", description="", steps=[], estimated_files=[])
    with patch("agents.llm_client.LLMClient.chat", return_value="not json"):
        agent = ReviewAgent(offline_config)
        result = agent.review(plan, workspace, files_written=["utils.py"])

    assert result.approved  # non-JSON → auto-approve


def test_review_agent_applies_improvement(offline_config: AgentConfig, workspace: Path) -> None:
    workspace.mkdir(parents=True, exist_ok=True)
    (workspace / "utils.py").write_text("def foo(): pass")

    response = json.dumps({
        "approved": True,
        "comments": ["Add type hints"],
        "improved_code": "def foo() -> None: pass",
    })
    plan = Plan(issue_number=12, title="Utils", description="", steps=[], estimated_files=[])
    with patch("agents.llm_client.LLMClient.chat", return_value=response):
        agent = ReviewAgent(offline_config)
        result = agent.review(plan, workspace, files_written=["utils.py"])

    assert result.approved
    assert "utils.py" in result.improved_files
    assert (workspace / "utils.py").read_text() == "def foo() -> None: pass"


# ── Executor Agent tests ──────────────────────────────────────────────────────

def test_executor_agent_no_tests(offline_config: AgentConfig, workspace: Path) -> None:
    workspace.mkdir(parents=True, exist_ok=True)
    agent = ExecutorAgent(offline_config)
    result = agent.execute(workspace)
    # No tests dir → echo step runs
    assert result.steps_run


def test_executor_agent_runs_pytest(offline_config: AgentConfig, workspace: Path) -> None:
    workspace.mkdir(parents=True, exist_ok=True)
    tests_dir = workspace / "tests"
    tests_dir.mkdir()
    (tests_dir / "test_sample.py").write_text("def test_ok(): assert 1 == 1\n")

    agent = ExecutorAgent(offline_config)
    result = agent.execute(workspace)

    assert result.success
    assert "pytest" in result.steps_run


# ── Main Orchestrator tests ───────────────────────────────────────────────────

def test_orchestrator_full_offline(tmp_path: Path) -> None:
    """Full pipeline runs without errors in offline mode."""
    cfg = AgentConfig()
    cfg.workspace_dir = str(tmp_path / "ws")

    with patch("agents.llm_client.LLMClient.chat", return_value="{}"):
        orch = MainOrchestrator(config=cfg)
        report = orch.run(issue_number=99, title="Test issue", body="Test body")

    assert report["issue"] == 99
    assert report["plan"] is not None


def test_orchestrator_report_structure(tmp_path: Path) -> None:
    cfg = AgentConfig()
    cfg.workspace_dir = str(tmp_path / "ws")

    with patch("agents.llm_client.LLMClient.chat", return_value="{}"):
        orch = MainOrchestrator(config=cfg)
        report = orch.run(issue_number=1, title="Feature", body="")

    for key in ("issue", "title", "plan", "code", "tests", "review", "execution", "pr", "errors"):
        assert key in report


def test_agent_state_record() -> None:
    state = AgentState(issue_number=5)
    state.record("PLAN", {"steps": ["a", "b"]})
    assert len(state.log) == 1
    assert state.log[0]["stage"] == "PLAN"


# ── LangGraph StateGraph tests ────────────────────────────────────────────────

def test_orchestrator_graph_compiles(tmp_path: Path) -> None:
    """MainOrchestrator._graph is a compiled LangGraph StateGraph."""
    from langgraph.graph.state import CompiledStateGraph

    cfg = AgentConfig()
    cfg.workspace_dir = str(tmp_path / "ws")

    with patch("agents.llm_client.LLMClient.chat", return_value="{}"):
        orch = MainOrchestrator(config=cfg)

    assert isinstance(orch._graph, CompiledStateGraph)


def test_orchestrator_graph_nodes(tmp_path: Path) -> None:
    """The compiled graph contains all expected pipeline nodes."""
    cfg = AgentConfig()
    cfg.workspace_dir = str(tmp_path / "ws")

    with patch("agents.llm_client.LLMClient.chat", return_value="{}"):
        orch = MainOrchestrator(config=cfg)

    nodes = set(orch._graph.get_graph().nodes.keys())
    for expected in ("planning", "coding", "test_and_review", "execution", "pull_request", "halt"):
        assert expected in nodes, f"Node '{expected}' missing from graph"


def test_route_after_planning(tmp_path: Path) -> None:
    from agents.main_orchestrator import WorkflowState

    cfg = AgentConfig()
    cfg.workspace_dir = str(tmp_path / "ws")
    with patch("agents.llm_client.LLMClient.chat", return_value="{}"):
        orch = MainOrchestrator(config=cfg)

    state_no_plan: WorkflowState = {
        "issue_number": 1,
        "title": "",
        "body": "",
        "workspace_path": "/tmp",
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
    assert orch._route_after_planning(state_no_plan) == "halt"

    mock_plan = MagicMock()
    mock_plan.to_dict.return_value = {}
    state_ok = {**state_no_plan, "plan": mock_plan}
    assert orch._route_after_planning(state_ok) == "coding"


def test_orchestrator_halts_when_planning_fails(tmp_path: Path) -> None:
    cfg = AgentConfig()
    cfg.workspace_dir = str(tmp_path / "ws")
    orch = MainOrchestrator(config=cfg)
    with patch.object(orch.planner, "plan", side_effect=RuntimeError("LLM down")):
        report = orch.run(issue_number=77, title="x", body="y")

    assert any("PLAN failed" in e for e in report["errors"])
    assert report["plan"] is None
    assert report["code"] is None
    assert report["tests"] is None
    assert report["review"] is None
    assert report["execution"] is None
    assert report["pr"] is None


def test_orchestrator_parallel_mode(tmp_path: Path) -> None:
    """cfg.parallel is legacy; graph always runs REVIEW then TEST sequentially."""
    cfg = AgentConfig()
    cfg.workspace_dir = str(tmp_path / "ws")
    cfg.parallel = True

    with patch("agents.llm_client.LLMClient.chat", return_value="{}"):
        orch = MainOrchestrator(config=cfg)
        report = orch.run(issue_number=50, title="Parallel test", body="")

    assert report["issue"] == 50
    for key in ("tests", "review"):
        assert key in report


def test_orchestrator_sequential_mode(tmp_path: Path) -> None:
    """Full report shape unchanged when parallel flag is False (legacy)."""
    cfg = AgentConfig()
    cfg.workspace_dir = str(tmp_path / "ws")
    cfg.parallel = False

    with patch("agents.llm_client.LLMClient.chat", return_value="{}"):
        orch = MainOrchestrator(config=cfg)
        report = orch.run(issue_number=51, title="Sequential test", body="")

    assert report["issue"] == 51
    for key in ("issue", "title", "plan", "code", "tests", "review", "execution", "pr", "errors"):
        assert key in report


def test_orchestrator_review_retry_routing(tmp_path: Path) -> None:
    """When REVIEW rejects code, the orchestrator retries coding up to the limit."""
    from agents.main_orchestrator import WorkflowState, _MAX_REVIEW_RETRIES

    cfg = AgentConfig()
    cfg.workspace_dir = str(tmp_path / "ws")

    with patch("agents.llm_client.LLMClient.chat", return_value="{}"):
        orch = MainOrchestrator(config=cfg)

    # Simulate a state where review rejected with retries remaining
    from agents.review_agent import ReviewResult
    mock_review = ReviewResult(approved=False, comments=["needs work"], summary="rejected")
    state_retry: WorkflowState = {
        "issue_number": 1, "title": "", "body": "", "workspace_path": "/tmp",
        "plan": None, "code_result": None, "files_written": [],
        "test_result": None, "review_result": mock_review,
        "exec_result": None, "pr_result": None,
        "errors": [], "audit_log": [], "review_retries": 1,
    }
    assert orch._route_after_review(state_retry) == "coding"

    # Once retries reach the max, route to execution
    state_done: WorkflowState = {**state_retry, "review_retries": _MAX_REVIEW_RETRIES}
    assert orch._route_after_review(state_done) == "execution"

    # Approved review always routes to execution
    mock_approved = ReviewResult(approved=True, summary="looks good")
    state_approved: WorkflowState = {**state_retry, "review_result": mock_approved}
    assert orch._route_after_review(state_approved) == "execution"
