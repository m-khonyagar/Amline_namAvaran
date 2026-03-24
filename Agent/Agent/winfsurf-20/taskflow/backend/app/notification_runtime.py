from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path
from typing import Any


class NotificationRuntime:
    def __init__(self, workspace_root: Path) -> None:
        self.workspace_root = workspace_root
        self.history: list[dict[str, Any]] = []
        self.enabled = True
        self.lock = asyncio.Lock()

    async def status(self) -> dict[str, Any]:
        async with self.lock:
            return {
                "enabled": self.enabled,
                "history_count": len(self.history),
                "workspace_root": str(self.workspace_root),
            }

    async def send(self, title: str, message: str, *, source: str = "system") -> dict[str, Any]:
        async with self.lock:
            result = await asyncio.to_thread(self._send_windows_toast, title, message)
            record = {
                "title": title,
                "message": message,
                "source": source,
                "ok": result["ok"],
                "detail": result.get("detail", ""),
            }
            self.history.insert(0, record)
            self.history = self.history[:100]
            return record

    def _send_windows_toast(self, title: str, message: str) -> dict[str, Any]:
        escaped_title = title.replace("'", "''")
        escaped_message = message.replace("'", "''")
        script = "\n".join(
            [
                "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null",
                "[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] > $null",
                "$template = @\"",
                "<toast>",
                "  <visual>",
                "    <binding template='ToastGeneric'>",
                f"      <text>{escaped_title}</text>",
                f"      <text>{escaped_message}</text>",
                "    </binding>",
                "  </visual>",
                "</toast>",
                "\"@",
                "$xml = New-Object Windows.Data.Xml.Dom.XmlDocument",
                "$xml.LoadXml($template)",
                "$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)",
                "$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Agent Windsurf')",
                "$notifier.Show($toast)",
            ]
        )
        completed = subprocess.run(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
            capture_output=True,
            text=True,
            timeout=15,
        )
        return {
            "ok": completed.returncode == 0,
            "detail": completed.stderr.strip() or completed.stdout.strip(),
        }
