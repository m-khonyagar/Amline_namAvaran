"""
Domain layer — business logic ported from clone's DDD architecture.

Modules:
- contract_enums: All contract-related enums (ContractStatus, PRContractStep, etc.)
- pr_contract_step_manager: State machine for property rent contract wizard
- commission_service: Commission calculation for rent and sale contracts
- financial_service: Invoice building and payment tracking
- crm_enums: CRM file status enums and lead status mapping
- wizard_step_machine: Linear wizard step transition graph (our addition)
"""
