"""Apply Alembic migrations then start uvicorn (Playwright / local E2E)."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    subprocess.check_call(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=_ROOT,
    )
    raise SystemExit(
        subprocess.call(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "app.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                "8080",
            ],
            cwd=_ROOT,
        )
    )


if __name__ == "__main__":
    main()
