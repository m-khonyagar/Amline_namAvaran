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
