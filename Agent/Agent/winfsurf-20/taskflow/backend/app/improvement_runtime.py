from __future__ import annotations

import asyncio
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class ImprovementRuntime:
    def __init__(self, base_dir: Path, task_store: Any) -> None:
        self.base_dir = base_dir
        self.task_store = task_store
        self.state_path = base_dir / "improvement_state.json"
        self.lock = asyncio.Lock()
        self.review_task: asyncio.Task[Any] | None = None
        self.state: dict[str, Any] = {
            "enabled": True,
            "auto_review_interval_minutes": 20,
            "last_review_at": None,
            "profile": {
                "strategy_summary": "Use small, verifiable workflow slices and surface outputs early.",
                "prompt_prefix": "Break the request into a short plan, validate progress often, and produce a visible artifact.",
                "preferred_tools": [],
                "guidance": [],
            },
            "reviews": [],
        }
        self._load()

    def _load(self) -> None:
        if self.state_path.exists():
            self.state = json.loads(self.state_path.read_text(encoding="utf-8"))
        self.state.setdefault("enabled", True)
        self.state.setdefault("auto_review_interval_minutes", 20)
        self.state.setdefault("last_review_at", None)
        self.state.setdefault("reviews", [])
        self.state.setdefault("profile", {})
        self.state["profile"].setdefault("strategy_summary", "Use small, verifiable workflow slices and surface outputs early.")
        self.state["profile"].setdefault("prompt_prefix", "Break the request into a short plan, validate progress often, and produce a visible artifact.")
        self.state["profile"].setdefault("preferred_tools", [])
        self.state["profile"].setdefault("guidance", [])

    def _save(self) -> None:
        self.state_path.write_text(json.dumps(self.state, ensure_ascii=False, indent=2), encoding="utf-8")

    async def start(self) -> None:
        if self.review_task and not self.review_task.done():
            return
        self.review_task = asyncio.create_task(self._review_loop())

    async def stop(self) -> None:
        if self.review_task and not self.review_task.done():
            self.review_task.cancel()
            try:
                await self.review_task
            except asyncio.CancelledError:
                pass

    async def _review_loop(self) -> None:
        while True:
            try:
                status = await self.status()
                if status["enabled"]:
                    await self.run_review()
            except Exception:
                pass
            interval = max(5, int(self.state.get("auto_review_interval_minutes", 20)))
            await asyncio.sleep(interval * 60)

    async def status(self) -> dict[str, Any]:
        tasks = await self.task_store.list_tasks()
        async with self.lock:
            reviews = list(self.state.get("reviews", []))
            return {
                "enabled": self.state["enabled"],
                "auto_review_interval_minutes": self.state["auto_review_interval_minutes"],
                "last_review_at": self.state["last_review_at"],
                "review_count": len(reviews),
                "task_count": len(tasks),
                "profile": json.loads(json.dumps(self.state["profile"])),
            }

    async def update_config(self, payload: dict[str, Any]) -> dict[str, Any]:
        async with self.lock:
            if "enabled" in payload and payload["enabled"] is not None:
                self.state["enabled"] = bool(payload["enabled"])
            if "auto_review_interval_minutes" in payload and payload["auto_review_interval_minutes"] is not None:
                self.state["auto_review_interval_minutes"] = max(5, int(payload["auto_review_interval_minutes"]))
            self._save()
        return await self.status()

    async def list_lessons(self) -> list[dict[str, Any]]:
        async with self.lock:
            reviews = list(self.state.get("reviews", []))
            return reviews[:25]

    async def get_guidance(self) -> dict[str, Any]:
        async with self.lock:
            return json.loads(json.dumps(self.state["profile"]))

    async def run_review(self) -> dict[str, Any]:
        tasks = await self.task_store.list_tasks()
        assistant_state = self._load_assistant_state()
        summary = self._build_review(tasks, assistant_state)
        async with self.lock:
            self.state["last_review_at"] = utc_now()
            self.state["profile"] = summary["profile"]
            review = {
                "id": summary["id"],
                "created_at": self.state["last_review_at"],
                "task_snapshot": summary["task_snapshot"],
                "lessons": summary["profile"]["guidance"],
                "preferred_tools": summary["profile"]["preferred_tools"],
            }
            self.state["reviews"] = [review, *self.state.get("reviews", [])][:30]
            self._save()
            return json.loads(json.dumps(review))

    def _load_assistant_state(self) -> dict[str, Any]:
        path = self.base_dir / "assistant_state.json"
        if not path.exists():
            return {}
        return json.loads(path.read_text(encoding="utf-8"))

    def _build_review(self, tasks: list[dict[str, Any]], assistant_state: dict[str, Any]) -> dict[str, Any]:
        status_counter = Counter(task["status"] for task in tasks)
        goal_text = " ".join(task.get("goal", "").lower() for task in tasks[:40])
        preferred_tools: list[str] = []
        if any(token in goal_text for token in ["email", "mail", "gmail"]):
            preferred_tools.append("gmail")
        if any(token in goal_text for token in ["file", "report", "document", "share", "artifact"]):
            preferred_tools.append("file_share")
        if any(token in goal_text for token in ["notify", "alert", "remind"]):
            preferred_tools.append("notification")

        connectors = assistant_state.get("connectors", {}) if isinstance(assistant_state, dict) else {}
        if connectors.get("telegram", {}).get("enabled"):
            preferred_tools.append("telegram")
        if connectors.get("bale", {}).get("enabled"):
            preferred_tools.append("bale")

        tool_usage = Counter()
        for session in assistant_state.get("sessions", {}).values() if isinstance(assistant_state, dict) else []:
            for message in session.get("messages", []):
                for action in message.get("actions", []):
                    tool_usage[action.get("type", "")] += 1
        for tool_id, _count in tool_usage.most_common(3):
            if tool_id and tool_id not in preferred_tools:
                preferred_tools.append(tool_id)

        guidance: list[str] = []
        if status_counter.get("failed", 0) > 0:
            guidance.append("Break large requests into smaller milestones and validate progress after every major action.")
        if status_counter.get("running", 0) > 0:
            guidance.append("Prefer short, reversible execution bursts when a request needs live operator actions.")
        if status_counter.get("succeeded", 0) > 0:
            guidance.append("Create a visible artifact early and keep the task summary concise so users can verify outcomes quickly.")
        if preferred_tools:
            guidance.append(f"Prefer the most relevant operational tools first: {', '.join(preferred_tools[:4])}.")
        if not guidance:
            guidance.append("Start with a clear plan, keep each run observable, and produce one concrete output before expanding scope.")

        strategy_summary = (
            "Continuously improve by reviewing recent runs, extracting reusable lessons, and feeding a compact playbook into the next agent workflow."
        )
        prompt_prefix = " ".join(guidance[:3])

        return {
            "id": f"review-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
            "task_snapshot": {
                "total": len(tasks),
                "succeeded": status_counter.get("succeeded", 0),
                "failed": status_counter.get("failed", 0),
                "running": status_counter.get("running", 0),
                "queued": status_counter.get("queued", 0),
            },
            "profile": {
                "strategy_summary": strategy_summary,
                "prompt_prefix": prompt_prefix,
                "preferred_tools": preferred_tools[:6],
                "guidance": guidance[:6],
            },
        }
