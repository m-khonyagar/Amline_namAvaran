from __future__ import annotations

import uuid


def parse_uuid(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except Exception as e:
        raise ValueError("invalid_uuid") from e
