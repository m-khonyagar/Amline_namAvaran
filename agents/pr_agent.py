"""PR Agent — creates a GitHub branch, commits changes, and opens a pull request.

Merge is intentionally NOT automated — it always requires human approval.
"""

from __future__ import annotations

import logging
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from agents.config import AgentConfig
from agents.planning_agent import Plan

log = logging.getLogger(__name__)

try:
    from github import Github, GithubException  # type: ignore[import]
    _PYGITHUB_AVAILABLE = True
except ImportError:
    _PYGITHUB_AVAILABLE = False


@dataclass
class PRResult:
    pr_url: str = ""
    branch_name: str = ""
    success: bool = False
    message: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "pr_url": self.pr_url,
            "branch_name": self.branch_name,
            "success": self.success,
            "message": self.message,
        }


class PRAgent:
    """Creates a branch, commits workspace changes, and opens a GitHub PR."""

    def __init__(self, config: AgentConfig) -> None:
        self.config = config

    def create_pr(
        self,
        plan: Plan,
        workspace: Path,
        test_summary: str = "",
        review_summary: str = "",
    ) -> PRResult:
        """Commit the workspace changes and open a PR against the base branch."""
        branch = plan.branch_name or f"agent/issue-{plan.issue_number}"
        log.info("PRAgent: creating PR for issue #%d on branch '%s'", plan.issue_number, branch)

        if not self.config.github.token:
            log.warning("PRAgent: GITHUB_TOKEN not set — skipping PR creation.")
            return PRResult(
                branch_name=branch,
                success=False,
                message="GITHUB_TOKEN not set; PR not created.",
            )

        if not _PYGITHUB_AVAILABLE:
            log.error("PRAgent: PyGithub not installed — pip install PyGithub")
            return PRResult(
                branch_name=branch,
                success=False,
                message="PyGithub not installed.",
            )

        # Commit all changes in the workspace using git
        self._git_commit_and_push(workspace, branch, plan)

        # Open the PR via GitHub API
        try:
            gh = Github(self.config.github.token)
            repo = gh.get_repo(self.config.github.repo)
            base = self.config.github.base_branch

            pr_body = self._build_pr_body(plan, test_summary, review_summary)

            pr = repo.create_pull(
                title=f"[Agent] Issue #{plan.issue_number}: {plan.title}",
                body=pr_body,
                head=branch,
                base=base,
            )
            log.info("PRAgent: PR created — %s", pr.html_url)
            return PRResult(
                pr_url=pr.html_url,
                branch_name=branch,
                success=True,
                message=f"PR opened: {pr.html_url}",
            )

        except Exception as exc:  # noqa: BLE001
            log.error("PRAgent: GitHub API error: %s", exc)
            return PRResult(
                branch_name=branch,
                success=False,
                message=str(exc),
            )

    # ── private ──────────────────────────────────────────────────────────

    def _git_commit_and_push(self, workspace: Path, branch: str, plan: Plan) -> None:
        repo_root = Path(os.environ.get("GITHUB_WORKSPACE", str(Path.cwd())))
        env = {
            **os.environ,
            "GIT_AUTHOR_NAME": "AI Agent",
            "GIT_AUTHOR_EMAIL": "agent@amline.dev",
            "GIT_COMMITTER_NAME": "AI Agent",
            "GIT_COMMITTER_EMAIL": "agent@amline.dev",
        }

        cmds = [
            ["git", "checkout", "-b", branch],
            ["git", "add", str(workspace)],
            ["git", "commit", "-m", f"[agent] Implement issue #{plan.issue_number}: {plan.title}"],
            ["git", "push", "origin", branch],
        ]

        for cmd in cmds:
            result = subprocess.run(cmd, cwd=repo_root, env=env, capture_output=True, text=True)
            if result.returncode != 0:
                log.warning("PRAgent git: %s → %s", " ".join(cmd), result.stderr.strip())

    @staticmethod
    def _build_pr_body(plan: Plan, test_summary: str, review_summary: str) -> str:
        steps_md = "\n".join(f"- {s}" for s in plan.steps)
        return (
            f"## 🤖 Automated implementation for Issue #{plan.issue_number}\n\n"
            f"### Plan\n{steps_md}\n\n"
            f"### Test Results\n{test_summary or 'N/A'}\n\n"
            f"### Code Review\n{review_summary or 'N/A'}\n\n"
            f"---\n"
            f"⚠️ **This PR was created automatically by the AI Agent.**\n"
            f"Human review and approval are required before merging."
        )
