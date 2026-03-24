"""Config loader and thin facade over workflow (Blueprint §2.2)."""

from __future__ import annotations

from pathlib import Path

from brain.protocol import LLMClient
from memory.store import TaskStore
from orchestrator.messages import AgentMessage
from orchestrator.workflow import WorkflowMode, run_workflow


def run_demo_flow(
    *,
    store: TaskStore,
    goal: str,
    llm: LLMClient | None,
) -> list[AgentMessage]:
    """Backward-compatible: planner (+ brain) only."""
    return run_workflow(store=store, goal=goal, llm=llm, mode="plan_only")


def run_pipeline(
    *,
    store: TaskStore,
    goal: str,
    llm: LLMClient | None,
    mode: WorkflowMode,
) -> list[AgentMessage]:
    return run_workflow(store=store, goal=goal, llm=llm, mode=mode)


def load_config(path: Path) -> dict:
    import yaml

    with path.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data if isinstance(data, dict) else {}
