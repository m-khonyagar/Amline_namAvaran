"""Structured HTTP request logging (P1 observability)."""

from __future__ import annotations

import json
import logging
import time
from typing import Awaitable, Callable

from fastapi import FastAPI, Request
from starlette.responses import Response

logger = logging.getLogger("amline.http")


def register_request_logging(app: FastAPI) -> None:
    @app.middleware("http")
    async def _log(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        rid = getattr(request.state, "request_id", None) or ""
        t0 = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (time.perf_counter() - t0) * 1000
            logger.exception(
                json.dumps(
                    {
                        "event": "http_request_error",
                        "method": request.method,
                        "path": request.url.path,
                        "request_id": rid,
                        "duration_ms": round(duration_ms, 2),
                    },
                    ensure_ascii=False,
                )
            )
            raise
        duration_ms = (time.perf_counter() - t0) * 1000
        logger.info(
            json.dumps(
                {
                    "event": "http_request",
                    "method": request.method,
                    "path": request.url.path,
                    "status": response.status_code,
                    "request_id": rid,
                    "duration_ms": round(duration_ms, 2),
                },
                ensure_ascii=False,
            )
        )
        return response
