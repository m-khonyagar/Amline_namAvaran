"""Planning Agent — analyses GitHub issues and designs a solution plan."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any

from agents.config import AgentConfig
from agents.llm_client import LLMClient

log = logging.getLogger(__name__)


@dataclass
class Plan:
    issue_number: int
    title: str
    description: str
    steps: list[str] = field(default_factory=list)
    estimated_files: list[str] = field(default_factory=list)
    branch_name: str = ""
    raw: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "issue_number": self.issue_number,
            "title": self.title,
            "description": self.description,
            "steps": self.steps,
            "estimated_files": self.estimated_files,
            "branch_name": self.branch_name,
        }


PLAN_SYSTEM_PROMPT = """\
You are an expert software architect and planning agent.
Given a GitHub issue, produce a detailed implementation plan as JSON with:
{
  "steps": ["step1", "step2", ...],
  "estimated_files": ["path/to/file1.py", ...],
  "branch_name": "feat/short-description"
}
Reply ONLY with the JSON object — no markdown fences, no extra text."""


class PlanningAgent:
    """Analyses issues and creates structured implementation plans."""

    def __init__(self, config: AgentConfig) -> None:
        self.config = config
        self.llm = LLMClient(config)

    def plan(self, issue_number: int, title: str, body: str) -> Plan:
        """Analyse a GitHub issue and return a Plan."""
        log.info("PlanningAgent: planning issue #%d — %s", issue_number, title)

        user_msg = (
            f"GitHub Issue #{issue_number}: {title}\n\n"
            f"Description:\n{body or 'No description provided.'}"
        )

        raw = self.llm.chat(system=PLAN_SYSTEM_PROMPT, user=user_msg)

        steps, estimated_files, branch_name = [], [], f"agent/issue-{issue_number}"
        try:
            data = json.loads(raw)
            steps = data.get("steps", [])
            estimated_files = data.get("estimated_files", [])
            branch_name = data.get("branch_name", branch_name)
        except json.JSONDecodeError:
            log.warning("PlanningAgent: LLM returned non-JSON; using offline defaults.")
            steps = [
                "Analyse the issue requirements",
                "Implement the required changes",
                "Write unit tests",
                "Open a pull request",
            ]

        return Plan(
            issue_number=issue_number,
            title=title,
            description=body or "",
            steps=steps,
            estimated_files=estimated_files,
            branch_name=branch_name,
            raw=raw,
        )
