"""Tiny in-process TTL cache (P2 search / public feed); replace with Redis in scale-out."""

from __future__ import annotations

import threading
import time
from typing import Any, Callable, Generic, Hashable, Optional, TypeVar

T = TypeVar("T")


class TtlCache(Generic[T]):
    def __init__(self, default_ttl_seconds: float = 30.0) -> None:
        self._ttl = default_ttl_seconds
        self._data: dict[Hashable, tuple[float, T]] = {}
        self._lock = threading.Lock()

    def get(self, key: Hashable) -> Optional[T]:
        now = time.monotonic()
        with self._lock:
            item = self._data.get(key)
            if not item:
                return None
            exp, val = item
            if exp < now:
                del self._data[key]
                return None
            return val

    def set(self, key: Hashable, value: T, ttl_seconds: Optional[float] = None) -> None:
        ttl = ttl_seconds if ttl_seconds is not None else self._ttl
        with self._lock:
            self._data[key] = (time.monotonic() + ttl, value)

    def get_or_set(
        self,
        key: Hashable,
        factory: Callable[[], T],
        ttl_seconds: Optional[float] = None,
    ) -> T:
        hit = self.get(key)
        if hit is not None:
            return hit
        val = factory()
        self.set(key, val, ttl_seconds=ttl_seconds)
        return val


search_cache: TtlCache[Any] = TtlCache(default_ttl_seconds=30.0)
public_feed_cache: TtlCache[Any] = TtlCache(default_ttl_seconds=60.0)
