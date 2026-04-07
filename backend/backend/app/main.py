from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.services.s3 import ensure_bucket

app = FastAPI(title="Amline API", version="0.2.0")

# Module-level counter for file IDs (no DB migration needed)
_file_id_counter: int = 0

_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "application/pdf"}
_MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# CORS: dev origins + any extra origins from AMLINE_CORS_ORIGINS env var
_DEFAULT_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3004",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:3004",
]
_extra = os.getenv("AMLINE_CORS_ORIGINS", "")
_extra_origins = [o.strip() for o in _extra.split(",") if o.strip()]
_allowed_origins = list(dict.fromkeys(_DEFAULT_ORIGINS + _extra_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
def health():
    return {"status": "ok", "env": settings.env}


@app.get("/api/ping")
def ping():
    return {"status": "ok"}


@app.post("/files/upload", status_code=201)
async def files_upload(file: UploadFile):
    global _file_id_counter
    content_type = file.content_type or ""
    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="unsupported_media_type")
    data = await file.read()
    if len(data) > _MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="file_too_large")
    _file_id_counter += 1
    return {"id": _file_id_counter, "url": None}


@app.get("/provinces/cities")
def provinces_cities():
    return []


@app.get("/provinces")
def provinces():
    return []


@app.on_event("startup")
def _startup():
    ensure_bucket()

