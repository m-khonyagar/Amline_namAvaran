"""End-to-end workflow: PLAN → RESEARCH → CODE → TEST → EXECUTE (Blueprint §8)."""

from __future__ import annotations

import logging
from typing import Literal

from agents.coder import run_codegen
from agents.executor import run_executor
from agents.planner import plan_stub
from agents.researcher import run_research
from agents.tester import run_tester
from brain.protocol import LLMClient
from memory.store import TaskStore
from orchestrator.messages import AgentAction, AgentMessage, TaskStatus

log = logging.getLogger(__name__)

WorkflowMode = Literal["full", "plan_only"]


def _log(store: TaskStore, msg: AgentMessage) -> None:
    store.log_event(
        task_id=msg.task_id,
        agent=msg.agent,
        action=str(msg.action),
        status=msg.status,
        payload=msg.model_dump(),
    )


def _brain_plan(task_id: str, goal: str, llm: LLMClient) -> AgentMessage | None:
    sys_prompt = (
        "You are a concise planning assistant. Reply in Persian when the user writes in Persian. "
        "Output a short numbered task list only."
    )
    try:
        text = llm.generate(goal, system=sys_prompt)
    except Exception as exc:  # noqa: BLE001
        log.warning("Brain LLM failed: %s", exc)
        err = AgentMessage(
            task_id=task_id,
            agent="brain",
            action=AgentAction.PLAN,
            input={"goal": goal},
            output={},
            status=TaskStatus.ERROR.value,
            error=str(exc),
        )
        return err
    return AgentMessage(
        task_id=task_id,
        agent="brain",
        action=AgentAction.PLAN,
        input={"goal": goal},
        output={"llm_plan": text},
        status=TaskStatus.DONE.value,
    )


def run_workflow(
    *,
    store: TaskStore,
    goal: str,
    llm: LLMClient | None,
    mode: WorkflowMode = "full",
) -> list[AgentMessage]:
    task_id = TaskStore.new_task_id()
    out: list[AgentMessage] = []

    plan = plan_stub(task_id, goal)
    out.append(plan)
    _log(store, plan)

    plan_text = ""
    if llm:
        bm = _brain_plan(task_id, goal, llm)
        if bm is not None:
            out.append(bm)
            _log(store, bm)
            if bm.status == TaskStatus.ERROR.value:
                return out
            plan_text = str(bm.output.get("llm_plan") or "")
    else:
        plan_text = str(plan.output.get("tasks") or "")

    if mode == "plan_only":
        return out

    r = run_research(task_id, goal, llm, plan_excerpt=plan_text[:2000])
    out.append(r)
    _log(store, r)

    c = run_codegen(task_id, goal, llm, requirements=r.output.get("requirements"))
    out.append(c)
    _log(store, c)

    t = run_tester(task_id, goal, llm, code_outline=c.output.get("code"))
    out.append(t)
    _log(store, t)

    x = run_executor(task_id, goal, test_summary=t.output)
    out.append(x)
    _log(store, x)

    return out
