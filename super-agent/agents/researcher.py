"""Research agent — requirements extraction (Blueprint §7)."""

from __future__ import annotations

from typing import Any

from brain.protocol import LLMClient
from orchestrator.messages import AgentAction, AgentMessage, TaskStatus


def run_research(
    task_id: str,
    goal: str,
    llm: LLMClient | None,
    *,
    plan_excerpt: str = "",
) -> AgentMessage:
    if llm:
        prompt = (
            f"User goal:\n{goal}\n\n"
            f"Prior plan excerpt:\n{plan_excerpt}\n\n"
            "List 4–8 concrete requirements as a bullet list. Match the user's language (Persian if they wrote Persian)."
        )
        try:
            text = llm.generate(prompt, system="You are a software analyst. Be concise.")
            requirements: list[Any] = [{"text": line.strip()} for line in text.splitlines() if line.strip()]
            if not requirements:
                requirements = [{"text": text.strip()}]
        except Exception as exc:  # noqa: BLE001
            return AgentMessage(
                task_id=task_id,
                agent="researcher",
                action=AgentAction.RESEARCH,
                input={"goal": goal},
                output={},
                status=TaskStatus.ERROR.value,
                error=str(exc),
            )
    else:
        requirements = [
            {"text": "Clarify scope and constraints from the stated goal."},
            {"text": "Define inputs/outputs and success criteria."},
            {"text": "Choose stack and hosting (cloud API or self-hosted) explicitly."},
        ]
    return AgentMessage(
        task_id=task_id,
        agent="researcher",
        action=AgentAction.RESEARCH,
        input={"goal": goal},
        output={"requirements": requirements},
        status=TaskStatus.DONE.value,
    )
