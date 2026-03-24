"""Command execution with whitelist and logging hooks (Blueprint §6.2)."""

from __future__ import annotations

import logging
import shlex
import subprocess
from dataclasses import dataclass
from pathlib import Path

log = logging.getLogger(__name__)


@dataclass
class CommandResult:
    returncode: int
    stdout: str
    stderr: str


class CommandRunner:
    def __init__(self, *, whitelist: list[str], cwd: Path | None = None) -> None:
        self._whitelist = {w.lower() for w in whitelist}
        self._cwd = cwd or Path.cwd()

    def _first_token(self, command: str) -> str:
        try:
            parts = shlex.split(command, posix=False)
        except ValueError:
            parts = command.split()
        if not parts:
            return ""
        return parts[0].strip().lower()

    def run(self, command: str, *, timeout_sec: int = 120) -> CommandResult:
        exe = self._first_token(command)
        base = Path(exe).name.lower() if exe else ""
        if base not in self._whitelist:
            msg = f"Command not in whitelist: {base!r}"
            log.warning(msg)
            return CommandResult(126, "", msg)
        log.info("Running (cwd=%s): %s", self._cwd, command)
        proc = subprocess.run(
            command,
            shell=True,
            cwd=self._cwd,
            capture_output=True,
            text=True,
            timeout=timeout_sec,
            encoding="utf-8",
            errors="replace",
        )
        return CommandResult(proc.returncode, proc.stdout or "", proc.stderr or "")
