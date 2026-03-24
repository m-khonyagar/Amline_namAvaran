from __future__ import annotations

import asyncio
import json
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi import File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from app.assistant_runtime import AssistantRuntime
from app.computer_control import ComputerControlManager
from app.improvement_runtime import ImprovementRuntime
from app.notification_runtime import NotificationRuntime
from app.schemas import (
    AssistantConnectorUpsertRequest,
    AssistantMessageRequest,
    AssistantSessionCreateRequest,
    ComputerClickRequest,
    ComputerCommandRequest,
    ComputerHotkeyRequest,
    ComputerSessionStartRequest,
    ComputerTextRequest,
    ImprovementConfigRequest,
    SettingsUpdateRequest,
    TaskCreateRequest,
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


BASE_DIR = Path(__file__).resolve().parents[2]
STATE_PATH = BASE_DIR / "taskflow_state.json"
DEFAULT_WORKSPACE_ROOT = BASE_DIR.parent / "workspace"


def resolve_workspace_path(raw_path: str | None) -> Path:
    if not raw_path:
        return DEFAULT_WORKSPACE_ROOT
    path = Path(raw_path)
    return path if path.is_absolute() else (BASE_DIR.parent / path).resolve()


def ensure_dirs(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)
    (path / "tasks").mkdir(parents=True, exist_ok=True)


def default_steps(goal: str) -> list[dict[str, Any]]:
    return [
        {
            "id": str(uuid.uuid4()),
            "idx": 1,
            "title": "Clarify goal",
            "description": f"Review the task objective: {goal}",
            "status": "ready",
            "agent": "PlannerAgent",
            "start_time": None,
            "end_time": None,
        },
        {
            "id": str(uuid.uuid4()),
            "idx": 2,
            "title": "Produce execution notes",
            "description": "Write a concise implementation outline and success criteria.",
            "status": "ready",
            "agent": "CoderAgent",
            "start_time": None,
            "end_time": None,
        },
        {
            "id": str(uuid.uuid4()),
            "idx": 3,
            "title": "Create deliverable artifact",
            "description": "Generate a concrete result inside the task workspace.",
            "status": "ready",
            "agent": "ExecutorAgent",
            "start_time": None,
            "end_time": None,
        },
    ]


def make_memory_items(tasks: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = [
        {
            "id": "pattern-system",
            "task_id": None,
            "type": "pattern",
            "title": "Stable workflow pattern",
            "content": "Tasks work best when they are planned, executed, and summarized with visible artifacts.",
            "tags": ["workflow", "pattern"],
            "createdAt": utc_now(),
            "relevance": 0.92,
        }
    ]
    for task in sorted(tasks.values(), key=lambda t: t["updated_at"], reverse=True)[:25]:
        if task["status"] not in {"succeeded", "running", "paused"}:
            continue
        items.append(
            {
                "id": f"memory-{task['id']}",
                "task_id": task["id"],
                "type": "task_summary",
                "title": task["goal"][:80],
                "content": task.get("summary") or f"Task is currently {task['status']}.",
                "tags": ["taskflow", task["status"]],
                "createdAt": task["updated_at"],
                "relevance": 0.88 if task["status"] == "succeeded" else 0.74,
            }
        )
    return items


@dataclass
class ConnectionManager:
    task_sockets: dict[str, set[WebSocket]]

    def __init__(self) -> None:
        self.task_sockets = {}

    async def connect(self, task_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.task_sockets.setdefault(task_id, set()).add(websocket)

    def disconnect(self, task_id: str, websocket: WebSocket) -> None:
        sockets = self.task_sockets.get(task_id)
        if not sockets:
            return
        sockets.discard(websocket)
        if not sockets:
            self.task_sockets.pop(task_id, None)

    async def broadcast(self, task_id: str, payload: dict[str, Any]) -> None:
        sockets = list(self.task_sockets.get(task_id, set()))
        for socket in sockets:
            try:
                await socket.send_json(payload)
            except Exception:
                self.disconnect(task_id, socket)


class StateStore:
    def __init__(self) -> None:
        self.lock = asyncio.Lock()
        self.runner_tasks: dict[str, asyncio.Task[Any]] = {}
        self.connections = ConnectionManager()
        self.state = {"tasks": {}, "artifacts": {}, "settings": {}}
        self._load()
        self.state.setdefault("settings", {})
        self.state["settings"].setdefault("workspacePath", str(DEFAULT_WORKSPACE_ROOT))
        self.state["settings"].setdefault("safetyMode", "standard")
        self.state["settings"].setdefault("preferredModel", "Local executor")
        ensure_dirs(self.workspace_root)
        self._save()

    def _load(self) -> None:
        if STATE_PATH.exists():
            self.state = json.loads(STATE_PATH.read_text(encoding="utf-8"))

    def _save(self) -> None:
        STATE_PATH.write_text(json.dumps(self.state, ensure_ascii=False, indent=2), encoding="utf-8")

    @property
    def workspace_root(self) -> Path:
        return resolve_workspace_path(self.state["settings"].get("workspacePath"))

    @property
    def tasks_root(self) -> Path:
        return self.workspace_root / "tasks"

    async def create_task(self, goal: str) -> dict[str, Any]:
        async with self.lock:
            task_id = str(uuid.uuid4())
            now = utc_now()
            ensure_dirs(self.workspace_root)
            workspace_path = self.tasks_root / task_id
            workspace_path.mkdir(parents=True, exist_ok=True)
            task = {
                "id": task_id,
                "goal": goal,
                "status": "queued",
                "created_at": now,
                "updated_at": now,
                "workspace_path": str(workspace_path),
                "steps": [],
                "events": [],
                "artifacts": [],
                "summary": "",
            }
            self.state["tasks"][task_id] = task
            self._append_event_locked(task, "info", f"Task created: {goal}", event_type="task_created")
            self._save()
            return task

    async def get_settings(self) -> dict[str, Any]:
        async with self.lock:
            settings = dict(self.state["settings"])
            settings["workspacePath"] = str(self.workspace_root)
            return settings

    async def update_settings(self, payload: dict[str, Any]) -> dict[str, Any]:
        async with self.lock:
            settings = self.state["settings"]
            if "workspacePath" in payload:
                workspace_root = resolve_workspace_path(payload["workspacePath"])
                ensure_dirs(workspace_root)
                settings["workspacePath"] = str(workspace_root)
            if "safetyMode" in payload:
                settings["safetyMode"] = payload["safetyMode"]
            if "preferredModel" in payload:
                settings["preferredModel"] = payload["preferredModel"]
            self._save()
            return dict(settings)

    def _append_event_locked(
        self,
        task: dict[str, Any],
        level: str,
        message: str,
        *,
        event_type: str = "event",
        payload: dict[str, Any] | None = None,
        step_id: str | None = None,
    ) -> dict[str, Any]:
        event = {
            "id": str(uuid.uuid4()),
            "type": event_type,
            "ts": utc_now(),
            "level": level,
            "message": message,
            "payload_json": json.dumps(payload or {}, ensure_ascii=False) if payload else None,
            "step_id": step_id,
        }
        task["events"].append(event)
        task["updated_at"] = event["ts"]
        return event

    async def emit_event(
        self,
        task_id: str,
        level: str,
        message: str,
        *,
        event_type: str = "event",
        payload: dict[str, Any] | None = None,
        step_id: str | None = None,
    ) -> dict[str, Any]:
        async with self.lock:
            task = self._require_task(task_id)
            event = self._append_event_locked(
                task,
                level,
                message,
                event_type=event_type,
                payload=payload,
                step_id=step_id,
            )
            self._save()
        await self.connections.broadcast(task_id, event)
        return event

    def _require_task(self, task_id: str) -> dict[str, Any]:
        task = self.state["tasks"].get(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return task

    async def list_tasks(self) -> list[dict[str, Any]]:
        async with self.lock:
            tasks = list(self.state["tasks"].values())
            return sorted(tasks, key=lambda t: t["updated_at"], reverse=True)

    async def get_task(self, task_id: str) -> dict[str, Any]:
        async with self.lock:
            return json.loads(json.dumps(self._require_task(task_id)))

    async def plan_task(self, task_id: str) -> dict[str, Any]:
        async with self.lock:
            task = self._require_task(task_id)
            if not task["steps"]:
                task["steps"] = default_steps(task["goal"])
            task["status"] = "ready"
            task["updated_at"] = utc_now()
            self._append_event_locked(task, "info", "Execution plan generated.", event_type="plan_ready")
            self._save()
            return json.loads(json.dumps(task))

    async def set_status(self, task_id: str, status: str, message: str, event_type: str) -> dict[str, Any]:
        async with self.lock:
            task = self._require_task(task_id)
            task["status"] = status
            task["updated_at"] = utc_now()
            self._save()
        await self.emit_event(task_id, "info", message, event_type=event_type)
        return {"ok": True}

    async def add_artifact(self, task_id: str, path: Path, kind: str) -> dict[str, Any]:
        async with self.lock:
            task = self._require_task(task_id)
            artifact_id = str(uuid.uuid4())
            artifact = {
                "id": artifact_id,
                "task_id": task_id,
                "path": str(path),
                "kind": kind,
                "created_at": utc_now(),
            }
            self.state["artifacts"][artifact_id] = artifact
            task["artifacts"].append(artifact_id)
            self._save()
            return artifact

    async def list_artifacts(self, limit: int = 50) -> list[dict[str, Any]]:
        async with self.lock:
            artifacts = list(self.state["artifacts"].values())
            return sorted(artifacts, key=lambda a: a["created_at"], reverse=True)[:limit]

    async def get_artifact(self, artifact_id: str) -> dict[str, Any]:
        async with self.lock:
            artifact = self.state["artifacts"].get(artifact_id)
            if not artifact:
                raise HTTPException(status_code=404, detail="Artifact not found")
            return json.loads(json.dumps(artifact))

    async def list_agents(self) -> list[dict[str, Any]]:
        async with self.lock:
            tasks = sorted(self.state["tasks"].values(), key=lambda t: t["updated_at"], reverse=True)
            running = next((task for task in tasks if task["status"] == "running"), None)
            paused = next((task for task in tasks if task["status"] == "paused"), None)
            latest = tasks[0] if tasks else None
            focus_task = running or paused or latest

            def agent_status(name: str, active_on_step: int | None) -> dict[str, Any]:
                if not focus_task:
                    return {
                        "name": name,
                        "status": "idle",
                        "currentTask": "Available",
                        "startTime": None,
                        "endTime": None,
                        "stepsCompleted": 0,
                        "totalSteps": 0,
                    }
                completed = sum(1 for step in focus_task["steps"] if step["status"] == "succeeded")
                current_step = next((step for step in focus_task["steps"] if step["status"] == "running"), None)
                active = current_step and current_step["idx"] == active_on_step and focus_task["status"] == "running"
                return {
                    "name": name,
                    "status": "running" if active else ("paused" if focus_task["status"] == "paused" else "idle"),
                    "currentTask": focus_task["goal"] if active or focus_task["status"] == "paused" else "Available",
                    "startTime": focus_task["created_at"],
                    "endTime": None if focus_task["status"] in {"running", "paused"} else focus_task["updated_at"],
                    "stepsCompleted": completed,
                    "totalSteps": len(focus_task["steps"]),
                }

            return [
                agent_status("PlannerAgent", 1),
                agent_status("CoderAgent", 2),
                agent_status("ExecutorAgent", 3),
                {
                    "name": "ReviewerAgent",
                    "status": "idle" if not latest or latest["status"] != "succeeded" else "completed",
                    "currentTask": latest["goal"] if latest and latest["status"] == "succeeded" else "Available",
                    "startTime": latest["created_at"] if latest else None,
                    "endTime": latest["updated_at"] if latest and latest["status"] == "succeeded" else None,
                    "stepsCompleted": len(latest["steps"]) if latest else 0,
                    "totalSteps": len(latest["steps"]) if latest else 0,
                },
            ]

    async def get_events(self, task_id: str) -> list[dict[str, Any]]:
        async with self.lock:
            task = self._require_task(task_id)
            return json.loads(json.dumps(task["events"]))

    async def memory_items(self, limit: int = 50) -> list[dict[str, Any]]:
        async with self.lock:
            return make_memory_items(self.state["tasks"])[:limit]

    async def run_task(self, task_id: str) -> dict[str, Any]:
        async with self.lock:
            task = self._require_task(task_id)
            if task["status"] == "running":
                return {"ok": True}
            if not task["steps"]:
                task["steps"] = default_steps(task["goal"])
            task["status"] = "running"
            task["updated_at"] = utc_now()
            self._save()
            existing_runner = self.runner_tasks.get(task_id)
            if existing_runner and not existing_runner.done():
                return {"ok": True}
            runner = asyncio.create_task(self._simulate_run(task_id))
            self.runner_tasks[task_id] = runner
        await self.emit_event(task_id, "info", "Task execution started.", event_type="task_started")
        return {"ok": True}

    async def _simulate_run(self, task_id: str) -> None:
        try:
            while True:
                async with self.lock:
                    task = self._require_task(task_id)
                    if task["status"] == "cancelled":
                        return
                    if task["status"] == "paused":
                        next_step = None
                    else:
                        next_step = next((step for step in task["steps"] if step["status"] != "succeeded"), None)
                        if not next_step:
                            task["status"] = "succeeded"
                            task["summary"] = f"Completed task: {task['goal']}"
                            task["updated_at"] = utc_now()
                            self._save()
                            break
                        if next_step["status"] == "ready":
                            next_step["status"] = "running"
                            next_step["start_time"] = utc_now()
                            task["updated_at"] = next_step["start_time"]
                            self._save()
                if next_step is None:
                    await asyncio.sleep(0.5)
                    continue
                await self.emit_event(
                    task_id,
                    "info",
                    f"Executing step {next_step['idx']}: {next_step['title']}",
                    payload={"step": next_step["title"]},
                    step_id=next_step["id"],
                )
                await asyncio.sleep(1.2)
                async with self.lock:
                    task = self._require_task(task_id)
                    current_step = next((step for step in task["steps"] if step["id"] == next_step["id"]), None)
                    if not current_step or task["status"] in {"cancelled", "paused"}:
                        self._save()
                        continue
                    current_step["status"] = "succeeded"
                    current_step["end_time"] = utc_now()
                    current_step["description"] = f"{current_step['title']} completed successfully."
                    task["updated_at"] = current_step["end_time"]
                    self._save()
                await self.emit_event(
                    task_id,
                    "info",
                    f"Finished step {next_step['idx']}: {next_step['title']}",
                    event_type="progress",
                    payload={"step": next_step["title"], "status": "succeeded"},
                    step_id=next_step["id"],
                )
            artifact_path = await self._write_summary_artifact(task_id)
            artifact = await self.add_artifact(task_id, artifact_path, "text")
            await self.emit_event(
                task_id,
                "info",
                "Task completed successfully.",
                event_type="task_completed",
                payload={"artifact_id": artifact["id"]},
            )
        except Exception as exc:
            async with self.lock:
                task = self._require_task(task_id)
                task["status"] = "failed"
                task["summary"] = f"Task failed: {exc}"
                task["updated_at"] = utc_now()
                self._save()
            await self.emit_event(task_id, "error", f"Task failed: {exc}", event_type="task_failed")

    async def _write_summary_artifact(self, task_id: str) -> Path:
        async with self.lock:
            task = self._require_task(task_id)
            task_dir = Path(task["workspace_path"])
            summary_path = task_dir / "summary.md"
            lines = [
                f"# {task['goal']}",
                "",
                f"Status: {task['status']}",
                "",
                "## Steps",
            ]
            for step in task["steps"]:
                lines.append(f"- {step['idx']}. {step['title']} [{step['status']}]")
            lines += [
                "",
                "## Timeline",
            ]
            for event in task["events"][-10:]:
                lines.append(f"- {event['ts']}: {event['message']}")
            summary_path.write_text("\n".join(lines), encoding="utf-8")
            return summary_path


store = StateStore()
computer_control = ComputerControlManager(DEFAULT_WORKSPACE_ROOT)
notification_runtime = NotificationRuntime(DEFAULT_WORKSPACE_ROOT)
improvement_runtime = ImprovementRuntime(BASE_DIR, store)
assistant_runtime = AssistantRuntime(BASE_DIR, store, computer_control, notification_runtime, improvement_runtime)


app = FastAPI(title="TaskFlow Backend", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.on_event("startup")
async def startup_event() -> None:
    await assistant_runtime.start()
    await improvement_runtime.start()


@app.on_event("shutdown")
async def shutdown_event() -> None:
    await assistant_runtime.stop()
    await improvement_runtime.stop()


@app.get("/settings")
async def get_settings() -> dict[str, Any]:
    return await store.get_settings()


@app.put("/settings")
async def update_settings(payload: SettingsUpdateRequest) -> dict[str, Any]:
    return await store.update_settings(payload.model_dump(exclude_none=True))


@app.post("/tasks")
async def create_task(payload: TaskCreateRequest) -> dict[str, str]:
    task = await store.create_task(payload.goal)
    return {"id": task["id"]}


@app.get("/tasks")
async def list_tasks() -> list[dict[str, Any]]:
    tasks = await store.list_tasks()
    return [
        {
            "id": task["id"],
            "goal": task["goal"],
            "status": task["status"],
            "created_at": task["created_at"],
            "updated_at": task["updated_at"],
        }
        for task in tasks
    ]


@app.get("/tasks/{task_id}")
async def get_task(task_id: str) -> dict[str, Any]:
    task = await store.get_task(task_id)
    return {
        "id": task["id"],
        "goal": task["goal"],
        "status": task["status"],
        "created_at": task["created_at"],
        "updated_at": task["updated_at"],
        "workspace_path": task["workspace_path"],
        "summary": task.get("summary", ""),
        "steps": [
            {
                "id": step["id"],
                "idx": step["idx"],
                "title": step["title"],
                "description": step["description"],
                "status": step["status"],
                "agent": step.get("agent"),
                "start_time": step.get("start_time"),
                "end_time": step.get("end_time"),
            }
            for step in task["steps"]
        ],
    }


@app.post("/tasks/{task_id}/plan")
async def plan_task(task_id: str) -> dict[str, Any]:
    task = await store.plan_task(task_id)
    return {"id": task["id"], "status": task["status"], "steps": task["steps"]}


@app.post("/tasks/{task_id}/run")
async def run_task(task_id: str) -> dict[str, bool]:
    return await store.run_task(task_id)


@app.post("/tasks/{task_id}/pause")
async def pause_task(task_id: str) -> dict[str, bool]:
    return await store.set_status(task_id, "paused", "Task paused.", "task_paused")


@app.post("/tasks/{task_id}/resume")
async def resume_task(task_id: str) -> dict[str, bool]:
    result = await store.set_status(task_id, "running", "Task resumed.", "task_resumed")
    await store.run_task(task_id)
    return result


@app.post("/tasks/{task_id}/cancel")
async def cancel_task(task_id: str) -> dict[str, bool]:
    return await store.set_status(task_id, "cancelled", "Task cancelled.", "task_cancelled")


@app.get("/tasks/{task_id}/events")
async def get_task_events(task_id: str) -> list[dict[str, Any]]:
    return await store.get_events(task_id)


@app.get("/tasks/{task_id}/artifacts")
async def get_task_artifacts(task_id: str) -> list[dict[str, Any]]:
    task = await store.get_task(task_id)
    artifacts = []
    for artifact_id in task["artifacts"]:
        artifact = await store.get_artifact(artifact_id)
        file_path = Path(artifact["path"])
        artifacts.append(
            {
                **artifact,
                "size": file_path.stat().st_size if file_path.exists() else 0,
            }
        )
    return artifacts


@app.get("/artifacts")
async def list_artifacts(limit: int = 50) -> list[dict[str, Any]]:
    artifacts = await store.list_artifacts(limit=limit)
    enriched = []
    for artifact in artifacts:
        file_path = Path(artifact["path"])
        enriched.append(
            {
                **artifact,
                "size": file_path.stat().st_size if file_path.exists() else 0,
            }
        )
    return enriched


@app.get("/artifacts/{artifact_id}")
async def get_artifact(artifact_id: str) -> dict[str, Any]:
    artifact = await store.get_artifact(artifact_id)
    file_path = Path(artifact["path"])
    content = ""
    if file_path.exists():
        try:
            content = file_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            content = ""
    return {
        **artifact,
        "size": file_path.stat().st_size if file_path.exists() else 0,
        "content": content,
    }


@app.get("/artifacts/{artifact_id}/download")
async def download_artifact(artifact_id: str) -> FileResponse:
    artifact = await store.get_artifact(artifact_id)
    file_path = Path(artifact["path"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Artifact file missing")
    return FileResponse(file_path, filename=file_path.name)


@app.get("/memory/list")
async def list_memory(limit: int = 50) -> list[dict[str, Any]]:
    return await store.memory_items(limit=limit)


@app.get("/agents")
async def list_agents() -> list[dict[str, Any]]:
    return await store.list_agents()


@app.get("/assistant/tools")
async def assistant_tools() -> list[dict[str, Any]]:
    return await assistant_runtime.list_tools()


@app.get("/assistant/sessions")
async def assistant_sessions() -> list[dict[str, Any]]:
    return await assistant_runtime.list_sessions()


@app.post("/assistant/sessions")
async def assistant_create_session(payload: AssistantSessionCreateRequest) -> dict[str, Any]:
    return await assistant_runtime.create_session(payload.title, payload.mode)


@app.get("/assistant/sessions/{session_id}")
async def assistant_get_session(session_id: str) -> dict[str, Any]:
    return await assistant_runtime.get_session(session_id)


@app.post("/assistant/sessions/{session_id}/messages")
async def assistant_post_message(session_id: str, payload: AssistantMessageRequest) -> dict[str, Any]:
    return await assistant_runtime.post_message(session_id, payload.model_dump())


@app.get("/assistant/connectors")
async def assistant_connectors() -> list[dict[str, Any]]:
    return await assistant_runtime.list_connectors()


@app.put("/assistant/connectors/{connector_type}")
async def assistant_upsert_connector(connector_type: str, payload: AssistantConnectorUpsertRequest) -> dict[str, Any]:
    return await assistant_runtime.upsert_connector(connector_type, payload.model_dump())


@app.post("/assistant/uploads")
async def assistant_uploads(files: list[UploadFile] = File(...)) -> list[dict[str, Any]]:
    return await assistant_runtime.upload_files(files)


@app.get("/notifications/status")
async def notifications_status() -> dict[str, Any]:
    return await notification_runtime.status()


@app.post("/notifications/test")
async def notifications_test() -> dict[str, Any]:
    return await notification_runtime.send("Agent Windsurf", "This is a test notification from the desktop workspace.", source="test")


@app.get("/improvement/status")
async def improvement_status() -> dict[str, Any]:
    return await improvement_runtime.status()


@app.get("/improvement/lessons")
async def improvement_lessons() -> list[dict[str, Any]]:
    return await improvement_runtime.list_lessons()


@app.post("/improvement/run")
async def improvement_run() -> dict[str, Any]:
    return await improvement_runtime.run_review()


@app.put("/improvement/config")
async def improvement_config(payload: ImprovementConfigRequest) -> dict[str, Any]:
    return await improvement_runtime.update_config(payload.model_dump(exclude_none=True))


@app.get("/computer/session/status")
async def computer_session_status() -> dict[str, Any]:
    return await computer_control.session_status()


@app.post("/computer/session/start")
async def computer_session_start(payload: ComputerSessionStartRequest) -> dict[str, Any]:
    workspace = payload.workspace_path or (await store.get_settings()).get("workspacePath")
    return await computer_control.start_session(payload.permission_mode, workspace)


@app.post("/computer/session/end")
async def computer_session_end() -> dict[str, Any]:
    return await computer_control.end_session()


@app.get("/computer/actions/history")
async def computer_action_history(limit: int = 50) -> list[dict[str, Any]]:
    return await computer_control.history(limit)


@app.get("/computer/ide/status")
async def computer_ide_status() -> dict[str, Any]:
    return await computer_control.ide_status()


@app.post("/computer/ide/{ide_name}/launch")
async def computer_launch_ide(ide_name: str) -> dict[str, Any]:
    return await computer_control.launch_ide(ide_name)


@app.post("/computer/screenshot")
async def computer_take_screenshot() -> dict[str, Any]:
    return await computer_control.screenshot()


@app.post("/computer/terminal/command")
async def computer_run_command(payload: ComputerCommandRequest) -> dict[str, Any]:
    return await computer_control.run_command(payload.command, payload.timeout, payload.admin)


@app.post("/computer/keyboard/type")
async def computer_type_text(payload: ComputerTextRequest) -> dict[str, Any]:
    return await computer_control.type_text(payload.text)


@app.post("/computer/keyboard/hotkey")
async def computer_hotkey(payload: ComputerHotkeyRequest) -> dict[str, Any]:
    return await computer_control.press_hotkey(payload.keys)


@app.post("/computer/mouse/click")
async def computer_mouse_click(payload: ComputerClickRequest) -> dict[str, Any]:
    return await computer_control.click(payload.x, payload.y, payload.button, payload.clicks)


@app.get("/computer/windows/active")
async def computer_active_window() -> dict[str, Any]:
    return await computer_control.active_window()


@app.websocket("/ws/tasks/{task_id}")
async def task_events_socket(websocket: WebSocket, task_id: str) -> None:
    await store.connections.connect(task_id, websocket)
    try:
        await websocket.send_json({"type": "heartbeat", "task_id": task_id, "ts": utc_now()})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        store.connections.disconnect(task_id, websocket)
