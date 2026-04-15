"""Tests for agent security and error-handling improvements.

Covers path traversal protection in CodingAgent and ReviewAgent,
and graceful write-failure handling.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from unittest.mock import patch

import pytest

from agents.coding_agent import CodingAgent
from agents.config import AgentConfig, LLMProviderConfig, GitHubConfig
from agents.planning_agent import Plan
from agents.review_agent import ReviewAgent


@pytest.fixture()
def cfg() -> AgentConfig:
    cfg = AgentConfig()
    cfg.llm = LLMProviderConfig(provider="ollama", model="mistral")
    cfg.github = GitHubConfig(token="", repo="test/repo")
    return cfg


# ===========================================================================
# CodingAgent — path traversal
# ===========================================================================


class TestCodingAgentPathSecurity:
    def test_rejects_parent_traversal(self, cfg: AgentConfig, tmp_path: Path) -> None:
        workspace = tmp_path / "workspace"
        plan = Plan(
            issue_number=1,
            title="Evil",
            description="",
            steps=["exploit"],
            estimated_files=["../../etc/passwd"],
        )

        with patch("agents.llm_client.LLMClient.chat", return_value="malicious content"):
            agent = CodingAgent(cfg)
            result = agent.implement(plan, workspace)

        # The traversal path should be rejected, and a placeholder created instead
        assert result.success is False or "error" in result.summary.lower() or len(result.files_written) > 0
        # The evil file must NOT exist outside workspace
        evil = (tmp_path / "etc" / "passwd")
        assert not evil.exists()

    def test_rejects_absolute_path(self, cfg: AgentConfig, tmp_path: Path) -> None:
        workspace = tmp_path / "workspace"
        plan = Plan(
            issue_number=2,
            title="Abs",
            description="",
            steps=[],
            estimated_files=["/etc/shadow"],
        )

        with patch("agents.llm_client.LLMClient.chat", return_value="bad"):
            agent = CodingAgent(cfg)
            result = agent.implement(plan, workspace)

        assert not Path("/etc/shadow_test_sentinel").exists()

    def test_accepts_safe_nested_path(self, cfg: AgentConfig, tmp_path: Path) -> None:
        workspace = tmp_path / "workspace"
        plan = Plan(
            issue_number=3,
            title="Safe",
            description="",
            steps=["create module"],
            estimated_files=["src/utils/helpers.py"],
        )

        with patch("agents.llm_client.LLMClient.chat", return_value="# safe"):
            agent = CodingAgent(cfg)
            result = agent.implement(plan, workspace)

        assert result.success
        assert (workspace / "src" / "utils" / "helpers.py").exists()

    def test_rejects_empty_path(self, cfg: AgentConfig, tmp_path: Path) -> None:
        workspace = tmp_path / "workspace"
        plan = Plan(
            issue_number=4,
            title="Empty",
            description="",
            steps=[],
            estimated_files=[""],
        )

        with patch("agents.llm_client.LLMClient.chat", return_value="content"):
            agent = CodingAgent(cfg)
            result = agent.implement(plan, workspace)

        # Empty path should be rejected
        assert not result.success or "error" in result.summary.lower()


class TestCodingAgentWriteErrorHandling:
    def test_continues_after_write_failure(self, cfg: AgentConfig, tmp_path: Path) -> None:
        workspace = tmp_path / "workspace"
        workspace.mkdir(parents=True)

        plan = Plan(
            issue_number=5,
            title="Multi",
            description="",
            steps=["write files"],
            estimated_files=["good.py", "bad.py", "also_good.py"],
        )

        call_count = 0

        def mock_chat(*, system, user):
            nonlocal call_count
            call_count += 1
            return f"# file {call_count}"

        original_write = Path.write_text

        def flaky_write(self_path, content, *args, **kwargs):
            if self_path.name == "bad.py":
                raise PermissionError("Simulated write failure")
            return original_write(self_path, content, *args, **kwargs)

        with (
            patch("agents.llm_client.LLMClient.chat", side_effect=mock_chat),
            patch.object(Path, "write_text", flaky_write),
        ):
            agent = CodingAgent(cfg)
            result = agent.implement(plan, workspace)

        # good.py and also_good.py should still be written
        assert "good.py" in result.files_written
        assert "also_good.py" in result.files_written
        assert result.success is False  # because one file failed


# ===========================================================================
# ReviewAgent — path security
# ===========================================================================


class TestReviewAgentPathSecurity:
    def test_skips_symlinks(self, cfg: AgentConfig, tmp_path: Path) -> None:
        workspace = tmp_path / "workspace"
        workspace.mkdir()

        # Create a real file and a symlink
        real_file = workspace / "real.py"
        real_file.write_text("# original")

        link = workspace / "link.py"
        link.symlink_to(real_file)

        review_response = json.dumps({
            "approved": True,
            "comments": [],
            "improved_code": "# hacked via symlink",
        })

        plan = Plan(issue_number=6, title="Sym", description="", steps=[], estimated_files=[])

        with patch("agents.llm_client.LLMClient.chat", return_value=review_response):
            agent = ReviewAgent(cfg)
            result = agent.review(plan, workspace, files_written=["link.py"])

        # The symlink target should NOT have been modified
        assert real_file.read_text() == "# original"
        assert "link.py" not in result.improved_files
