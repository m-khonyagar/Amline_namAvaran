from __future__ import annotations

from pathlib import Path

import pytest

from memory.store import TaskStore
from orchestrator.messages import AgentAction
from orchestrator.pipeline import run_pipeline


def _action(m) -> str:
    a = m.action
    return a.value if isinstance(a, AgentAction) else str(a)


def test_full_offline_five_steps(tmp_path: Path) -> None:
    db = tmp_path / "t.db"
    store = TaskStore(db)
    try:
        msgs = run_pipeline(store=store, goal="build a tiny cli", llm=None, mode="full")
    finally:
        store.close()
    assert len(msgs) == 5
    assert [_action(m) for m in msgs] == ["PLAN", "RESEARCH", "CODE", "TEST", "EXECUTE"]
    tid = msgs[0].task_id
    trace = TaskStore.read_trace(db, tid)
    assert len(trace) >= 5


def test_plan_only_one_step(tmp_path: Path) -> None:
    db = tmp_path / "t2.db"
    store = TaskStore(db)
    try:
        msgs = run_pipeline(store=store, goal="x", llm=None, mode="plan_only")
    finally:
        store.close()
    assert len(msgs) == 1
    assert _action(msgs[0]) == "PLAN"
