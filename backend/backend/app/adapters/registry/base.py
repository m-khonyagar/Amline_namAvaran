from __future__ import annotations

from typing import Any, Dict, Protocol, runtime_checkable


@runtime_checkable
class RegistryAdapter(Protocol):
    def submit_contract(self, contract_id: str, payload: Dict[str, Any]) -> str:
        """Return tracking / reference code from registry."""
        ...
