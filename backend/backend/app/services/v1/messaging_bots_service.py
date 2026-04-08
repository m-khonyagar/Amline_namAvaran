"""ارسال پیام به تلگرام، بله و ایتا — منطق مشترک وب‌هوک."""

from __future__ import annotations

import logging
import os
from typing import Any, Awaitable, Callable, Optional

import httpx

log = logging.getLogger(__name__)

WELCOME_FA = (
    "به بازوی اَملاین خوش آمدید.\n\n"
    "قرارداد دیجیتال، امضا و پنل مدیریت:\n"
    "https://app.amline.ir\n\n"
    "دستور /help برای راهنما."
)
HELP_FA = (
    "دستورات:\n"
    "/start — شروع\n"
    "/help — راهنما\n"
    "/app — لینک پنل\n\n"
    "وب‌سایت: https://amline.ir"
)


async def _post_json(url: str, payload: dict[str, Any]) -> None:
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(url, json=payload)
            if r.status_code >= 400:
                log.warning("messaging bot send failed %s %s", r.status_code, r.text[:200])
    except Exception as e:
        log.warning("messaging bot send error: %s", e)


async def send_telegram_message(chat_id: int, text: str) -> None:
    token = (os.getenv("AMLINE_TELEGRAM_BOT_TOKEN") or "").strip()
    if not token:
        log.debug("AMLINE_TELEGRAM_BOT_TOKEN not set; skip send")
        return
    await _post_json(
        f"https://api.telegram.org/bot{token}/sendMessage",
        {"chat_id": chat_id, "text": text},
    )


async def send_bale_message(chat_id: int, text: str) -> None:
    token = (os.getenv("AMLINE_BALE_BOT_TOKEN") or "").strip()
    if not token:
        log.debug("AMLINE_BALE_BOT_TOKEN not set; skip send")
        return
    await _post_json(
        f"https://tapi.bale.ai/bot{token}/sendMessage",
        {"chat_id": chat_id, "text": text},
    )


async def send_eitaa_message(chat_id: str, text: str) -> None:
    app_token = (os.getenv("AMLINE_EITAA_APP_TOKEN") or "").strip()
    base = (os.getenv("AMLINE_EITAA_API_BASE") or "https://eitaayar.ir/api").strip().rstrip("/")
    if not app_token:
        log.debug("AMLINE_EITAA_APP_TOKEN not set; skip send")
        return
    url = f"{base}/{app_token}/sendMessage"
    await _post_json(url, {"chat_id": chat_id, "text": text})


def extract_telegram_like_update(body: dict[str, Any]) -> tuple[Optional[int], Optional[str]]:
    msg = body.get("message") or body.get("edited_message")
    if not isinstance(msg, dict):
        return None, None
    chat = msg.get("chat")
    if not isinstance(chat, dict):
        return None, None
    cid = chat.get("id")
    if cid is None:
        return None, None
    try:
        chat_id = int(cid)
    except (TypeError, ValueError):
        return None, None
    text = msg.get("text")
    st = str(text) if text is not None else None
    return chat_id, st


def extract_eitaa_flat(body: dict[str, Any]) -> tuple[Optional[str], Optional[str]]:
    if "chat_id" in body and "text" in body:
        return str(body["chat_id"]), str(body["text"])
    return None, None


async def dispatch_command_text(
    text: Optional[str],
    reply: Callable[[str], Awaitable[None]],
) -> None:
    raw = (text or "").strip()
    cmd = raw.split()[0].lower() if raw else ""
    if cmd.startswith("/start"):
        await reply(WELCOME_FA)
    elif cmd.startswith("/help"):
        await reply(HELP_FA)
    elif cmd.startswith("/app"):
        await reply("پنل اَملاین:\nhttps://app.amline.ir")
    elif raw:
        await reply("برای منو /help را بفرستید.\nپنل: https://app.amline.ir")
    else:
        await reply(WELCOME_FA)


async def handle_telegram_update(body: dict[str, Any]) -> None:
    chat_id, text = extract_telegram_like_update(body)
    if chat_id is None:
        return

    async def reply(t: str) -> None:
        await send_telegram_message(chat_id, t)

    await dispatch_command_text(text, reply)


async def handle_bale_update(body: dict[str, Any]) -> None:
    chat_id, text = extract_telegram_like_update(body)
    if chat_id is None:
        return

    async def reply(t: str) -> None:
        await send_bale_message(chat_id, t)

    await dispatch_command_text(text, reply)


async def handle_eitaa_update(body: dict[str, Any]) -> None:
    cid, txt = extract_eitaa_flat(body)
    if cid:
        async def reply(t: str) -> None:
            await send_eitaa_message(cid, t)

        await dispatch_command_text(txt, reply)
        return

    chat_id, text = extract_telegram_like_update(body)
    if chat_id is None:
        return

    async def reply(t: str) -> None:
        await send_eitaa_message(str(chat_id), t)

    await dispatch_command_text(text, reply)
