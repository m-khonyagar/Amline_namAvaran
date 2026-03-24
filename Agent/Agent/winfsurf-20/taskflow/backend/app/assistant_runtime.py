from __future__ import annotations

import asyncio
import json
import shutil
import smtplib
import ssl
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path
from typing import Any

from fastapi import HTTPException, UploadFile


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    candidate = value.replace("Z", "+00:00")
    dt = datetime.fromisoformat(candidate)
    if dt.tzinfo is None:
      dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class AssistantRuntime:
    def __init__(self, base_dir: Path, task_store: Any, computer_control: Any, notifier: Any, improver: Any | None = None) -> None:
        self.base_dir = base_dir
        self.task_store = task_store
        self.computer_control = computer_control
        self.notifier = notifier
        self.improver = improver
        self.state_path = base_dir / "assistant_state.json"
        self.upload_root = base_dir.parent / "workspace" / "assistant_uploads"
        self.upload_root.mkdir(parents=True, exist_ok=True)
        self.lock = asyncio.Lock()
        self.state: dict[str, Any] = {
            "sessions": {},
            "connectors": {},
            "scheduled_actions": {},
            "uploads": {},
        }
        self._load()
        self.scheduler_task: asyncio.Task[Any] | None = None
        self.telegram_task: asyncio.Task[Any] | None = None
        self.bale_task: asyncio.Task[Any] | None = None

    def _load(self) -> None:
        if self.state_path.exists():
            self.state = json.loads(self.state_path.read_text(encoding="utf-8"))
        self.state.setdefault("sessions", {})
        self.state.setdefault("connectors", {})
        self.state.setdefault("scheduled_actions", {})
        self.state.setdefault("uploads", {})

    def _save(self) -> None:
        self.state_path.write_text(json.dumps(self.state, ensure_ascii=False, indent=2), encoding="utf-8")

    async def start(self) -> None:
        if self.scheduler_task and not self.scheduler_task.done():
            return
        self.scheduler_task = asyncio.create_task(self._scheduler_loop())
        if not self.telegram_task or self.telegram_task.done():
            self.telegram_task = asyncio.create_task(self._telegram_loop())
        if not self.bale_task or self.bale_task.done():
            self.bale_task = asyncio.create_task(self._bale_loop())

    async def stop(self) -> None:
        if self.scheduler_task and not self.scheduler_task.done():
            self.scheduler_task.cancel()
            try:
                await self.scheduler_task
            except asyncio.CancelledError:
                pass
        if self.telegram_task and not self.telegram_task.done():
            self.telegram_task.cancel()
            try:
                await self.telegram_task
            except asyncio.CancelledError:
                pass
        if self.bale_task and not self.bale_task.done():
            self.bale_task.cancel()
            try:
                await self.bale_task
            except asyncio.CancelledError:
                pass

    async def _scheduler_loop(self) -> None:
        while True:
            try:
                await self.run_due_actions()
            except Exception:
                pass
            await asyncio.sleep(15)

    async def _telegram_loop(self) -> None:
        while True:
            try:
                connector = None
                async with self.lock:
                    connector = self.state["connectors"].get("telegram")
                    last_update_id = self.state["connectors"].get("telegram", {}).get("last_update_id")
                if connector and connector.get("enabled") and connector.get("config", {}).get("bot_token"):
                    updates = await asyncio.to_thread(
                        self._telegram_request,
                        connector["config"]["bot_token"],
                        "getUpdates",
                        {"timeout": 10, "offset": (last_update_id + 1) if last_update_id else None},
                    )
                    for update in updates.get("result", []):
                        await self._handle_telegram_update(connector, update)
                        async with self.lock:
                            current = self.state["connectors"].setdefault("telegram", connector)
                            current["last_update_id"] = update["update_id"]
                            self._save()
            except Exception:
                pass
            await asyncio.sleep(5)

    async def _bale_loop(self) -> None:
        while True:
            try:
                connector = None
                async with self.lock:
                    connector = self.state["connectors"].get("bale")
                    last_update_id = self.state["connectors"].get("bale", {}).get("last_update_id")
                if connector and connector.get("enabled") and connector.get("config", {}).get("bot_token"):
                    updates = await asyncio.to_thread(
                        self._bale_request,
                        connector["config"]["bot_token"],
                        "getUpdates",
                        {"timeout": 10, "offset": (last_update_id + 1) if last_update_id else None},
                    )
                    for update in updates.get("result", []):
                        await self._handle_bale_update(connector, update)
                        async with self.lock:
                            current = self.state["connectors"].setdefault("bale", connector)
                            current["last_update_id"] = update["update_id"]
                            self._save()
            except Exception:
                pass
            await asyncio.sleep(5)

    async def list_sessions(self) -> list[dict[str, Any]]:
        async with self.lock:
            sessions = list(self.state["sessions"].values())
            return sorted(sessions, key=lambda item: item["updated_at"], reverse=True)

    async def create_session(self, title: str | None = None, mode: str = "chat") -> dict[str, Any]:
        async with self.lock:
            session_id = str(uuid.uuid4())
            now = utc_now()
            session = {
                "id": session_id,
                "title": title or ("Agent session" if mode == "agent" else "New chat"),
                "mode": mode,
                "messages": [],
                "created_at": now,
                "updated_at": now,
            }
            self.state["sessions"][session_id] = session
            self._save()
            return json.loads(json.dumps(session))

    async def get_session(self, session_id: str) -> dict[str, Any]:
        async with self.lock:
            session = self.state["sessions"].get(session_id)
            if not session:
                raise HTTPException(status_code=404, detail="Assistant session not found.")
            return json.loads(json.dumps(session))

    async def list_tools(self) -> list[dict[str, Any]]:
        return [
            {
                "id": "workflow_task",
                "label": "Workflow task",
                "description": "Create and run a local workflow from the current request.",
                "connector_required": False,
            },
            {
                "id": "gmail",
                "label": "Gmail",
                "description": "Send or schedule an email through a connected Gmail account.",
                "connector_required": True,
            },
            {
                "id": "file_share",
                "label": "File share",
                "description": "Copy uploaded files into a shared folder on the local machine.",
                "connector_required": False,
            },
            {
                "id": "powershell",
                "label": "PowerShell",
                "description": "Run a PowerShell command using the desktop operator backend.",
                "connector_required": False,
            },
            {
                "id": "notification",
                "label": "Notification",
                "description": "Show a Windows notification on the local desktop.",
                "connector_required": False,
            },
            {
                "id": "telegram",
                "label": "Telegram",
                "description": "Send a Telegram message through the connected bot.",
                "connector_required": True,
            },
            {
                "id": "bale",
                "label": "Bale",
                "description": "Send a Bale message through the connected bot.",
                "connector_required": True,
            },
        ]

    async def list_connectors(self) -> list[dict[str, Any]]:
        async with self.lock:
            connectors = list(self.state["connectors"].values())
            return sorted(connectors, key=lambda item: item["id"])

    async def upsert_connector(self, connector_type: str, payload: dict[str, Any]) -> dict[str, Any]:
        async with self.lock:
            connector = {
                "id": connector_type,
                "type": connector_type,
                "enabled": payload.get("enabled", True),
                "config": payload.get("config", {}),
                "updated_at": utc_now(),
            }
            self.state["connectors"][connector_type] = connector
            self._save()
            return json.loads(json.dumps(connector))

    async def upload_files(self, files: list[UploadFile]) -> list[dict[str, Any]]:
        uploaded: list[dict[str, Any]] = []
        async with self.lock:
            for file in files:
                file_id = str(uuid.uuid4())
                target_dir = self.upload_root / file_id
                target_dir.mkdir(parents=True, exist_ok=True)
                target_path = target_dir / file.filename
                content = await file.read()
                target_path.write_bytes(content)
                item = {
                    "id": file_id,
                    "name": file.filename,
                    "path": str(target_path),
                    "content_type": file.content_type,
                    "size": len(content),
                    "created_at": utc_now(),
                }
                self.state["uploads"][file_id] = item
                uploaded.append(item)
            self._save()
        return uploaded

    def _get_connector(self, connector_type: str) -> dict[str, Any]:
        connector = self.state["connectors"].get(connector_type)
        if not connector or not connector.get("enabled"):
            raise HTTPException(status_code=400, detail=f"{connector_type} connector is not configured.")
        return connector

    async def post_message(self, session_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        async with self.lock:
            session = self.state["sessions"].get(session_id)
            if not session:
                raise HTTPException(status_code=404, detail="Assistant session not found.")

            now = utc_now()
            user_message = {
                "id": str(uuid.uuid4()),
                "role": "user",
                "content": payload.get("content", ""),
                "created_at": now,
                "attachments": payload.get("attachments", []),
                "assigned_tools": payload.get("assigned_tools", []),
            }
            session["messages"].append(user_message)
            session["updated_at"] = now
            self._save()

        assistant_message = await self._generate_response(session_id, payload, session["mode"])

        async with self.lock:
            session = self.state["sessions"][session_id]
            session["messages"].append(assistant_message)
            session["updated_at"] = assistant_message["created_at"]
            self._save()
            return json.loads(json.dumps({"session": session, "message": assistant_message}))

    async def _generate_response(self, session_id: str, payload: dict[str, Any], mode: str) -> dict[str, Any]:
        content = payload.get("content", "").strip()
        attachments = payload.get("attachments", [])
        assigned_tools = payload.get("assigned_tools", [])
        actions: list[dict[str, Any]] = []
        notes: list[str] = []
        guidance = await self.improver.get_guidance() if self.improver else {
            "guidance": [],
            "preferred_tools": [],
            "prompt_prefix": "",
        }

        if mode == "agent":
            task = await self.task_store.create_task(content or "Untitled workflow request")
            await self._attach_improvement_playbook(task["id"], guidance)
            await self.task_store.run_task(task["id"])
            actions.append({"type": "workflow_task", "status": "started", "task_id": task["id"]})
            notes.append(f"Started a local workflow for: {task['goal']}")
            if guidance.get("guidance"):
                notes.append(f"Applied learned playbook: {guidance['guidance'][0]}")

        for tool in assigned_tools:
            tool_id = tool.get("tool_id")
            parameters = tool.get("parameters", {})
            if tool_id == "gmail":
                action = await self._handle_gmail_tool(parameters)
                actions.append(action)
                notes.append(action["message"])
            elif tool_id == "file_share":
                action = await self._handle_file_share_tool(parameters, attachments)
                actions.append(action)
                notes.append(action["message"])
            elif tool_id == "powershell":
                action = await self._handle_powershell_tool(parameters)
                actions.append(action)
                notes.append(action["message"])
            elif tool_id == "notification":
                action = await self._handle_notification_tool(parameters)
                actions.append(action)
                notes.append(action["message"])
            elif tool_id == "telegram":
                action = await self._handle_telegram_tool(parameters)
                actions.append(action)
                notes.append(action["message"])
            elif tool_id == "bale":
                action = await self._handle_bale_tool(parameters)
                actions.append(action)
                notes.append(action["message"])
            elif tool_id == "workflow_task" and mode != "agent":
                goal = parameters.get("goal") or content
                task = await self.task_store.create_task(goal or "Untitled workflow request")
                await self._attach_improvement_playbook(task["id"], guidance)
                if parameters.get("autorun", True):
                    await self.task_store.run_task(task["id"])
                actions.append({"type": "workflow_task", "status": "started", "task_id": task["id"]})
                notes.append(f"Created workflow task #{task['id']} for: {task['goal']}")

        if not notes:
            notes.append("Message stored. Add a tool or switch to Agent mode to turn requests into real actions.")
        elif guidance.get("preferred_tools"):
            notes.append(f"Current self-improvement profile prefers: {', '.join(guidance['preferred_tools'][:4])}.")

        if attachments:
            notes.append(f"Captured {len(attachments)} uploaded item(s) in the workspace.")

        return {
            "id": str(uuid.uuid4()),
            "role": "assistant",
            "content": "\n".join(f"- {note}" for note in notes),
            "created_at": utc_now(),
            "actions": actions,
        }

    async def _attach_improvement_playbook(self, task_id: str, guidance: dict[str, Any]) -> None:
        lessons = guidance.get("guidance", [])
        if not lessons:
            return
        task = await self.task_store.get_task(task_id)
        workspace_path = Path(task["workspace_path"])
        playbook_path = workspace_path / "agent-playbook.md"
        lines = [
            "# Agent Improvement Playbook",
            "",
            guidance.get("strategy_summary", ""),
            "",
            "## Active Guidance",
        ]
        for item in lessons[:6]:
            lines.append(f"- {item}")
        if guidance.get("preferred_tools"):
            lines += [
                "",
                "## Preferred Tools",
                f"- {', '.join(guidance['preferred_tools'][:6])}",
            ]
        playbook_path.write_text("\n".join(lines), encoding="utf-8")
        artifact = await self.task_store.add_artifact(task_id, playbook_path, "text")
        await self.task_store.emit_event(
            task_id,
            "info",
            "Attached the latest self-improvement playbook to this workflow.",
            event_type="improvement_guidance",
            payload={"artifact_id": artifact["id"]},
        )

    async def _handle_gmail_tool(self, parameters: dict[str, Any]) -> dict[str, Any]:
        connector = self._get_connector("gmail")
        to = parameters.get("to")
        subject = parameters.get("subject") or "Agent Windsurf message"
        body = parameters.get("body") or ""
        scheduled_for = parse_iso_datetime(parameters.get("scheduled_for"))
        if not to:
            raise HTTPException(status_code=400, detail="Gmail tool requires a recipient.")

        if scheduled_for and scheduled_for > datetime.now(timezone.utc):
            action = await self._schedule_action(
                "gmail_send",
                {
                    "connector_id": connector["id"],
                    "to": to,
                    "subject": subject,
                    "body": body,
                },
                scheduled_for,
            )
            return {
                "type": "gmail",
                "status": "scheduled",
                "action_id": action["id"],
                "message": f"Scheduled an email to {to} for {scheduled_for.isoformat()}.",
            }

        result = await asyncio.to_thread(self._send_gmail, connector["config"], to, subject, body)
        return {
            "type": "gmail",
            "status": "sent",
            "message_id": result["message_id"],
            "message": f"Sent an email to {to} with the Gmail connector.",
        }

    def _send_gmail(self, config: dict[str, Any], to: str, subject: str, body: str) -> dict[str, Any]:
        message = EmailMessage()
        from_email = config.get("from_email") or config.get("username")
        if not from_email:
            raise HTTPException(status_code=400, detail="Gmail connector is missing the sender address.")
        message["From"] = from_email
        message["To"] = to
        message["Subject"] = subject
        message.set_content(body)
        host = config.get("host", "smtp.gmail.com")
        port = int(config.get("port", 465))
        username = config.get("username")
        password = config.get("password")
        if not username or not password:
            raise HTTPException(status_code=400, detail="Gmail connector requires username and app password.")

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(host, port, context=context) as server:
            server.login(username, password)
            server.send_message(message)
        return {"message_id": message.get("Message-ID") or str(uuid.uuid4())}

    async def _schedule_action(self, action_type: str, payload: dict[str, Any], scheduled_for: datetime) -> dict[str, Any]:
        async with self.lock:
            action_id = str(uuid.uuid4())
            action = {
                "id": action_id,
                "type": action_type,
                "status": "scheduled",
                "payload": payload,
                "scheduled_for": scheduled_for.isoformat(),
                "created_at": utc_now(),
            }
            self.state["scheduled_actions"][action_id] = action
            self._save()
            return json.loads(json.dumps(action))

    async def run_due_actions(self) -> None:
        now = datetime.now(timezone.utc)
        due_actions: list[dict[str, Any]] = []
        async with self.lock:
            for action in self.state["scheduled_actions"].values():
                if action["status"] != "scheduled":
                    continue
                scheduled_for = parse_iso_datetime(action.get("scheduled_for"))
                if scheduled_for and scheduled_for <= now:
                    due_actions.append(json.loads(json.dumps(action)))

        for action in due_actions:
            try:
                if action["type"] == "gmail_send":
                    connector = self._get_connector(action["payload"]["connector_id"])
                    await asyncio.to_thread(
                        self._send_gmail,
                        connector["config"],
                        action["payload"]["to"],
                        action["payload"]["subject"],
                        action["payload"]["body"],
                    )
                async with self.lock:
                    self.state["scheduled_actions"][action["id"]]["status"] = "completed"
                    self.state["scheduled_actions"][action["id"]]["completed_at"] = utc_now()
                    self._save()
            except Exception as error:
                async with self.lock:
                    self.state["scheduled_actions"][action["id"]]["status"] = "failed"
                    self.state["scheduled_actions"][action["id"]]["error"] = str(error)
                    self._save()

    async def _handle_file_share_tool(self, parameters: dict[str, Any], attachments: list[dict[str, Any]]) -> dict[str, Any]:
        if not attachments:
            raise HTTPException(status_code=400, detail="File share tool requires at least one uploaded file.")
        target = Path(parameters.get("target_folder") or (self.base_dir.parent / "workspace" / "shared_files"))
        target.mkdir(parents=True, exist_ok=True)
        copied = 0
        async with self.lock:
            for attachment in attachments:
                upload = self.state["uploads"].get(attachment["id"])
                if not upload:
                    continue
                source = Path(upload["path"])
                if source.exists():
                    shutil.copy2(source, target / source.name)
                    copied += 1
        return {
            "type": "file_share",
            "status": "completed",
            "message": f"Copied {copied} file(s) into {target}.",
            "target_folder": str(target),
        }

    async def _handle_powershell_tool(self, parameters: dict[str, Any]) -> dict[str, Any]:
        command = parameters.get("command")
        if not command:
            raise HTTPException(status_code=400, detail="PowerShell tool requires a command.")
        if not (await self.computer_control.session_status()).get("active"):
            await self.computer_control.start_session("workspace", str(self.base_dir.parent / "workspace"))
        result = await self.computer_control.run_command(command, timeout=int(parameters.get("timeout", 30)), admin=bool(parameters.get("admin", False)))
        return {
            "type": "powershell",
            "status": "completed" if result.get("success") else "failed",
            "message": "PowerShell command executed." if result.get("success") else "PowerShell command failed.",
            "result": result,
        }

    async def _handle_notification_tool(self, parameters: dict[str, Any]) -> dict[str, Any]:
        title = parameters.get("title") or "Agent Windsurf"
        message = parameters.get("message") or "New notification from the assistant."
        result = await self.notifier.send(title, message, source="assistant")
        return {
            "type": "notification",
            "status": "completed" if result.get("ok") else "failed",
            "message": f"Notification sent: {title}",
            "result": result,
        }

    async def _handle_telegram_tool(self, parameters: dict[str, Any]) -> dict[str, Any]:
        connector = self._get_connector("telegram")
        chat_id = parameters.get("chat_id") or connector["config"].get("default_chat_id")
        text = parameters.get("text") or parameters.get("message") or ""
        if not chat_id or not text:
            raise HTTPException(status_code=400, detail="Telegram tool requires chat_id and text.")
        await asyncio.to_thread(self._telegram_request, connector["config"]["bot_token"], "sendMessage", {"chat_id": chat_id, "text": text})
        return {
            "type": "telegram",
            "status": "sent",
            "message": f"Sent a Telegram message to chat {chat_id}.",
        }

    async def _handle_bale_tool(self, parameters: dict[str, Any]) -> dict[str, Any]:
        connector = self._get_connector("bale")
        chat_id = parameters.get("chat_id") or connector["config"].get("default_chat_id")
        text = parameters.get("text") or parameters.get("message") or ""
        if not chat_id or not text:
            raise HTTPException(status_code=400, detail="Bale tool requires chat_id and text.")
        await asyncio.to_thread(self._bale_request, connector["config"]["bot_token"], "sendMessage", {"chat_id": chat_id, "text": text})
        return {
            "type": "bale",
            "status": "sent",
            "message": f"Sent a Bale message to chat {chat_id}.",
        }

    def _telegram_request(self, token: str, method: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        query = {}
        if payload:
            query = {key: value for key, value in payload.items() if value is not None}
        encoded = urllib.parse.urlencode(query)
        url = f"https://api.telegram.org/bot{token}/{method}"
        if encoded:
            url = f"{url}?{encoded}"
        with urllib.request.urlopen(url, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))

    def _bale_request(self, token: str, method: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        query = {}
        if payload:
            query = {key: value for key, value in payload.items() if value is not None}
        encoded = urllib.parse.urlencode(query)
        # Inference: Bale's bot API follows a Telegram-like pattern and supports a configurable base URL.
        url = f"https://tapi.bale.ai/bot{token}/{method}"
        if encoded:
            url = f"{url}?{encoded}"
        with urllib.request.urlopen(url, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))

    async def _handle_telegram_update(self, connector: dict[str, Any], update: dict[str, Any]) -> None:
        message = update.get("message") or update.get("edited_message")
        if not message:
            return
        chat_id = str(message["chat"]["id"])
        allowed = connector.get("config", {}).get("allowed_chat_ids", "")
        allowed_chat_ids = {item.strip() for item in str(allowed).split(",") if item.strip()}
        if allowed_chat_ids and chat_id not in allowed_chat_ids:
            return
        text = (message.get("text") or "").strip()
        if not text:
            return

        bot_token = connector["config"]["bot_token"]
        if text.startswith("/start"):
            await asyncio.to_thread(
                self._telegram_request,
                bot_token,
                "sendMessage",
                {"chat_id": chat_id, "text": "Agent Windsurf is connected. Use /status, /agent <goal>, /run <powershell>, or send a normal message."},
            )
            return

        if text.startswith("/status"):
            tasks = await self.task_store.list_tasks()
            status_text = f"Tasks: {len(tasks)} | Latest: {tasks[0]['goal'] if tasks else 'none'}"
            await asyncio.to_thread(self._telegram_request, bot_token, "sendMessage", {"chat_id": chat_id, "text": status_text})
            return

        if text.startswith("/agent "):
            goal = text[len("/agent ") :].strip()
            session = await self.create_session("Telegram agent", "agent")
            result = await self.post_message(session["id"], {"content": goal, "attachments": [], "assigned_tools": []})
            reply = result["message"]["content"]
            await asyncio.to_thread(self._telegram_request, bot_token, "sendMessage", {"chat_id": chat_id, "text": reply})
            await self.notifier.send("Telegram agent request", goal, source="telegram")
            return

        if text.startswith("/run "):
            command = text[len("/run ") :].strip()
            if not (await self.computer_control.session_status()).get("active"):
                await self.computer_control.start_session("workspace", str(self.base_dir.parent / "workspace"))
            result = await self.computer_control.run_command(command, timeout=30, admin=False)
            reply = result.get("stdout") or result.get("stderr") or "Command finished."
            await asyncio.to_thread(self._telegram_request, bot_token, "sendMessage", {"chat_id": chat_id, "text": reply[:3500]})
            await self.notifier.send("Telegram PowerShell", command, source="telegram")
            return

        if text.startswith("/notify "):
            body = text[len("/notify ") :].strip()
            await self.notifier.send("Telegram notification", body, source="telegram")
            await asyncio.to_thread(self._telegram_request, bot_token, "sendMessage", {"chat_id": chat_id, "text": "Notification dispatched."})
            return

        session = await self.create_session("Telegram chat", "chat")
        result = await self.post_message(session["id"], {"content": text, "attachments": [], "assigned_tools": []})
        await asyncio.to_thread(self._telegram_request, bot_token, "sendMessage", {"chat_id": chat_id, "text": result["message"]["content"][:3500]})

    async def _handle_bale_update(self, connector: dict[str, Any], update: dict[str, Any]) -> None:
        message = update.get("message") or update.get("edited_message")
        if not message:
            return
        chat_id = str(message["chat"]["id"])
        allowed = connector.get("config", {}).get("allowed_chat_ids", "")
        allowed_chat_ids = {item.strip() for item in str(allowed).split(",") if item.strip()}
        if allowed_chat_ids and chat_id not in allowed_chat_ids:
            return
        text = (message.get("text") or "").strip()
        if not text:
            return

        bot_token = connector["config"]["bot_token"]
        if text.startswith("/start"):
            await asyncio.to_thread(
                self._bale_request,
                bot_token,
                "sendMessage",
                {"chat_id": chat_id, "text": "Agent Windsurf is connected in Bale. Use /status, /agent <goal>, /run <powershell>, or /notify <message>."},
            )
            return

        if text.startswith("/status"):
            tasks = await self.task_store.list_tasks()
            status_text = f"Tasks: {len(tasks)} | Latest: {tasks[0]['goal'] if tasks else 'none'}"
            await asyncio.to_thread(self._bale_request, bot_token, "sendMessage", {"chat_id": chat_id, "text": status_text})
            return

        if text.startswith("/agent "):
            goal = text[len("/agent ") :].strip()
            session = await self.create_session("Bale agent", "agent")
            result = await self.post_message(session["id"], {"content": goal, "attachments": [], "assigned_tools": []})
            await asyncio.to_thread(self._bale_request, bot_token, "sendMessage", {"chat_id": chat_id, "text": result["message"]["content"][:3500]})
            await self.notifier.send("Bale agent request", goal, source="bale")
            return

        if text.startswith("/run "):
            command = text[len("/run ") :].strip()
            if not (await self.computer_control.session_status()).get("active"):
                await self.computer_control.start_session("workspace", str(self.base_dir.parent / "workspace"))
            result = await self.computer_control.run_command(command, timeout=30, admin=False)
            reply = result.get("stdout") or result.get("stderr") or "Command finished."
            await asyncio.to_thread(self._bale_request, bot_token, "sendMessage", {"chat_id": chat_id, "text": reply[:3500]})
            await self.notifier.send("Bale PowerShell", command, source="bale")
            return

        if text.startswith("/notify "):
            body = text[len("/notify ") :].strip()
            await self.notifier.send("Bale notification", body, source="bale")
            await asyncio.to_thread(self._bale_request, bot_token, "sendMessage", {"chat_id": chat_id, "text": "Notification dispatched."})
            return

        session = await self.create_session("Bale chat", "chat")
        result = await self.post_message(session["id"], {"content": text, "attachments": [], "assigned_tools": []})
        await asyncio.to_thread(self._bale_request, bot_token, "sendMessage", {"chat_id": chat_id, "text": result["message"]["content"][:3500]})
