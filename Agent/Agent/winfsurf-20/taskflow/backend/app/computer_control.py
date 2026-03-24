from __future__ import annotations

import asyncio
import ctypes
import json
import os
import shutil
import subprocess
import tempfile
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import psutil
from PIL import ImageGrab
from fastapi import HTTPException


user32 = ctypes.windll.user32
shell32 = ctypes.windll.shell32

INPUT_MOUSE = 0
INPUT_KEYBOARD = 1
KEYEVENTF_KEYUP = 0x0002
KEYEVENTF_UNICODE = 0x0004
MOUSEEVENTF_MOVE = 0x0001
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
MOUSEEVENTF_RIGHTDOWN = 0x0008
MOUSEEVENTF_RIGHTUP = 0x0010
MOUSEEVENTF_MIDDLEDOWN = 0x0020
MOUSEEVENTF_MIDDLEUP = 0x0040
MOUSEEVENTF_ABSOLUTE = 0x8000
SM_CXSCREEN = 0
SM_CYSCREEN = 1


class MOUSEINPUT(ctypes.Structure):
    _fields_ = [
        ("dx", ctypes.c_long),
        ("dy", ctypes.c_long),
        ("mouseData", ctypes.c_ulong),
        ("dwFlags", ctypes.c_ulong),
        ("time", ctypes.c_ulong),
        ("dwExtraInfo", ctypes.POINTER(ctypes.c_ulong)),
    ]


class KEYBDINPUT(ctypes.Structure):
    _fields_ = [
        ("wVk", ctypes.c_ushort),
        ("wScan", ctypes.c_ushort),
        ("dwFlags", ctypes.c_ulong),
        ("time", ctypes.c_ulong),
        ("dwExtraInfo", ctypes.POINTER(ctypes.c_ulong)),
    ]


class HARDWAREINPUT(ctypes.Structure):
    _fields_ = [("uMsg", ctypes.c_ulong), ("wParamL", ctypes.c_short), ("wParamH", ctypes.c_ushort)]


class INPUT_UNION(ctypes.Union):
    _fields_ = [("mi", MOUSEINPUT), ("ki", KEYBDINPUT), ("hi", HARDWAREINPUT)]


class INPUT(ctypes.Structure):
    _fields_ = [("type", ctypes.c_ulong), ("union", INPUT_UNION)]


PERMISSION_ORDER = {"safe": 0, "workspace": 1, "full_control": 2}
IDE_CANDIDATES = {
    "vscode": {
        "name": "VS Code",
        "process_names": ["Code.exe"],
        "paths": [
            r"C:\Users\Acer\AppData\Local\Programs\Microsoft VS Code\Code.exe",
            r"C:\Program Files\Microsoft VS Code\Code.exe",
        ],
    },
    "windsurf": {
        "name": "Windsurf",
        "process_names": ["Windsurf.exe"],
        "paths": [
            r"C:\Users\Acer\AppData\Local\Programs\Windsurf\Windsurf.exe",
            r"C:\Program Files\Windsurf\Windsurf.exe",
        ],
    },
    "cursor": {
        "name": "Cursor",
        "process_names": ["Cursor.exe"],
        "paths": [
            r"C:\Users\Acer\AppData\Local\Programs\cursor\Cursor.exe",
            r"C:\Program Files\Cursor\Cursor.exe",
        ],
    },
}
VIRTUAL_KEYS = {
    "ctrl": 0x11,
    "control": 0x11,
    "shift": 0x10,
    "alt": 0x12,
    "win": 0x5B,
    "enter": 0x0D,
    "tab": 0x09,
    "esc": 0x1B,
    "escape": 0x1B,
    "space": 0x20,
    "up": 0x26,
    "down": 0x28,
    "left": 0x25,
    "right": 0x27,
    "delete": 0x2E,
    "backspace": 0x08,
}


def _utc_timestamp() -> float:
    return time.time()


def _send_inputs(inputs: list[INPUT]) -> None:
    array_type = INPUT * len(inputs)
    user32.SendInput(len(inputs), array_type(*inputs), ctypes.sizeof(INPUT))


