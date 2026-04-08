"""
PRContractStepManager — ported from clone's prcontract_step_manager.py.

Determines the current state of a property rent contract based on
completed steps and contract status. This is the core business logic
that drives the wizard flow.
"""
from __future__ import annotations

from app.domain.contract_enums import (
    ContractStatus,
    PartyType,
    PRContractState,
    PRContractStep,
)


class PRContractStepManager:
    """
    Determines PRContractState from a set of completed steps + contract status.

    Usage:
        manager = PRContractStepManager()
        state = manager.get_contract_state(
            completed_steps={"LANDLORD_INFORMATION", "DEPOSIT", ...},
            status=ContractStatus.DRAFT,
            owner_party_type=PartyType.LANDLORD,
        )
    """

    def get_contract_state(
        self,
        completed_steps: list | set,
        status: ContractStatus,
        owner_party_type: PartyType,
    ) -> PRContractState:
        # Status-based overrides first
        if status == ContractStatus.ADMIN_REJECTED:
            return PRContractState.ADMIN_REJECTED

        if status == ContractStatus.PARTY_REJECTED:
            return PRContractState.LANDLORD_REJECTED

        if status == ContractStatus.EDIT_REQUESTED:
            if owner_party_type == PartyType.TENANT:
                return PRContractState.LANDLORD_EDIT_REQUEST
            return PRContractState.TENANT_EDIT_REQUEST

        if status == ContractStatus.PDF_GENERATED:
            return PRContractState.PDF_GENERATED

        # Normalize steps to enum set
        steps_types: set[PRContractStep] = set()
        for step in completed_steps:
            try:
                steps_types.add(PRContractStep(step))
            except ValueError:
                pass  # ignore unknown steps

        # Tracking code flow
        if self.tracking_code_delivered_steps.issubset(steps_types):
            return PRContractState.TRACKING_CODE_DELIVERED
        if self.tracking_code_requested_steps.issubset(steps_types):
            return PRContractState.PENDING_TRACKING_CODE_DELIVERY
        if self.admin_approved_steps.issubset(steps_types):
            return PRContractState.PENDING_TRACKING_CODE_REQUEST

        # Admin approval
        if self.required_steps_for_admin_approve.issubset(steps_types):
            return PRContractState.PENDING_ADMIN_APPROVAL

        # Commission
        if self.tenant_payed_commission_steps.issubset(steps_types):
            return PRContractState.PENDING_LANDLORD_COMMISSION
        if self.landlord_payed_commission_steps.issubset(steps_types):
            return PRContractState.PENDING_TENANT_COMMISSION
        if (
            self.tenant_signed_steps__tenant_owner.issubset(steps_types)
            or self.tenant_signed_steps__landlord_owner.issubset(steps_types)
        ):
            return PRContractState.PENDING_PAYING_COMMISSION

        # Party-specific flow
        if owner_party_type == PartyType.TENANT:
            if self.required_steps_for_tenant_signature__tenant_owner.issubset(steps_types):
                return PRContractState.PENDING_TENANT_SIGNATURE
            if self.required_steps_for_landlord_signature__tenant_owner.issubset(steps_types):
                return PRContractState.PENDING_LANDLORD_SIGNATURE
            if self.tenant_approved_steps.issubset(steps_types):
                return PRContractState.PENDING_LANDLORD_INFORMATION
            if self.required_steps_for_tenant_approve.issubset(steps_types):
                return PRContractState.PENDING_TENANT_APPROVAL

        elif owner_party_type == PartyType.LANDLORD:
            if self.required_steps_for_tenant_signature__landlord_owner.issubset(steps_types):
                return PRContractState.PENDING_TENANT_SIGNATURE
            if self.landlord_signed_steps__landlord_owner.issubset(steps_types):
                return PRContractState.PENDING_TENANT_INFORMATION
            if self.required_steps_for_landlord_signature__landlord_owner.issubset(steps_types):
                return PRContractState.PENDING_LANDLORD_SIGNATURE

        return PRContractState.DRAFT

    # ── Step sets ──────────────────────────────────────────────────────────

    @property
    def start_steps(self) -> set[PRContractStep]:
        return {
            PRContractStep.DEPOSIT,
            PRContractStep.MONTHLY_RENT,
            PRContractStep.DATES_AND_PENALTIES,
            PRContractStep.ADD_COUNTER_PARTY,
            PRContractStep.RENT_PAYMENT,
            PRContractStep.DEPOSIT_PAYMENT,
        }

    @property
    def property_steps(self) -> set[PRContractStep]:
        return {
            PRContractStep.PROPERTY_SPECIFICATIONS,
            PRContractStep.PROPERTY_DETAILS,
            PRContractStep.PROPERTY_FACILITIES,
        }

    # When owner is TENANT
    @property
    def required_steps_for_tenant_approve(self) -> set[PRContractStep]:
        return self.start_steps | {PRContractStep.TENANT_INFORMATION}

    @property
    def tenant_approved_steps(self) -> set[PRContractStep]:
        return self.required_steps_for_tenant_approve | {PRContractStep.TENANT_APPROVE}

    @property
    def required_steps_for_landlord_signature__tenant_owner(self) -> set[PRContractStep]:
        return self.tenant_approved_steps | self.property_steps | {PRContractStep.LANDLORD_INFORMATION}

    @property
    def landlord_signed_steps__tenant_owner(self) -> set[PRContractStep]:
        return self.required_steps_for_landlord_signature__tenant_owner | {PRContractStep.LANDLORD_SIGNATURE}

    @property
    def required_steps_for_tenant_signature__tenant_owner(self) -> set[PRContractStep]:
        return self.landlord_signed_steps__tenant_owner

    @property
    def tenant_signed_steps__tenant_owner(self) -> set[PRContractStep]:
        return self.landlord_signed_steps__tenant_owner | {PRContractStep.TENANT_SIGNATURE}

    # When owner is LANDLORD
    @property
    def required_steps_for_landlord_signature__landlord_owner(self) -> set[PRContractStep]:
        return self.start_steps | self.property_steps | {PRContractStep.LANDLORD_INFORMATION}

    @property
    def landlord_signed_steps__landlord_owner(self) -> set[PRContractStep]:
        return self.required_steps_for_landlord_signature__landlord_owner | {PRContractStep.LANDLORD_SIGNATURE}

    @property
    def required_steps_for_tenant_signature__landlord_owner(self) -> set[PRContractStep]:
        return self.landlord_signed_steps__landlord_owner | {PRContractStep.TENANT_INFORMATION}

    @property
    def tenant_signed_steps__landlord_owner(self) -> set[PRContractStep]:
        return self.required_steps_for_tenant_signature__landlord_owner | {PRContractStep.TENANT_SIGNATURE}

    # Commission
    @property
    def required_steps_for_paying_commission(self) -> set[PRContractStep]:
        return self.tenant_signed_steps__landlord_owner

    @property
    def landlord_payed_commission_steps(self) -> set[PRContractStep]:
        return self.required_steps_for_paying_commission | {PRContractStep.LANDLORD_COMMISSION}

    @property
    def tenant_payed_commission_steps(self) -> set[PRContractStep]:
        return self.required_steps_for_paying_commission | {PRContractStep.TENANT_COMMISSION}

    # Admin
    @property
    def required_steps_for_admin_approve(self) -> set[PRContractStep]:
        return self.required_steps_for_paying_commission | {
            PRContractStep.LANDLORD_COMMISSION,
            PRContractStep.TENANT_COMMISSION,
        }

    @property
    def admin_approved_steps(self) -> set[PRContractStep]:
        return self.required_steps_for_admin_approve | {PRContractStep.ADMIN_APPROVE}

    # Tracking code
    @property
    def tracking_code_requested_steps(self) -> set[PRContractStep]:
        return self.admin_approved_steps | {PRContractStep.TRACKING_CODE_REQUESTED}

    @property
    def tracking_code_delivered_steps(self) -> set[PRContractStep]:
        return self.tracking_code_requested_steps | {PRContractStep.TRACKING_CODE_DELIVERED}
