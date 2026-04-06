"""Testing Agent — writes and runs unit tests for code changes."""

from __future__ import annotations

import logging
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from agents.config import AgentConfig
from agents.llm_client import LLMClient
from agents.planning_agent import Plan

log = logging.getLogger(__name__)


@dataclass
class TestResult:
    tests_written: list[str] = field(default_factory=list)
    passed: bool = True
    output: str = ""
    summary: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "tests_written": self.tests_written,
            "passed": self.passed,
            "output": self.output,
            "summary": self.summary,
        }


TEST_SYSTEM_PROMPT = """\
You are an expert Python test engineer using pytest.
Given the source code of a module, write a complete pytest test file that covers the main logic.
Output ONLY valid Python code — no markdown fences, no explanations."""


class TestingAgent:
    """Generates and runs unit tests for the code changes."""

    __test__ = False  # prevent pytest from collecting this class

    def __init__(self, config: AgentConfig) -> None:
        self.config = config
        self.llm = LLMClient(config)

    def test(self, plan: Plan, workspace: Path, files_written: list[str]) -> TestResult:
        """Generate tests for each written file and run them with pytest."""
        log.info("TestingAgent: generating tests for issue #%d", plan.issue_number)

        tests_dir = workspace / "tests"
        tests_dir.mkdir(exist_ok=True)
        tests_written: list[str] = []

        for rel_path in files_written:
            src_file = workspace / rel_path
            if not src_file.exists() or not rel_path.endswith(".py"):
                continue

            source = src_file.read_text()
            user_msg = (
                f"Module path: {rel_path}\n\n"
                f"Source code:\n{source}"
            )

            test_code = self.llm.chat(system=TEST_SYSTEM_PROMPT, user=user_msg)

            if test_code.strip():
                stem = src_file.stem
                test_file = tests_dir / f"test_{stem}.py"
                test_file.write_text(test_code)
                tests_written.append(str(test_file.relative_to(workspace)))
                log.info("TestingAgent: wrote %s", test_file.name)

        # Run pytest if any tests were generated
        if tests_written:
            result = self._run_pytest(workspace, tests_dir)
        else:
            result = TestResult(
                tests_written=[],
                passed=True,
                output="No Python source files found; skipping test run.",
                summary="No tests generated (non-Python or no files).",
            )
            return result

        result.tests_written = tests_written
        return result

    def _run_pytest(self, workspace: Path, tests_dir: Path) -> TestResult:
        try:
            proc = subprocess.run(
                [sys.executable, "-m", "pytest", str(tests_dir), "-v", "--tb=short"],
                capture_output=True,
                text=True,
                cwd=workspace,
                timeout=120,
            )
            passed = proc.returncode == 0
            output = proc.stdout + proc.stderr
            summary = "All tests passed." if passed else "Some tests failed."
            log.info("TestingAgent: pytest exit code %d", proc.returncode)
            return TestResult(passed=passed, output=output, summary=summary)
        except subprocess.TimeoutExpired:
            log.error("TestingAgent: pytest timed out.")
            return TestResult(passed=False, output="pytest timed out.", summary="Tests timed out.")
        except Exception as exc:  # noqa: BLE001
            log.error("TestingAgent: pytest error: %s", exc)
            return TestResult(passed=False, output=str(exc), summary="Test runner error.")
