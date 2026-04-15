# QA Scenarios — Amline Enterprise Master v5.0

> **Version:** 5.0 | **Status:** Active | **Last Updated:** 2026-04-15

## Table of Contents
1. [Overview](#overview)
2. [QS-001: Happy Path — Full Contract Lifecycle](#qs-001)
3. [QS-002: Counter-Offer Negotiation](#qs-002)
4. [QS-003: Payment Failure and Retry](#qs-003)
5. [QS-004: Contract Dispute and Resolution](#qs-004)
6. [QS-005: Tracking Code Issuance and Voiding](#qs-005)
7. [QS-006: Review Escalation Flow](#qs-006)
8. [QS-007: Concurrent Contract Submissions](#qs-007)
9. [QS-008: KYC Verification Blocking](#qs-008)
10. [QS-009: Contract Expiration Handling](#qs-009)
11. [QS-010: Refund Processing](#qs-010)
12. [QS-011: Support Ticket Escalation](#qs-011)
13. [QS-012: Commission Split Calculation](#qs-012)

---

## Overview

این فایل ۱۲ سناریوی جامع QA را برای پلتفرم Amline v5.0 تعریف می‌کند که شامل مسیرهای خوش‌بینانه، منفی و بازیابی است.

| QS ID | Title | Priority | Domain |
|-------|-------|----------|--------|
| QS-001 | Full Contract Lifecycle | P0 | Contract |
| QS-002 | Counter-Offer Negotiation | P0 | Contract |
| QS-003 | Payment Failure and Retry | P0 | Payment |
| QS-004 | Contract Dispute and Resolution | P1 | Contract, Review |
| QS-005 | Tracking Code Issuance/Voiding | P1 | Tracking |
| QS-006 | Review Escalation Flow | P1 | Review |
| QS-007 | Concurrent Contract Submissions | P1 | Contract |
| QS-008 | KYC Verification Blocking | P0 | Agency |
| QS-009 | Contract Expiration Handling | P1 | Contract |
| QS-010 | Refund Processing | P0 | Payment |
| QS-011 | Support Ticket Escalation | P2 | Support |
| QS-012 | Commission Split Calculation | P0 | Payment |

---

## QS-001: Happy Path — Full Contract Lifecycle {#qs-001}

**Title:** Complete Contract Lifecycle DRAFT → ARCHIVED  
**Priority:** P0  
**Domain:** Contract

### Preconditions
- Buyer (KYC verified) exists
- Seller (KYC verified) exists
- Consultant/Agent (active) exists
- Property is available (no active contracts)
- Payment gateway is operational

### Steps

| # | Actor | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Buyer | Submit contract draft | State: DRAFT, contract ID issued |
| 2 | System | Validate contract data | All VR-001..VR-005 pass |
| 3 | Consultant | Submit for review | State: PENDING_REVIEW |
| 4 | OPS Reviewer | Accept review | State: UNDER_REVIEW |
| 5 | OPS Reviewer | Approve contract | State: APPROVED |
| 6 | Seller | Accept contract | State: ACCEPTED |
| 7 | Buyer | Pay deposit | State: DEPOSIT_PENDING → DEPOSIT_PAID |
| 8 | System | Issue tracking code | AML-2026-XXXXXXXX issued |
| 9 | System | Schedule notary | State: NOTARY_SCHEDULED |
| 10 | Notary | Complete signing | State: NOTARY_COMPLETED |
| 11 | System | Initiate transfer | State: TRANSFER_PENDING |
| 12 | System | Complete transfer | State: TRANSFER_COMPLETE |
| 13 | System | Archive contract | State: ARCHIVED |

### Expected Events
- `contract.created`, `contract.state_changed` (×11), `payment.completed`, `tracking_code.issued`, `notification.sent` (×5)

### Negative Cases
- Buyer not KYC verified → ERR_008
- Property already contracted → ERR_005
- Payment amount mismatch → ERR_002

---

## QS-002: Counter-Offer Negotiation {#qs-002}

**Title:** Counter-Offer Flow  
**Priority:** P0  
**Domain:** Contract

### Preconditions
- Contract in APPROVED state
- Seller disagrees with terms

### Steps

| # | Actor | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Seller | Submit counter-offer | State: COUNTERED |
| 2 | System | Notify buyer | notification.sent event |
| 3 | Buyer | Review counter-offer | — |
| 4a | Buyer | Accept counter-offer | State: ACCEPTED |
| 4b | Buyer | Reject counter-offer | State: REJECTED |
| 4c | Buyer | Submit own counter | State: COUNTERED (round 2) |

### Validation
- VR-007: Counter-offer must be within 48 hours
- Maximum 3 counter-offer rounds enforced

### Negative Cases
- Counter-offer after 48 hours → ERR_001 (invalid transition)
- Exceeding 3 rounds → ERR_010 (duplicate/excess submission)

---

## QS-003: Payment Failure and Retry {#qs-003}

**Title:** Payment Failure and Retry  
**Priority:** P0  
**Domain:** Payment

### Preconditions
- Contract in ACCEPTED state
- Payment gateway intermittently unavailable

### Steps

| # | Actor | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Buyer | Initiate payment | payment.initiated event |
| 2 | Gateway | Return failure | ERR_012 logged |
| 3 | System | Retry (attempt 2) | Exponential backoff applied |
| 4 | Gateway | Return failure again | ERR_012 logged |
| 5 | System | Retry (attempt 3) | Final attempt |
| 6 | Gateway | Success | payment.completed, State: DEPOSIT_PAID |

### Retry Policy
- Max retries: 3
- Backoff: 30s, 90s, 270s
- After 3 failures: payment.failed event, notify buyer

### Negative Cases
- All 3 retries fail → payment.failed, contract remains ACCEPTED, buyer notified to retry manually

---

## QS-004: Contract Dispute and Resolution {#qs-004}

**Title:** Dispute Filing and Arbitration  
**Priority:** P1  
**Domain:** Contract, Review

### Preconditions
- Contract in TRANSFER_PENDING state
- Buyer disputes property condition

### Steps

| # | Actor | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Buyer | File dispute | State: DISPUTED, support ticket created |
| 2 | System | Assign to senior reviewer | review.assigned event |
| 3 | Reviewer | Investigate | State: UNDER_REVIEW |
| 4 | Reviewer | Unable to resolve | State: ESCALATED |
| 5 | System | Assign arbitrator | State: ARBITRATION |
| 6 | Arbitrator | Issue ruling | State: RESOLVED |
| 7 | System | Execute ruling | Payment/refund processed |

### Validation
- VR-008: Dispute must be filed within 7 days
- Dispute after 7 days → ERR_001

---

## QS-005: Tracking Code Issuance and Voiding {#qs-005}

**Title:** Tracking Code Lifecycle  
**Priority:** P1  
**Domain:** Tracking

### Preconditions
- Contract in ACCEPTED state
- Both parties KYC verified

### Steps

| # | Actor | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | System | Check preconditions | All 10 preconditions pass |
| 2 | System | Generate code | AML-2026-XXXXXXXX (Luhn validated) |
| 3 | System | Emit event | tracking_code.issued |
| 4 | Admin | Void code (fraud detected) | tracking_code.voided |
| 5 | System | Revert contract | State: APPROVED (pending re-review) |

### Negative Cases
- Code issued when contract not in ACCEPTED state → ERR_005
- Duplicate code generation → ERR_010

---

## QS-006: Review Escalation Flow {#qs-006}

**Title:** SLA Breach Escalation  
**Priority:** P1  
**Domain:** Review

### Preconditions
- Contract in UNDER_REVIEW state
- Reviewer has not acted within SLA

### Steps

| # | Actor | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | System | SLA timer fires at T+24h | Escalation triggered |
| 2 | System | Assign to senior reviewer | review.assigned (senior) |
| 3 | System | Notify ops manager | notification.sent |
| 4 | Senior Reviewer | Complete review | State: APPROVED or REJECTED |

### SLA Ladder
- L1: 24h → auto-escalate to senior reviewer
- L2: 48h → notify ops manager
- L3: 72h → notify CTO, contract auto-approved or manual override

---

## QS-007: Concurrent Contract Submissions {#qs-007}

**Title:** Race Condition — Same Property  
**Priority:** P1  
**Domain:** Contract

### Preconditions
- Property available
- Two buyers submit contracts simultaneously

### Steps

| # | Actor | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Buyer A | Submit contract | Acquires DB row lock |
| 2 | Buyer B | Submit contract (same time) | Blocked by lock |
| 3 | System | Buyer A contract created | VR-005 passes for A |
| 4 | System | Buyer B contract attempt | VR-005 fails → ERR_001 |
| 5 | System | Notify Buyer B | Property no longer available |

---

## QS-008: KYC Verification Blocking {#qs-008}

**Title:** KYC Required Before Contract  
**Priority:** P0  
**Domain:** Agency

### Preconditions
- New user registered, KYC not completed

### Steps

| # | Actor | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | User | Attempt to create contract | Blocked → ERR_008 |
| 2 | User | Submit KYC documents | KYC in PENDING state |
| 3 | Admin | Verify KYC | user.kyc_verified event |
| 4 | User | Retry contract creation | Success |

---

## QS-009: Contract Expiration Handling {#qs-009}

**Title:** Contract Expires Without Action  
**Priority:** P1  
**Domain:** Contract

### Preconditions
- Contract in PENDING_REVIEW state for 30 days

### Steps

| # | Actor | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | System | Expiration cron fires | Checks all PENDING contracts |
| 2 | System | Contract age > 30 days | State: EXPIRED |
| 3 | System | Emit event | contract.state_changed (EXPIRED) |
| 4 | System | Notify both parties | notification.sent (×2) |
| 5 | User | Can re-submit | New DRAFT contract created |

---

## QS-010: Refund Processing {#qs-010}

**Title:** Deposit Refund After Cancellation  
**Priority:** P0  
**Domain:** Payment

### Preconditions
- Contract in DEPOSIT_PAID state
- Seller cancels contract

### Steps

| # | Actor | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | Seller | Request cancellation | Cancellation fee applied (VR-011) |
| 2 | System | Calculate refund | Full deposit - cancellation fee |
| 3 | System | Initiate refund | payment.initiated (refund type) |
| 4 | Gateway | Process refund | payment.completed |
| 5 | System | Notify buyer | notification.sent |
| 6 | System | Update contract | State: CANCELLED |

---

## QS-011: Support Ticket Escalation {#qs-011}

**Title:** Support Ticket Escalation Chain  
**Priority:** P2  
**Domain:** Support

### Steps

| # | Actor | Action | Expected Result |
|---|-------|--------|-----------------|
| 1 | User | Create ticket | support.ticket_created, T1 assigned |
| 2 | T1 Agent | Unable to resolve in 4h | Auto-escalated to T2 |
| 3 | T2 Agent | Resolve issue | Ticket closed |

---

## QS-012: Commission Split Calculation {#qs-012}

**Title:** Commission Split Accuracy  
**Priority:** P0  
**Domain:** Payment

### Test Data
- Contract value: 10,000,000,000 IRR
- Platform commission: 1%
- Agent commission: 2%
- VAT: 9%

### Expected Results

| Recipient | Amount (IRR) | Calculation |
|-----------|-------------|-------------|
| Platform | 100,000,000 | 10B × 1% |
| Agent | 200,000,000 | 10B × 2% |
| VAT on platform fee | 9,000,000 | 100M × 9% |
| VAT on agent fee | 18,000,000 | 200M × 9% |
| Seller receives | 9,700,000,000 | 10B - 100M - 200M |

### Negative Cases
- Agent commission > 5% → ERR_001 (VR-006 violation)
- Total fees exceed contract value → ERR_002

---

*Cross-reference: [VALIDATION-RULES.md](VALIDATION-RULES.md) | [CONTRACTS-SPEC.md](CONTRACTS-SPEC.md) | [PAYMENTS-SPEC.md](PAYMENTS-SPEC.md)*
