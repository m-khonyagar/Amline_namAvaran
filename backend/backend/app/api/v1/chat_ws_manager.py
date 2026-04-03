"""In-process WebSocket fan-out for chat (P2); replace with Redis pub/sub at scale."""

from __future__ import annotations

import asyncio
from typing import Dict, List

from fastapi import WebSocket


class ChatConnectionManager:
    def __init__(self) -> None:
        self._rooms: Dict[str, List[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, conversation_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._rooms.setdefault(conversation_id, []).append(websocket)

    async def disconnect(self, conversation_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            room = self._rooms.get(conversation_id)
            if not room:
                return
            self._rooms[conversation_id] = [w for w in room if w is not websocket]
            if not self._rooms[conversation_id]:
                del self._rooms[conversation_id]

    async def broadcast_json(self, conversation_id: str, payload: dict) -> None:
        async with self._lock:
            conns = list(self._rooms.get(conversation_id, []))
        dead: List[WebSocket] = []
        for ws in conns:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(conversation_id, ws)


chat_manager = ChatConnectionManager()
