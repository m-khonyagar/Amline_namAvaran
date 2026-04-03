from __future__ import annotations

import os
from typing import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class AcceptLanguageMiddleware(BaseHTTPMiddleware):
    """Parses Accept-Language → request.state.locale (fa|en|ar) for i18n-ready APIs."""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        al = request.headers.get("accept-language", "")
        loc = "fa"
        if al:
            part = al.split(",")[0].strip().split(";")[0].strip().lower()
            if part.startswith("en"):
                loc = "en"
            elif part.startswith("ar"):
                loc = "ar"
        request.state.locale = loc
        response = await call_next(request)
        response.headers.setdefault("Content-Language", loc)
        return response


def register_i18n(app) -> None:
    if os.getenv("AMLINE_I18N_MIDDLEWARE", "1").lower() not in ("0", "false", "no"):
        app.add_middleware(AcceptLanguageMiddleware)
