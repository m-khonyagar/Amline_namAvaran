"""Build Thumbor image URLs (unsafe dev or signed prod)."""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
from urllib.parse import quote

# پیش‌تنظیم اندازه برای فرانت و ایمیل (عرض × ارتفاع)
THUMBOR_PRESETS: dict[str, tuple[int, int]] = {
    "thumb": (120, 120),
    "card": (400, 300),
    "cover": (800, 450),
    "hero": (1200, 630),
    "og": (1200, 630),
}


def thumbor_preset_url(path: str, preset: str, smart: bool = True) -> str | None:
    dims = THUMBOR_PRESETS.get(preset)
    if not dims:
        return None
    return thumbor_image_url(path, width=dims[0], height=dims[1], smart=smart)


def thumbor_image_url(
    path: str, width: int = 400, height: int = 300, smart: bool = True
) -> str | None:
    """
    `path` — path segment after Thumbor host (e.g. s3 key or static path).
    Returns None if Thumbor base URL not configured.
    """
    base = (os.getenv("THUMBOR_BASE_URL") or "").rstrip("/")
    if not base:
        return None
    secret = (os.getenv("THUMBOR_SECURITY_KEY") or "").strip()
    size = f"{width}x{height}"
    smart_part = "smart/" if smart else ""
    http_src = (os.getenv("AMLINE_THUMBOR_HTTP_SOURCE_BASE") or "").rstrip("/")
    if http_src:
        img_path = f"{http_src}/{path.lstrip('/')}"
    else:
        img_path = path.lstrip("/")
    if not secret:
        return f"{base}/unsafe/{size}/{smart_part}{img_path}"
    sig_src = f"{size}/{smart_part}{img_path}"
    sig = (
        base64.urlsafe_b64encode(
            hmac.new(secret.encode(), sig_src.encode(), hashlib.sha1).digest()
        )
        .decode()
        .rstrip("=")
    )
    return f"{base}/{sig}/{size}/{smart_part}{quote(img_path, safe='/')}"
