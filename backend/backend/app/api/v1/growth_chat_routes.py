"""P2 — conversations and messages (+ WebSocket)."""

from __future__ import annotations

import json
import os

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    Request,
    WebSocket,
    WebSocketDisconnect,
)
from sqlalchemy.orm import Session

from app.api.v1.chat_ws_manager import chat_manager
from app.core.errors import AmlineError
from app.core.rbac_deps import require_permission
from app.db.session import get_db
from app.models.notification_event import NotificationChannel
from app.repositories.v1.p2_repositories import (
    ConversationRepository,
    MessageRepository,
)
from app.schemas.v1.growth_v1 import (
    ConversationCreate,
    ConversationListResponse,
    ConversationRead,
    MessageCreate,
    MessageListResponse,
    MessageRead,
)
from app.services.v1.notification_dispatch import NotificationDispatchService

router = APIRouter(prefix="/chat", tags=["chat"])


def _user_id(request: Request) -> str:
    return request.headers.get("X-User-Id") or os.getenv(
        "AMLINE_DEFAULT_USER_ID", "mock-001"
    )


async def _broadcast_new_message(conversation_id: str, payload: dict) -> None:
    await chat_manager.broadcast_json(conversation_id, payload)


@router.post("/conversations", response_model=ConversationRead, status_code=201)
def create_conversation(
    request: Request,
    body: ConversationCreate,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("chat:write")),
) -> ConversationRead:
    uid = _user_id(request)
    parts = list({uid, *body.participant_user_ids})
    repo = ConversationRepository(db)
    row = repo.create(
        created_by=uid,
        title=body.title,
        listing_id=body.listing_id,
        requirement_id=body.requirement_id,
        participants=parts,
    )
    return ConversationRead.from_orm_conv(row)


@router.get("/conversations", response_model=ConversationListResponse)
def list_conversations(
    request: Request,
    skip: int = 0,
    limit: int = 30,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("chat:read")),
) -> ConversationListResponse:
    if limit < 1 or limit > 100:
        limit = 30
    repo = ConversationRepository(db)
    rows, total = repo.list_for_user(_user_id(request), skip=skip, limit=limit)
    return ConversationListResponse(
        items=[ConversationRead.from_orm_conv(r) for r in rows],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/conversations/{conversation_id}/messages", response_model=MessageListResponse
)
def list_messages(
    conversation_id: str,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("chat:read")),
) -> MessageListResponse:
    crepo = ConversationRepository(db)
    conv = crepo.get(conversation_id)
    if not conv:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "مکالمه یافت نشد.",
            status_code=404,
            details={"entity": "conversation", "conversation_id": conversation_id},
        )
    mrepo = MessageRepository(db)
    rows, total = mrepo.list_messages(conversation_id, skip=skip, limit=min(limit, 200))
    return MessageListResponse(
        items=[MessageRead.model_validate(m) for m in rows],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageRead,
    status_code=201,
)
def post_message(
    request: Request,
    conversation_id: str,
    body: MessageCreate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("chat:write")),
) -> MessageRead:
    crepo = ConversationRepository(db)
    conv = crepo.get(conversation_id)
    if not conv:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "مکالمه یافت نشد.",
            status_code=404,
            details={"entity": "conversation", "conversation_id": conversation_id},
        )
    sender = _user_id(request)
    mrepo = MessageRepository(db)
    msg = mrepo.add(conversation_id=conversation_id, sender_id=sender, body=body.body)
    payload = {
        "type": "chat_message",
        "conversation_id": conversation_id,
        "message": MessageRead.model_validate(msg).model_dump(mode="json"),
    }
    background.add_task(_broadcast_new_message, conversation_id, payload)

    parts = json.loads(conv.participants_json or "[]")
    for uid in parts:
        if uid != sender:
            NotificationDispatchService(db).dispatch(
                channel=NotificationChannel.PUSH,
                recipient=uid,
                template_key="CHAT_NEW_MESSAGE",
                payload={
                    "conversation_id": conversation_id,
                    "preview": body.body[:120],
                },
            )
    return MessageRead.model_validate(msg)


@router.websocket("/ws/{conversation_id}")
async def chat_websocket(websocket: WebSocket, conversation_id: str) -> None:
    await chat_manager.connect(conversation_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await chat_manager.disconnect(conversation_id, websocket)
