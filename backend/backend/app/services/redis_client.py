from __future__ import annotations

import redis

from app.core.config import settings


class _FakeRedis:
    """In-memory Redis stub for dev when no Redis server is available."""
    def __init__(self):
        self._store: dict = {}

    def setex(self, key, ttl, value):
        self._store[key] = value

    def get(self, key):
        return self._store.get(key)

    def delete(self, key):
        self._store.pop(key, None)

    def exists(self, key):
        return 1 if key in self._store else 0


_fake = _FakeRedis()
_real: redis.Redis | None = None


def get_redis() -> redis.Redis | _FakeRedis:
    global _real
    if settings.env == "dev":
        # Try real Redis first, fall back to in-memory stub
        if _real is None:
            try:
                r = redis.Redis.from_url(settings.redis_url, decode_responses=True, socket_connect_timeout=1)
                r.ping()
                _real = r
            except Exception:
                return _fake
        try:
            _real.ping()
            return _real
        except Exception:
            return _fake
    return redis.Redis.from_url(settings.redis_url, decode_responses=True)
