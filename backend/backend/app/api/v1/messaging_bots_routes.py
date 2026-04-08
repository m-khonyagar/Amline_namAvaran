"""وب‌هوک بازوهای تلگرام، بله و ایتا — بدون نیاز به JWT."""

from __future__ import annotations

import os

from fastapi import APIRouter, Header, HTTPException, Request

from app.services.v1 import messaging_bots_service as mbs

router = APIRouter(tags=["messaging-bots"])


def _verify_telegram_secret(x_token: str | None) -> None:
    expected = (os.getenv("AMLINE_TELEGRAM_WEBHOOK_SECRET") or "").strip()
    if not expected:
        return
    if (x_token or "").strip() != expected:
        raise HTTPException(status_code=403, detail="invalid webhook secret")


@router.post("/webhooks/telegram")
async def webhook_telegram(
    request: Request,
    x_telegram_bot_api_secret_token: str | None = Header(default=None, alias="X-Telegram-Bot-Api-Secret-Token"),
) -> dict:
    _verify_telegram_secret(x_telegram_bot_api_secret_token)
    body = await request.json()
    if isinstance(body, dict):
        await mbs.handle_telegram_update(body)
    return {"ok": True}


@router.post("/webhooks/bale")
async def webhook_bale(request: Request) -> dict:
    secret = (os.getenv("AMLINE_BALE_WEBHOOK_SECRET") or "").strip()
    if secret:
        got = (request.headers.get("X-Bale-Webhook-Secret") or "").strip()
        if got != secret:
            raise HTTPException(status_code=403, detail="invalid webhook secret")
    body = await request.json()
    if isinstance(body, dict):
        await mbs.handle_bale_update(body)
    return {"ok": True}


@router.post("/webhooks/eitaa")
async def webhook_eitaa(request: Request) -> dict:
    secret = (os.getenv("AMLINE_EITAA_WEBHOOK_SECRET") or "").strip()
    if secret:
        got = (request.headers.get("X-Eitaa-Webhook-Secret") or request.headers.get("Authorization") or "").strip()
        if got.replace("Bearer ", "") != secret:
            raise HTTPException(status_code=403, detail="invalid webhook secret")
    body = await request.json()
    if isinstance(body, dict):
        await mbs.handle_eitaa_update(body)
    return {"ok": True}
