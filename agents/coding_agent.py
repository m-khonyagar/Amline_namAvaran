"""Coding Agent — implements code changes based on a Plan."""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from agents.config import AgentConfig
from agents.llm_client import LLMClient
from agents.planning_agent import Plan

log = logging.getLogger(__name__)


@dataclass
class CodeResult:
    files_written: list[str] = field(default_factory=list)
    summary: str = ""
    success: bool = True

    def to_dict(self) -> dict[str, Any]:
        return {
            "files_written": self.files_written,
            "summary": self.summary,
            "success": self.success,
        }


CODE_SYSTEM_PROMPT = """\
You are an expert software engineer.
Given an implementation plan and an existing file (or empty string if new),
produce the COMPLETE updated file content only — no markdown fences, no explanations.
If no code change is needed for a file, reply with the original content unchanged."""


class CodingAgent:
    """Generates code based on a Plan and writes it to the workspace."""

    def __init__(self, config: AgentConfig) -> None:
        self.config = config
        self.llm = LLMClient(config)

    def implement(self, plan: Plan, workspace: Path) -> CodeResult:
        """Implement the plan by generating / modifying files."""
        log.info("CodingAgent: implementing plan for issue #%d", plan.issue_number)

        workspace.mkdir(parents=True, exist_ok=True)
        files_written: list[str] = []

        for filepath in plan.estimated_files:
            target = workspace / filepath
            existing = target.read_text() if target.exists() else ""

            user_msg = (
                f"Plan steps:\n" + "\n".join(f"- {s}" for s in plan.steps) + "\n\n"
                f"File to implement: {filepath}\n\n"
                f"Existing content:\n{existing or '<empty — create new file>'}"
            )

            new_content = self.llm.chat(system=CODE_SYSTEM_PROMPT, user=user_msg)

            if new_content.strip():
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(new_content)
                files_written.append(str(target.relative_to(workspace)))
                log.info("CodingAgent: wrote %s", filepath)
            else:
                log.warning("CodingAgent: LLM returned empty content for %s", filepath)

        if not files_written:
            # Offline / no-file-list stub — create a placeholder
            placeholder = workspace / f"agent_output_issue_{plan.issue_number}.md"
            placeholder.write_text(
                f"# Agent Output for Issue #{plan.issue_number}\n\n"
                + "\n".join(f"- {s}" for s in plan.steps)
            )
            files_written.append(placeholder.name)

        return CodeResult(
            files_written=files_written,
            summary=f"Implemented {len(files_written)} file(s) for issue #{plan.issue_number}.",
            success=True,
        )
