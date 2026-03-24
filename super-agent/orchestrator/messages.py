"""Agent message protocol (Blueprint §5)."""

from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


class AgentAction(str, Enum):
    PLAN = "PLAN"
    RESEARCH = "RESEARCH"
    CODE = "CODE"
    TEST = "TEST"
    EXECUTE = "EXECUTE"


class TaskStatus(str, Enum):
    PENDING = "pending"
    DONE = "done"
    ERROR = "error"


class AgentMessage(BaseModel):
    task_id: str
    agent: str
    action: AgentAction | str
    input: dict[str, Any] = Field(default_factory=dict)
    output: dict[str, Any] = Field(default_factory=dict)
    status: Literal["pending", "done", "error"] = "pending"
    error: str | None = None
