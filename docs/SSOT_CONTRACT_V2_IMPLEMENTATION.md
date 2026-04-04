# SSOT Contract v2.0 — Implementation map (backend + admin UI)

**SSOT:** *Amline Complete Product Master Specification v2.0* (product contract) with in-repo execution SSOT in [`AMLINE_MASTER_SPEC.md`](./AMLINE_MASTER_SPEC.md) and architecture notes in [`ARCHITECTURE_CONTRACT_PLATFORM_PRODUCTION.md`](./ARCHITECTURE_CONTRACT_PLATFORM_PRODUCTION.md).

## What this PR establishes

| Area | Status |
|------|--------|
| Canonical contract kinds (`RENT`, `SALE`, `EXCHANGE`, `CONSTRUCTION`, `PRE_SALE`, `LEASE_TO_OWN`) | **Backend** `app/domain/contracts/ssot.py` + aliases (`PROPERTY_RENT`, `BUYING_AND_SELLING`, …) |
| Flow labels **S1–S5**, **P1–P4**, **T1** | Stored on in-memory wizard contracts (`signature_flow`, `payment_flow`, `combined_flow_t1`); `sign/set` accepts optional `ssot_signature_stage` |
| Wizard step **RENTING** vs skip-to-**SIGNING** | **Aligned** with SSOT profile: `RENT` + `LEASE_TO_OWN` use renting; other kinds skip after mortgage |
| Public catalog | `GET /api/v1/contracts/ssot/catalog` |
| Admin UI contract types | Start step + labels + step registry use `usesRentingContractFlow()` |
| External adapters (Khodnevis, Katib, PSP, SMS) | **Stubs / registry** in `app/integrations/ssot_external_adapters.py`; PSP/SMS partial implementations remain in existing services |

## Not yet complete (Sweep / backlog)

- Persist contracts + parties + terms + commission in PostgreSQL per Target model (not only memory store).
- Full automation of **P1–P4** and **T1** with ledger postings and idempotency keys per SSOT.
- Temporal workflow graph tied to each `ssot_kind` (skeleton exists separately).
- User app (`amline-ui`) full wizard parity with admin (currently list labels only).
- Immutable audit append-only enforcement at DB constraint level.

## Sweep continuation prompts

Use issues titled `Sweep: …` per [`.sweep.yaml`](../sweep.yaml), for example:

- `Sweep: Add Alembic models for Contract + Party + Terms discriminated by ssot_kind`
- `Sweep: Map P1–P4 payment intents to existing PSP routes and payment_flow.current`
- `Sweep: Temporal — signal contract stage transitions from signature_flow.completed`
