"""آداپتور رجیستری / خودنویس رسمی — mock اولیه."""

from __future__ import annotations

from typing import Any


class RegistryAdapter:
    def submit_contract(
        self, contract_id: str, payload: dict[str, Any]
    ) -> dict[str, Any]:
        return {
            "contract_id": contract_id,
            "registry_job_id": f"mock-{contract_id}",
            "status": "SUBMITTED",
        }

    def check_status(self, registry_job_id: str) -> dict[str, Any]:
        return {"job_id": registry_job_id, "status": "PENDING"}

    def get_tracking_code(self, registry_job_id: str) -> dict[str, Any]:
        return {"job_id": registry_job_id, "tracking_code": None}


_reg: RegistryAdapter | None = None


def get_registry_adapter() -> RegistryAdapter:
    global _reg
    if _reg is None:
        _reg = RegistryAdapter()
    return _reg
