"""SQLite persistence for tasks and messages (Blueprint §5.3, §9.1)."""

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SCHEMA = """
CREATE TABLE IF NOT EXISTS task_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    agent TEXT,
    action TEXT,
    status TEXT,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_task_events_task_id ON task_events(task_id);
"""


class TaskStore:
    def __init__(self, db_path: Path) -> None:
        self._path = db_path
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self._path, check_same_thread=False)
        self._conn.executescript(SCHEMA)
        self._conn.commit()

    def close(self) -> None:
        self._conn.close()

    def log_event(
        self,
        *,
        task_id: str,
        agent: str | None,
        action: str | None,
        status: str | None,
        payload: dict[str, Any],
    ) -> None:
        now = datetime.now(timezone.utc).isoformat()
        self._conn.execute(
            "INSERT INTO task_events (task_id, agent, action, status, payload_json, created_at) VALUES (?,?,?,?,?,?)",
            (
                task_id,
                agent,
                action,
                status,
                json.dumps(payload, ensure_ascii=False),
                now,
            ),
        )
        self._conn.commit()

    @staticmethod
    def new_task_id() -> str:
        return str(uuid.uuid4())

    @staticmethod
    def read_trace(db_path: Path, task_id: str) -> list[dict[str, Any]]:
        """Read-only trace for API (opens separate connection)."""
        if not db_path.is_file():
            return []
        conn = sqlite3.connect(db_path, check_same_thread=False)
        try:
            cur = conn.execute(
                "SELECT id, agent, action, status, payload_json, created_at "
                "FROM task_events WHERE task_id = ? ORDER BY id ASC",
                (task_id,),
            )
            rows = cur.fetchall()
        finally:
            conn.close()
        out: list[dict[str, Any]] = []
        for row in rows:
            out.append(
                {
                    "id": row[0],
                    "agent": row[1],
                    "action": row[2],
                    "status": row[3],
                    "payload": json.loads(row[4]),
                    "created_at": row[5],
                }
            )
        return out