def _key_input(vk: int, key_up: bool = False) -> INPUT:
    flags = KEYEVENTF_KEYUP if key_up else 0
    return INPUT(type=INPUT_KEYBOARD, union=INPUT_UNION(ki=KEYBDINPUT(wVk=vk, wScan=0, dwFlags=flags, time=0, dwExtraInfo=None)))


def _unicode_key_input(char: str, key_up: bool = False) -> INPUT:
    flags = KEYEVENTF_UNICODE | (KEYEVENTF_KEYUP if key_up else 0)
    return INPUT(
        type=INPUT_KEYBOARD,
        union=INPUT_UNION(ki=KEYBDINPUT(wVk=0, wScan=ord(char), dwFlags=flags, time=0, dwExtraInfo=None)),
    )


def _move_cursor(x: int, y: int) -> None:
    width = user32.GetSystemMetrics(SM_CXSCREEN) - 1
    height = user32.GetSystemMetrics(SM_CYSCREEN) - 1
    absolute_x = int(x * 65535 / max(width, 1))
    absolute_y = int(y * 65535 / max(height, 1))
    inp = INPUT(
        type=INPUT_MOUSE,
        union=INPUT_UNION(
            mi=MOUSEINPUT(
                dx=absolute_x,
                dy=absolute_y,
                mouseData=0,
                dwFlags=MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE,
                time=0,
                dwExtraInfo=None,
            )
        ),
    )
    _send_inputs([inp])


def _mouse_click(button: str, clicks: int) -> None:
    button = button.lower()
    if button == "right":
        down, up = MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP
    elif button == "middle":
        down, up = MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP
    else:
        down, up = MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP

    for _ in range(max(clicks, 1)):
        _send_inputs(
            [
                INPUT(type=INPUT_MOUSE, union=INPUT_UNION(mi=MOUSEINPUT(0, 0, 0, down, 0, None))),
                INPUT(type=INPUT_MOUSE, union=INPUT_UNION(mi=MOUSEINPUT(0, 0, 0, up, 0, None))),
            ]
        )
        time.sleep(0.05)


def _foreground_window_title() -> str:
    hwnd = user32.GetForegroundWindow()
    if not hwnd:
        return ""
    length = user32.GetWindowTextLengthW(hwnd)
    if length == 0:
        return ""
    buffer = ctypes.create_unicode_buffer(length + 1)
    user32.GetWindowTextW(hwnd, buffer, length + 1)
    return buffer.value


def _is_user_admin() -> bool:
    try:
        return bool(shell32.IsUserAnAdmin())
    except Exception:
        return False


@dataclass
class ComputerControlSession:
    session_id: str
    permission_mode: str
    workspace_path: str
    started_at: float
    active: bool = True
    total_actions: int = 0
    last_error: str | None = None


