"""Coder agent — implementation outline (Blueprint §7)."""

from __future__ import annotations

from typing import Any

from brain.protocol import LLMClient
from orchestrator.messages import AgentAction, AgentMessage, TaskStatus


def run_codegen(
    task_id: str,
    goal: str,
    llm: LLMClient | None,
    requirements: Any | None,
) -> AgentMessage:
    if llm:
        prompt = (
            f"Goal:\n{goal}\n\nRequirements:\n{requirements!s}\n\n"
            "Write one minimal Python example (single markdown fenced code block) that demonstrates the core logic. "
            "No prose outside the fence."
        )
        try:
            code = llm.generate(prompt, system="You are a senior Python engineer.")
        except Exception as exc:  # noqa: BLE001
            return AgentMessage(
                task_id=task_id,
                agent="coder",
                action=AgentAction.CODE,
                input={"goal": goal},
                output={},
                status=TaskStatus.ERROR.value,
                error=str(exc),
            )
    else:
        code = (
            "# offline stub\n"
            "def main() -> None:\n"
            "    print('Super-Agent stub: implement from requirements')\n\n"
            "if __name__ == '__main__':\n"
            "    main()\n"
        )
    return AgentMessage(
        task_id=task_id,
        agent="coder",
        action=AgentAction.CODE,
        input={"goal": goal},
        output={"code": code, "language": "python"},
        status=TaskStatus.DONE.value,
    )
