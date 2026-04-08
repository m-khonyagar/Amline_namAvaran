import pytest
from fastapi import HTTPException

from app.api.id_params import uuid_from_param


def test_uuid_from_param_accepts_valid_uuid() -> None:
    u = uuid_from_param("550e8400-e29b-41d4-a716-446655440000", detail="x")
    assert str(u) == "550e8400-e29b-41d4-a716-446655440000"


def test_uuid_from_param_rejects_invalid_with_detail() -> None:
    with pytest.raises(HTTPException) as exc_info:
        uuid_from_param("not-a-uuid", detail="invalid_contract_id")
    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == "invalid_contract_id"
