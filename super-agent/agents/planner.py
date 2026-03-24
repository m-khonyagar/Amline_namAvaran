"""Planner agent — goal to structured tasks (Blueprint §7)."""

from __future__ import annotations

from orchestrator.messages import AgentAction, AgentMessage, TaskStatus


def plan_stub(task_id: str, goal: str) -> AgentMessage:
    return AgentMessage(
        task_id=task_id,
        agent="planner",
        action=AgentAction.PLAN,
        input={"goal": goal},
        output={"tasks": [{"id": "1", "title": "Research", "action": "RESEARCH"}, {"id": "2", "title": "Implement", "action": "CODE"}]},
        status=TaskStatus.DONE.value,
    )
