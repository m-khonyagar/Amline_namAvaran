"""ML pricing HTTP service — baseline model file + Prometheus metrics."""
from __future__ import annotations

import json
import os
import time
from pathlib import Path

from fastapi import FastAPI, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from pydantic import BaseModel, Field

MODEL_PATH = Path(os.getenv("AMLINE_PRICING_MODEL_PATH", "/app/models/baseline.json"))

app = FastAPI(title="Amline ML Pricing", version="0.2.0")

_infer_total = Counter(
    "amline_ml_pricing_infer_total",
    "Inference requests",
    ["outcome"],
)
_infer_latency = Histogram(
    "amline_ml_pricing_infer_seconds",
    "Inference latency",
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0),
)


def _load_model() -> dict:
    if not MODEL_PATH.is_file():
        return {"multiplier": 1.02, "basis": "default_stub"}
    try:
        return json.loads(MODEL_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"multiplier": 1.02, "basis": "corrupt_model_fallback"}


class PricingRequest(BaseModel):
    listing_id: str
    deal_type: str
    price_amount: str
    currency: str = "IRR"
    location_summary: str | None = None
    area_sqm: str | None = None
    room_count: int | None = None


class PricingResponse(BaseModel):
    suggested_price: str
    currency: str
    confidence: float = Field(ge=0, le=1)
    basis: str
    peer_sample_size: int = 0


@app.get("/health")
def health() -> dict:
    return {"ok": True, "model_path": str(MODEL_PATH), "model_exists": MODEL_PATH.is_file()}


@app.get("/metrics")
def metrics() -> Response:
    data = generate_latest()
    return Response(content=data, media_type=str(CONTENT_TYPE_LATEST))


@app.post("/v1/estimate", response_model=PricingResponse)
def estimate(body: PricingRequest) -> PricingResponse:
    t0 = time.perf_counter()
    try:
        base = float(body.price_amount)
    except ValueError:
        base = 0.0
    cfg = _load_model()
    mult = float(cfg.get("multiplier", 1.02))
    basis = str(cfg.get("basis", "trained_baseline"))
    adj = base * mult if base > 0 else 0.0
    _infer_total.labels(outcome="ok").inc()
    _infer_latency.observe(time.perf_counter() - t0)
    return PricingResponse(
        suggested_price=f"{adj:.2f}",
        currency=body.currency,
        confidence=min(0.95, 0.55 + min(base / 1e9, 0.35)),
        basis=basis,
        peer_sample_size=int(cfg.get("peer_sample_size", 0)),
    )
