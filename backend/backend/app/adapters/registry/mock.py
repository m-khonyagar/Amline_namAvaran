from __future__ import annotations

import uuid
from typing import Any, Dict


class MockRegistryAdapter:
    def submit_contract(self, contract_id: str, payload: Dict[str, Any]) -> str:
        return f"REG-MOCK-{uuid.uuid4().hex[:12].upper()}"
