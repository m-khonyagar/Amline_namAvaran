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
        errors: list[str] = []

        for filepath in plan.estimated_files:
            try:
                target = self._safe_resolve(workspace, filepath)
            except ValueError as exc:
                msg = f"Rejected path '{filepath}': {exc}"
                log.error("CodingAgent: %s", msg)
                errors.append(msg)
                continue

            try:
                existing = target.read_text() if target.exists() else ""
            except (OSError, UnicodeDecodeError) as exc:
                log.warning("CodingAgent: cannot read %s: %s", filepath, exc)
                existing = ""

            user_msg = (
                f"Plan steps:\n" + "\n".join(f"- {s}" for s in plan.steps) + "\n\n"
                f"File to implement: {filepath}\n\n"
                f"Existing content:\n{existing or '<empty — create new file>'}"
            )

            new_content = self.llm.chat(system=CODE_SYSTEM_PROMPT, user=user_msg)

            if new_content.strip():
                try:
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_text(new_content)
                    files_written.append(str(target.relative_to(workspace)))
                    log.info("CodingAgent: wrote %s", filepath)
                except (OSError, PermissionError) as exc:
                    msg = f"Failed to write {filepath}: {exc}"
                    log.error("CodingAgent: %s", msg)
                    errors.append(msg)
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

        success = len(errors) == 0
        summary = f"Implemented {len(files_written)} file(s) for issue #{plan.issue_number}."
        if errors:
            summary += f" {len(errors)} error(s) occurred."

        return CodeResult(
            files_written=files_written,
            summary=summary,
            success=success,
        )

    @staticmethod
    def _safe_resolve(workspace: Path, rel_path: str) -> Path:
        """Resolve *rel_path* inside *workspace*, rejecting traversal attacks.

        Raises :class:`ValueError` if the resolved path escapes the workspace
        or the path is a symlink.
        """
        if not rel_path or rel_path.strip() == "":
            raise ValueError("empty file path")

        target = (workspace / rel_path).resolve()
        workspace_resolved = workspace.resolve()

        if not str(target).startswith(str(workspace_resolved) + os.sep) and target != workspace_resolved:
            raise ValueError(f"path escapes workspace: {rel_path}")

        if target.is_symlink():
            raise ValueError(f"symlinks are not allowed: {rel_path}")

        return target
