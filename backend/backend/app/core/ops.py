"""P4 ops: security headers, Prometheus /metrics, OTP path rate limit (in-process)."""

from __future__ import annotations

import os
import time
from collections import defaultdict, deque
from typing import Awaitable, Callable, Deque

from fastapi import FastAPI, Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse

_http_requests_total = Counter(
    "amline_http_requests_total",
    "Total HTTP responses",
    ["method", "status"],
)


class _OtpRateLimiter(BaseHTTPMiddleware):
    def __init__(self, app, max_per_window: int, window_seconds: float) -> None:
        super().__init__(app)
        self._max = max_per_window
        self._window = window_seconds
        self._hits: dict[str, Deque[float]] = defaultdict(deque)

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        path = request.url.path.rstrip("/")
        if request.method == "POST" and path.endswith("/admin/otp/send"):
            ip = request.client.host if request.client else "unknown"
            now = time.monotonic()
            q = self._hits[ip]
            while q and q[0] < now - self._window:
                q.popleft()
            if len(q) >= self._max:
                return StarletteResponse(
                    content='{"error":{"code":"OTP_RATE_LIMITED","message":"Too many OTP requests"}}',
                    status_code=429,
                    media_type="application/json",
                )
            q.append(now)
        return await call_next(request)


class _PrometheusMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        response = await call_next(request)
        if request.url.path != "/metrics":
            _http_requests_total.labels(
                method=request.method, status=str(response.status_code)
            ).inc()
        return response


def register_ops(app: FastAPI) -> None:
    if os.getenv("AMLINE_SECURITY_HEADERS", "1").lower() not in ("0", "false", "no"):

        @app.middleware("http")
        async def _security_headers(request: Request, call_next):
            resp = await call_next(request)
            resp.headers.setdefault("X-Content-Type-Options", "nosniff")
            resp.headers.setdefault("X-Frame-Options", "DENY")
            resp.headers.setdefault(
                "Referrer-Policy", "strict-origin-when-cross-origin"
            )
            return resp

    if os.getenv("AMLINE_PROMETHEUS_MIDDLEWARE", "1").lower() not in (
        "0",
        "false",
        "no",
    ):
        app.add_middleware(_PrometheusMiddleware)

    if os.getenv("AMLINE_OTP_RATE_LIMIT_ENABLED", "1").lower() not in (
        "0",
        "false",
        "no",
    ):
        max_r = int(os.getenv("AMLINE_OTP_RATE_PER_MINUTE", "30"))
        app.add_middleware(_OtpRateLimiter, max_per_window=max_r, window_seconds=60.0)

    @app.get("/metrics", include_in_schema=False)
    async def prometheus_metrics() -> Response:
        if os.getenv("AMLINE_METRICS_ENABLED", "").lower() not in ("1", "true", "yes"):
            return StarletteResponse(status_code=404)
        data = generate_latest()
        return Response(content=data, media_type=str(CONTENT_TYPE_LATEST))
