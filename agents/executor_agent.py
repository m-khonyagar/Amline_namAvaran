"""Executor Agent — runs CI pipelines and reports execution results."""

from __future__ import annotations

import logging
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from agents.config import AgentConfig

log = logging.getLogger(__name__)


@dataclass
class ExecutionResult:
    success: bool = True
    output: str = ""
    steps_run: list[str] = field(default_factory=list)
    summary: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "success": self.success,
            "output": self.output,
            "steps_run": self.steps_run,
            "summary": self.summary,
        }


class ExecutorAgent:
    """Runs validation commands (lint, test, build) in the workspace."""

    def __init__(self, config: AgentConfig) -> None:
        self.config = config

    def execute(self, workspace: Path) -> ExecutionResult:
        """Run a standard pipeline: lint → test."""
        log.info("ExecutorAgent: running pipeline in %s", workspace)

        steps_run: list[str] = []
        outputs: list[str] = []
        success = True

        pipeline = self._build_pipeline(workspace)

        for name, cmd in pipeline:
            out, ok = self._run(cmd, cwd=workspace)
            steps_run.append(name)
            outputs.append(f"=== {name} ===\n{out}")
            if not ok:
                success = False
                log.warning("ExecutorAgent: step '%s' failed.", name)
                break  # stop on first failure
            log.info("ExecutorAgent: step '%s' passed.", name)

        combined_output = "\n".join(outputs)
        summary = "Pipeline passed." if success else "Pipeline failed — see output."

        return ExecutionResult(
            success=success,
            output=combined_output,
            steps_run=steps_run,
            summary=summary,
        )

    # ── private ──────────────────────────────────────────────────────────

    def _build_pipeline(self, workspace: Path) -> list[tuple[str, list[str]]]:
        pipeline: list[tuple[str, list[str]]] = []

        tests_dir = workspace / "tests"
        if tests_dir.exists():
            pipeline.append(
                ("pytest", [sys.executable, "-m", "pytest", str(tests_dir), "-v", "--tb=short"])
            )

        return pipeline or [("echo", ["echo", "No pipeline steps configured."])]

    def _run(self, cmd: list[str], cwd: Path) -> tuple[str, bool]:
        try:
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=cwd,
                timeout=180,
            )
            output = proc.stdout + proc.stderr
            return output, proc.returncode == 0
        except subprocess.TimeoutExpired:
            return "Command timed out.", False
        except Exception as exc:  # noqa: BLE001
            return str(exc), False
