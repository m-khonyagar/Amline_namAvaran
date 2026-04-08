"""Review Agent — performs automated code review and improvement."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from agents.config import AgentConfig
from agents.llm_client import LLMClient
from agents.planning_agent import Plan

log = logging.getLogger(__name__)


@dataclass
class ReviewResult:
    approved: bool = True
    comments: list[str] = field(default_factory=list)
    improved_files: list[str] = field(default_factory=list)
    summary: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "approved": self.approved,
            "comments": self.comments,
            "improved_files": self.improved_files,
            "summary": self.summary,
        }


REVIEW_SYSTEM_PROMPT = """\
You are a senior software engineer performing a code review.
Analyse the code for:
- Correctness and logic errors
- Security vulnerabilities
- Code style and readability
- Missing edge-case handling

Reply with a JSON object:
{
  "approved": true/false,
  "comments": ["issue 1", "issue 2"],
  "improved_code": "<full improved file content or empty string if no changes needed>"
}
Reply ONLY with the JSON — no markdown fences."""

IMPROVE_SYSTEM_PROMPT = """\
You are a senior software engineer.
Apply the review comments to improve the code.
Output ONLY the complete improved file — no markdown fences, no explanations."""


class ReviewAgent:
    """Reviews generated code and suggests (or applies) improvements."""

    def __init__(self, config: AgentConfig) -> None:
        self.config = config
        self.llm = LLMClient(config)

    def review(self, plan: Plan, workspace: Path, files_written: list[str]) -> ReviewResult:
        """Review each written file and apply improvements when needed."""
        log.info("ReviewAgent: reviewing %d file(s) for issue #%d", len(files_written), plan.issue_number)

        all_comments: list[str] = []
        improved_files: list[str] = []
        overall_approved = True

        for rel_path in files_written:
            src_file = workspace / rel_path
            if not src_file.exists():
                continue

            content = src_file.read_text()
            user_msg = f"File: {rel_path}\n\nCode:\n{content}"

            import json

            raw = self.llm.chat(system=REVIEW_SYSTEM_PROMPT, user=user_msg)
            try:
                data = json.loads(raw)
                approved = bool(data.get("approved", True))
                comments = data.get("comments", [])
                improved_code = data.get("improved_code", "")
            except (json.JSONDecodeError, AttributeError):
                log.warning("ReviewAgent: non-JSON response for %s; auto-approving.", rel_path)
                approved, comments, improved_code = True, [], ""

            if not approved:
                overall_approved = False

            if comments:
                all_comments.extend([f"[{rel_path}] {c}" for c in comments])

            if improved_code.strip() and improved_code.strip() != content.strip():
                src_file.write_text(improved_code)
                improved_files.append(rel_path)
                log.info("ReviewAgent: improved %s", rel_path)

        summary = (
            f"Review complete. {len(improved_files)} file(s) improved. "
            + ("Approved." if overall_approved else "Requires attention.")
        )

        return ReviewResult(
            approved=overall_approved,
            comments=all_comments,
            improved_files=improved_files,
            summary=summary,
        )
