"""Low-tier filesystem access (Blueprint §6.1)."""

from __future__ import annotations

from pathlib import Path


def read_text_file(path: Path, *, max_bytes: int = 512_000) -> str:
    data = path.read_bytes()
    if len(data) > max_bytes:
        data = data[:max_bytes]
    return data.decode("utf-8", errors="replace")
