"""Executor agent — build / deliver summary (Blueprint §7)."""

from __future__ import annotations

from typing import Any

from orchestrator.messages import AgentAction, AgentMessage, TaskStatus


def run_executor(task_id: str, goal: str, test_summary: dict[str, Any]) -> AgentMessage:
    artifacts = [
        "structured_trace_in_sqlite",
        "api_endpoints_/health_/ready_/v1/run",
        "docker_compose_stack",
    ]
    return AgentMessage(
        task_id=task_id,
        agent="executor",
        action=AgentAction.EXECUTE,
        input={"goal": goal},
        output={"artifacts": artifacts, "test": test_summary},
        status=TaskStatus.DONE.value,
    )
