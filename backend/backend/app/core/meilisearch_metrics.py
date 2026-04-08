"""Prometheus counters for Meilisearch client operations (optional)."""

from __future__ import annotations

from prometheus_client import Counter

meilisearch_operations_total = Counter(
    "amline_meilisearch_operations_total",
    "Meilisearch HTTP client operations from Amline API",
    ["operation", "result"],
)
