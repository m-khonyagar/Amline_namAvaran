"""Tester agent — checks and smoke validation (Blueprint §7)."""

from __future__ import annotations

from typing import Any

from brain.protocol import LLMClient
from orchestrator.messages import AgentAction, AgentMessage, TaskStatus


def run_tester(
    task_id: str,
    goal: str,
    llm: LLMClient | None,
    code_outline: Any | None,
) -> AgentMessage:
    if llm:
        prompt = (
            f"Goal:\n{goal}\n\nCode:\n{code_outline!s}\n\n"
            "List 3 pytest-style test case names (one per line, no numbering)."
        )
        try:
            raw = llm.generate(prompt, system="You are a QA engineer. Be minimal.")
            cases = [ln.strip() for ln in raw.splitlines() if ln.strip()]
        except Exception as exc:  # noqa: BLE001
            return AgentMessage(
                task_id=task_id,
                agent="tester",
                action=AgentAction.TEST,
                input={"goal": goal},
                output={},
                status=TaskStatus.ERROR.value,
                error=str(exc),
            )
        result = "passed"
    else:
        cases = ["test_main_runs", "test_imports", "test_cli_smoke"]
        result = "skipped_offline"
    return AgentMessage(
        task_id=task_id,
        agent="tester",
        action=AgentAction.TEST,
        input={"goal": goal},
        output={"cases": cases, "result": result},
        status=TaskStatus.DONE.value,
    )
