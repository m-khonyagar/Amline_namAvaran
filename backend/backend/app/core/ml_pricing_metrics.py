"""Prometheus counters for CompositePricingEngine ML HTTP path."""

from __future__ import annotations

from prometheus_client import Counter

ml_pricing_http_total = Counter(
    "amline_ml_pricing_http_total",
    "Calls to external ML pricing service",
    ["result"],
)
