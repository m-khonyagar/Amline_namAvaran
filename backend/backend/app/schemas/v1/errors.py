"""Unified API error envelope — aligned with docs/openapi/amline-v1-errors.openapi.yaml §27."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class FieldErrorItem(BaseModel):
    field: str
    code: str
    message: str


class ErrorInfo(BaseModel):
    code: str = Field(..., description="AmlineErrorCode per Master Spec / OpenAPI §27")
    message: str
    details: Optional[Dict[str, Any]] = None
    request_id: Optional[str] = Field(
        default=None,
        description="Duplicate of top-level request_id for OpenAPI-shaped clients",
    )


class ErrorResponse(BaseModel):
    error: ErrorInfo
    request_id: Optional[str] = None
    field_errors: Optional[List[FieldErrorItem]] = None