@dataclass
class ComputerControlManager:
    workspace_root: Path
    session: ComputerControlSession | None = None
    action_history: list[dict[str, Any]] = field(default_factory=list)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    def _require_session(self, minimum_mode: str = "safe") -> ComputerControlSession:
        if not self.session or not self.session.active:
            raise HTTPException(status_code=400, detail="No active computer-control session.")
        current = PERMISSION_ORDER.get(self.session.permission_mode, 0)
        required = PERMISSION_ORDER.get(minimum_mode, 0)
        if current < required:
            raise HTTPException(status_code=403, detail=f"This action requires {minimum_mode} permission mode.")
        return self.session

    def _record_action(self, action_type: str, parameters: dict[str, Any], result: Any = None, error: str | None = None) -> dict[str, Any]:
        record = {
            "action_type": action_type,
            "parameters": parameters,
            "timestamp": _utc_timestamp(),
            "result": result,
            "error": error,
        }
        self.action_history.insert(0, record)
        if self.session and self.session.active:
            self.session.total_actions += 1
            self.session.last_error = error
        self.action_history = self.action_history[:200]
        return record

    async def start_session(self, permission_mode: str, workspace_path: str | None) -> dict[str, Any]:
        async with self.lock:
            resolved = Path(workspace_path).resolve() if workspace_path else self.workspace_root.resolve()
            resolved.mkdir(parents=True, exist_ok=True)
            self.session = ComputerControlSession(
                session_id=f"session_{uuid.uuid4().hex[:10]}",
                permission_mode=permission_mode,
                workspace_path=str(resolved),
                started_at=_utc_timestamp(),
            )
            self.action_history.clear()
            self._record_action(
                "session_start",
                {"permission_mode": permission_mode, "workspace_path": str(resolved)},
                result={"admin_available": _is_user_admin()},
            )
        return await self.session_status()

    async def end_session(self) -> dict[str, Any]:
        async with self.lock:
            if self.session:
                self._record_action("session_end", {"session_id": self.session.session_id}, result={"ended": True})
                self.session.active = False
            return {"success": True}

    async def session_status(self) -> dict[str, Any]:
        async with self.lock:
            session = self.session
            if not session or not session.active:
                return {
                    "active": False,
                    "admin_available": _is_user_admin(),
                    "active_window": _foreground_window_title(),
                }
            return {
                "active": True,
                "session_id": session.session_id,
                "permission_mode": session.permission_mode,
                "duration": int(_utc_timestamp() - session.started_at),
                "total_actions": session.total_actions,
                "active_window": _foreground_window_title(),
                "workspace_path": session.workspace_path,
                "admin_available": _is_user_admin(),
                "last_error": session.last_error,
            }

    async def history(self, limit: int) -> list[dict[str, Any]]:
        async with self.lock:
            return self.action_history[:limit]

    async def ide_status(self) -> dict[str, Any]:
        statuses: dict[str, Any] = {}
        for ide_key, meta in IDE_CANDIDATES.items():
            running = any(proc.info["name"] in meta["process_names"] for proc in psutil.process_iter(["name"]))
            install_path = next((path for path in meta["paths"] if Path(path).exists()), None)
            statuses[ide_key] = {
                "name": meta["name"],
                "available": bool(install_path),
                "running": running,
                "project_path": self.session.workspace_path if self.session and self.session.active else None,
            }
        return statuses

    async def launch_ide(self, ide_name: str) -> dict[str, Any]:
        session = self._require_session("workspace")
        meta = IDE_CANDIDATES.get(ide_name.lower())
        if not meta:
            raise HTTPException(status_code=404, detail="IDE is not supported.")
        install_path = next((path for path in meta["paths"] if Path(path).exists()), None)
        if not install_path:
            raise HTTPException(status_code=404, detail=f"{meta['name']} is not installed.")
        process = subprocess.Popen([install_path, session.workspace_path], cwd=session.workspace_path)
        result = {"launched": True, "pid": process.pid, "path": install_path}
        async with self.lock:
            self._record_action("ide_launch", {"ide": ide_name, "workspace_path": session.workspace_path}, result=result)
        return result

    async def screenshot(self) -> dict[str, Any]:
        session = self._require_session("safe")
        target_dir = Path(session.workspace_path) / "computer_control"
        target_dir.mkdir(parents=True, exist_ok=True)
        shot_path = target_dir / f"screenshot-{uuid.uuid4().hex[:8]}.png"

        def _capture() -> None:
            image = ImageGrab.grab(all_screens=True)
            image.save(shot_path)

        await asyncio.to_thread(_capture)
        result = {"screenshot_taken": True, "path": str(shot_path)}
        async with self.lock:
            self._record_action("screenshot", {"save": True}, result=result)
        return result

    async def run_command(self, command: str, timeout: int = 30, admin: bool = False) -> dict[str, Any]:
        session = self._require_session("full_control" if admin else "workspace")
        if admin:
            result = await asyncio.to_thread(self._run_elevated_powershell, command, timeout, Path(session.workspace_path))
        else:
            result = await asyncio.to_thread(self._run_powershell, command, timeout, Path(session.workspace_path))
        async with self.lock:
            self._record_action(
                "terminal_command",
                {"command": command, "timeout": timeout, "admin": admin},
                result=result if result.get("success") else None,
                error=result.get("stderr") if not result.get("success") else None,
            )
        return result

    def _run_powershell(self, command: str, timeout: int, cwd: Path) -> dict[str, Any]:
        try:
            completed = subprocess.run(
                ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=timeout,
            )
            return {
                "success": completed.returncode == 0,
                "return_code": completed.returncode,
                "stdout": completed.stdout,
                "stderr": completed.stderr,
                "admin": False,
            }
        except subprocess.TimeoutExpired as exc:
            return {"success": False, "return_code": -1, "stdout": exc.stdout or "", "stderr": "Command timed out.", "admin": False}

    def _run_elevated_powershell(self, command: str, timeout: int, cwd: Path) -> dict[str, Any]:
        temp_dir = Path(tempfile.mkdtemp(prefix="agent-windsurf-admin-"))
        script_path = temp_dir / "run_admin.ps1"
        result_path = temp_dir / "result.json"
        escaped_command = command.replace("'", "''")
        escaped_cwd = str(cwd).replace("'", "''")
        escaped_result = str(result_path).replace("'", "''")

        script_path.write_text(
            "\n".join(
                [
                    f"Set-Location '{escaped_cwd}'",
                    "$ErrorActionPreference = 'Continue'",
                    f"$output = powershell -NoProfile -ExecutionPolicy Bypass -Command '{escaped_command}' 2>&1 | Out-String",
                    "$code = $LASTEXITCODE",
                    f"@{{ success = ($code -eq 0); return_code = $code; stdout = $output; stderr = '' }} | ConvertTo-Json | Set-Content -Path '{escaped_result}' -Encoding UTF8",
                ]
            ),
            encoding="utf-8",
        )

        try:
            subprocess.Popen(
                [
                    "powershell",
                    "-NoProfile",
                    "-ExecutionPolicy",
                    "Bypass",
                    "-Command",
                    f"Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"{script_path}\"' -Wait",
                ],
                cwd=cwd,
            )
            deadline = time.time() + timeout
            while time.time() < deadline:
                if result_path.exists():
                    return json.loads(result_path.read_text(encoding="utf-8"))
                time.sleep(0.5)
            return {
                "success": False,
                "return_code": -1,
                "stdout": "",
                "stderr": "Admin command did not complete. The UAC consent dialog may have been denied or timed out.",
                "admin": True,
            }
        finally:
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
            except Exception:
                pass

    async def type_text(self, text: str) -> dict[str, Any]:
        self._require_session("full_control")

        def _type() -> None:
            inputs: list[INPUT] = []
            for char in text:
                inputs.append(_unicode_key_input(char, key_up=False))
                inputs.append(_unicode_key_input(char, key_up=True))
            if inputs:
                _send_inputs(inputs)

        await asyncio.to_thread(_type)
        result = {"typed": True, "characters": len(text)}
        async with self.lock:
            self._record_action("text_type", {"text": text}, result=result)
        return result

    async def press_hotkey(self, keys: list[str]) -> dict[str, Any]:
        self._require_session("full_control")
        keycodes = []
        for key in keys:
            normalized = key.lower()
            if normalized in VIRTUAL_KEYS:
                keycodes.append(VIRTUAL_KEYS[normalized])
            elif len(normalized) == 1:
                keycodes.append(ord(normalized.upper()))
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported key: {key}")

        def _press() -> None:
            down = [_key_input(code) for code in keycodes]
            up = [_key_input(code, key_up=True) for code in reversed(keycodes)]
            _send_inputs(down + up)

        await asyncio.to_thread(_press)
        result = {"pressed": True, "keys": keys}
        async with self.lock:
            self._record_action("hotkey", {"keys": keys}, result=result)
        return result

    async def click(self, x: int, y: int, button: str = "left", clicks: int = 1) -> dict[str, Any]:
        self._require_session("full_control")

        def _click() -> None:
            _move_cursor(x, y)
            time.sleep(0.05)
            _mouse_click(button, clicks)

        await asyncio.to_thread(_click)
        result = {"clicked": True, "x": x, "y": y, "button": button, "clicks": clicks}
        async with self.lock:
            self._record_action("click", {"x": x, "y": y, "button": button, "clicks": clicks}, result=result)
        return result

    async def active_window(self) -> dict[str, Any]:
        self._require_session("safe")
        return {"title": _foreground_window_title()}
