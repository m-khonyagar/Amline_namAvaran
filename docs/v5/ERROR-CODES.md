# Error Codes Catalog — Amline Enterprise Master v5.0

| Field       | Value                      |
|-------------|----------------------------|
| Version     | v5.0                       |
| Date        | 2026-04-15                 |
| Status      | Active                     |
| Maintainer  | Backend Platform Team      |
| Document ID | AME-ERRORS-0009            |

---

## Table of Contents

1. [Error Handling Philosophy](#1-error-handling-philosophy)
2. [Error Response Format](#2-error-response-format)
3. [Error Categories](#3-error-categories)
4. [Error Summary Table](#4-error-summary-table)
5. [Detailed Error Definitions](#5-detailed-error-definitions)
   - [ERR_001: Invalid Contract State Transition](#err_001-invalid-contract-state-transition)
   - [ERR_002: Payment Amount Mismatch](#err_002-payment-amount-mismatch)
   - [ERR_003: Unauthorized Access](#err_003-unauthorized-access)
   - [ERR_004: Contract Not Found](#err_004-contract-not-found)
   - [ERR_005: Tracking Code Already Issued](#err_005-tracking-code-already-issued)
   - [ERR_006: Review Queue Full](#err_006-review-queue-full)
   - [ERR_007: Escrow Release Conditions Not Met](#err_007-escrow-release-conditions-not-met)
   - [ERR_008: KYC Verification Required](#err_008-kyc-verification-required)
   - [ERR_009: Contract Period Expired](#err_009-contract-period-expired)
   - [ERR_010: Duplicate Submission](#err_010-duplicate-submission)
   - [ERR_011: Rate Limit Exceeded](#err_011-rate-limit-exceeded)
   - [ERR_012: External Service Unavailable](#err_012-external-service-unavailable)
   - [ERR_013 through ERR_020](#err_013-through-err_020)
6. [Error Monitoring and Alerting](#6-error-monitoring-and-alerting)
7. [Client Error Handling Best Practices](#7-client-error-handling-best-practices)

---

## 1. Error Handling Philosophy

Amline v5.0 treats errors as **first-class citizens**. Every error returned by the API carries:

- A **unique, stable error code** that never changes across versions.
- A **human-readable message** in both English and Persian (Farsi).
- **Structured details** that provide machine-parseable context for programmatic handling.
- A **documentation URL** pointing to this catalog for developer reference.
- A **correlation ID** enabling end-to-end tracing from client to logs.

### Principles

| Principle                   | Implementation                                                      |
|-----------------------------|---------------------------------------------------------------------|
| **Never expose internals**  | Stack traces, SQL errors, and internal state never reach clients    |
| **Be specific**             | Prefer precise error codes over generic HTTP status codes alone     |
| **Be actionable**           | Every error message tells the user or developer what to do          |
| **Fail fast**               | Validate input at the earliest possible layer                       |
| **Idempotency-safe errors** | 4xx errors do NOT consume rate limits (except 429)                  |
| **Bilingual**               | Persian message for end-user display; English for developer logs    |
| **Consistent format**       | Identical error envelope structure across all endpoints             |

---

## 2. Error Response Format

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERR_001",
    "message": "Invalid contract state transition",
    "message_fa": "انتقال حالت قرارداد نامعتبر است",
    "details": {
      "current_state": "ACCEPTED",
      "attempted_transition": "DRAFT",
      "allowed_transitions": ["COMPLETED", "DISPUTED", "CANCELLED"]
    },
    "documentation_url": "https://docs.amline.ir/v5/errors/ERR_001",
    "correlation_id": "req-550e8400-e29b-41d4-a716-446655440000"
  },
  "meta": {
    "timestamp": "2026-04-15T10:30:00.000Z",
    "request_id": "req-550e8400-e29b-41d4-a716-446655440000",
    "version": "5.0"
  }
}
```

### Error Object Fields

| Field               | Type    | Required | Description                                         |
|---------------------|---------|----------|-----------------------------------------------------|
| `code`              | string  | ✅        | Stable error code (e.g., `ERR_001`)                 |
| `message`           | string  | ✅        | English developer message                           |
| `message_fa`        | string  | ✅        | Persian end-user message                            |
| `details`           | object  | ❌        | Domain-specific structured context                  |
| `documentation_url` | string  | ✅        | URL to this catalog section                         |
| `correlation_id`    | string  | ✅        | Matches `X-Correlation-ID` header for log tracing  |

---

## 3. Error Categories

| Category Code | Range     | Domain                    | Description                         |
|---------------|-----------|---------------------------|-------------------------------------|
| **AUTH**      | ERR_001xx | Authentication/Authorization | Token, session, permission errors |
| **CONTRACT**  | ERR_002xx | Contract Management       | Contract lifecycle and validation   |
| **PAYMENT**   | ERR_003xx | Payment Processing        | Payment and escrow errors           |
| **REVIEW**    | ERR_004xx | Review Operations         | Review queue and decision errors    |
| **TRACKING**  | ERR_005xx | Tracking Codes            | Tracking code lifecycle errors      |
| **SYSTEM**    | ERR_009xx | System/Infrastructure     | External services, infrastructure   |

> **Note:** In v5.0, error codes use a flat scheme (`ERR_001` to `ERR_020`) with category implicit in the code range for readability. Future versions will migrate to categorical prefixes.

---

## 4. Error Summary Table

| Code    | HTTP Status | Category | English Message                            | Persian Message                              |
|---------|-------------|----------|--------------------------------------------|----------------------------------------------|
| ERR_001 | 422         | CONTRACT | Invalid contract state transition          | انتقال حالت قرارداد نامعتبر است              |
| ERR_002 | 400         | PAYMENT  | Payment amount does not match contract     | مبلغ پرداخت با قرارداد مطابقت ندارد          |
| ERR_003 | 403         | AUTH     | Unauthorized access                        | دسترسی غیرمجاز                               |
| ERR_004 | 404         | CONTRACT | Contract not found                         | قرارداد یافت نشد                             |
| ERR_005 | 409         | TRACKING | Tracking code already issued               | کد رهگیری قبلاً صادر شده است                 |
| ERR_006 | 503         | REVIEW   | Review queue capacity exceeded             | صف بررسی پر است                              |
| ERR_007 | 422         | PAYMENT  | Escrow release conditions not met          | شرایط آزادسازی سپرده برآورده نشده است        |
| ERR_008 | 403         | AUTH     | KYC verification required                 | احراز هویت الزامی است                        |
| ERR_009 | 410         | CONTRACT | Contract period expired                   | مدت قرارداد منقضی شده است                    |
| ERR_010 | 409         | CONTRACT | Duplicate submission detected              | ارسال تکراری                                 |
| ERR_011 | 429         | SYSTEM   | Too many requests                          | محدودیت نرخ درخواست                          |
| ERR_012 | 503         | SYSTEM   | External service unavailable               | سرویس خارجی در دسترس نیست                    |
| ERR_013 | 400         | CONTRACT | Invalid property ID                        | شناسه ملک نامعتبر است                        |
| ERR_014 | 409         | CONTRACT | Property already under active contract     | ملک دارای قرارداد فعال است                   |
| ERR_015 | 422         | CONTRACT | Counter-offer window expired               | مهلت پیشنهاد متقابل به پایان رسیده است       |
| ERR_016 | 422         | CONTRACT | Dispute filing window expired              | مهلت ثبت اعتراض به پایان رسیده است           |
| ERR_017 | 422         | PAYMENT  | Partial payment not allowed               | پرداخت جزئی مجاز نیست                        |
| ERR_018 | 400         | AUTH     | Invalid or expired token                  | توکن نامعتبر یا منقضی شده است                |
| ERR_019 | 422         | CONTRACT | Agent commission rate exceeds maximum      | نرخ کمیسیون مشاور از حداکثر بیشتر است        |
| ERR_020 | 500         | SYSTEM   | Internal server error                     | خطای داخلی سرور                              |

---

## 5. Detailed Error Definitions

---

### ERR_001: Invalid Contract State Transition

| Attribute        | Value                                                |
|------------------|------------------------------------------------------|
| **Code**         | `ERR_001`                                            |
| **HTTP Status**  | `422 Unprocessable Entity`                           |
| **Category**     | CONTRACT                                             |
| **English**      | Invalid contract state transition                    |
| **Persian**      | انتقال حالت قرارداد نامعتبر است                      |
| **Retryable**    | No — requires user action                            |
| **Alertable**    | No (expected business error)                         |

**Description:**

A request attempted to transition a contract to a state that is not allowed from the current state. The contract state machine is strict and only allows specific transitions (see STATE-MACHINE.md for the full diagram).

**When It Occurs:**

- Calling `POST /contracts/{id}/submit` when contract is already in `PENDING_REVIEW`.
- Calling `POST /contracts/{id}/accept` when contract is in `DRAFT`.
- Attempting any operation on a `CANCELLED` or `EXPIRED` contract.
- System attempt to move contract backward in the lifecycle.

**Error Response Example:**

```json
{
  "error": {
    "code": "ERR_001",
    "message": "Invalid contract state transition",
    "message_fa": "انتقال حالت قرارداد نامعتبر است",
    "details": {
      "contract_id": "CTR-2026-00001",
      "current_state": "ACCEPTED",
      "attempted_transition": "DRAFT",
      "allowed_transitions": ["COMPLETED", "DISPUTED", "CANCELLED"],
      "state_machine_version": "5.0"
    },
    "documentation_url": "https://docs.amline.ir/v5/errors/ERR_001"
  }
}
```

**Resolution Steps:**

1. Check `details.current_state` to understand the current contract state.
2. Check `details.allowed_transitions` to see what is valid.
3. Redirect user to the appropriate action for the current state.
4. Refer to the State Machine diagram in `docs/v5/STATE-MACHINE.md`.

---

### ERR_002: Payment Amount Mismatch

| Attribute        | Value                                                  |
|------------------|--------------------------------------------------------|
| **Code**         | `ERR_002`                                              |
| **HTTP Status**  | `400 Bad Request`                                      |
| **Category**     | PAYMENT                                                |
| **English**      | Payment amount does not match contract                 |
| **Persian**      | مبلغ پرداخت با قرارداد مطابقت ندارد                    |
| **Retryable**    | No — requires correction                               |
| **Alertable**    | Yes — log for fraud monitoring                         |

**Description:**

The payment amount submitted does not exactly match the `deposit_amount` recorded in the contract. Amline does not allow partial payments or overpayments (see VR-010).

**When It Occurs:**

- `POST /payments/initiate` with `amount` different from `contract.deposit_amount`.
- Gateway webhook verifies a different amount than initiated.
- Contract amount was updated after payment was initiated (race condition).

**Error Response Example:**

```json
{
  "error": {
    "code": "ERR_002",
    "message": "Payment amount does not match contract",
    "message_fa": "مبلغ پرداخت با قرارداد مطابقت ندارد",
    "details": {
      "contract_id": "CTR-2026-00001",
      "expected_amount": 1500000000,
      "submitted_amount": 1400000000,
      "currency": "IRR",
      "discrepancy": -100000000
    },
    "documentation_url": "https://docs.amline.ir/v5/errors/ERR_002"
  }
}
```

**Resolution Steps:**

1. Re-fetch the contract via `GET /contracts/{id}` to get the current `deposit_amount`.
2. Initiate payment with the exact `deposit_amount` from the contract.
3. If discrepancy persists, contact support with the `correlation_id`.

---

### ERR_003: Unauthorized Access

| Attribute        | Value                                              |
|------------------|----------------------------------------------------|
| **Code**         | `ERR_003`                                          |
| **HTTP Status**  | `403 Forbidden`                                    |
| **Category**     | AUTH                                               |
| **English**      | Unauthorized access                                |
| **Persian**      | دسترسی غیرمجاز                                    |
| **Retryable**    | No — requires role change                          |
| **Alertable**    | Yes — security monitoring                          |

**Description:**

The authenticated user does not have the required permission or role to perform the requested action. The user is authenticated (valid token) but lacks authorization.

**When It Occurs:**

- TENANT attempts to access `GET /reviews/queue`.
- CONSULTANT attempts to `POST /reviews/{id}/decision`.
- User tries to access another user's contract (RLS violation).
- ADMIN tries to access financial settlement records.

**Error Response Example:**

```json
{
  "error": {
    "code": "ERR_003",
    "message": "Unauthorized access",
    "message_fa": "دسترسی غیرمجاز",
    "details": {
      "user_id": "USR-10001",
      "user_role": "TENANT",
      "required_permission": "review:queue:read",
      "resource": "/v5/reviews/queue"
    },
    "documentation_url": "https://docs.amline.ir/v5/errors/ERR_003"
  }
}
```

**Resolution Steps:**

1. Verify the user's role in JWT claims.
2. Check RBAC-PERMISSIONS.md for the required role for this action.
3. If role change is needed, contact an ADMIN.
4. If you believe this is a bug, report with `correlation_id`.

---

### ERR_004: Contract Not Found

| Attribute        | Value                                              |
|------------------|----------------------------------------------------|
| **Code**         | `ERR_004`                                          |
| **HTTP Status**  | `404 Not Found`                                    |
| **Category**     | CONTRACT                                           |
| **English**      | Contract not found                                 |
| **Persian**      | قرارداد یافت نشد                                  |
| **Retryable**    | No                                                 |
| **Alertable**    | No (expected user error)                           |

**Description:**

The requested contract ID does not exist in the system, or exists but is not accessible to the requesting user (RLS). For security, both cases return 404 (not 403) to prevent enumeration attacks.

**When It Occurs:**

- `GET /contracts/CTR-INVALID` with non-existent ID.
- User tries to access a real contract they are not a party to.
- Contract was soft-deleted/cancelled and is no longer queryable (depends on policy).

**Error Response Example:**

```json
{
  "error": {
    "code": "ERR_004",
    "message": "Contract not found",
    "message_fa": "قرارداد یافت نشد",
    "details": {
      "contract_id": "CTR-2026-99999",
      "hint": "Verify the contract ID and ensure you are a party to this contract"
    },
    "documentation_url": "https://docs.amline.ir/v5/errors/ERR_004"
  }
}
```

**Resolution Steps:**

1. Verify the contract ID is correct.
2. Check `GET /contracts` to list all contracts accessible to the user.
3. If you are a party to this contract, contact support.

---

### ERR_005: Tracking Code Already Issued

| Attribute        | Value                                               |
|------------------|-----------------------------------------------------|
| **Code**         | `ERR_005`                                           |
| **HTTP Status**  | `409 Conflict`                                      |
| **Category**     | TRACKING                                            |
| **English**      | Tracking code already issued                        |
| **Persian**      | کد رهگیری قبلاً صادر شده است                        |
| **Retryable**    | No — use existing tracking code                     |
| **Alertable**    | Yes — potential duplicate issuance attempt          |

**Description:**

A tracking code has already been issued for this contract. Each contract may only have one active tracking code at a time.

**When It Occurs:**

- `POST /tracking/issue` called for a contract that already has a `TRACKING_ISSUED` state.
- Race condition: two simultaneous issuance requests for the same contract.

**Error Response Example:**

```json
{
  "error": {
    "code": "ERR_005",
    "message": "Tracking code already issued",
    "message_fa": "کد رهگیری قبلاً صادر شده است",
    "details": {
      "contract_id": "CTR-2026-00001",
      "existing_tracking_code": "AME-2026-CTR00001-TC",
      "issued_at": "2026-04-16T09:00:00Z",
      "expires_at": "2027-05-01T23:59:59Z"
    },
    "documentation_url": "https://docs.amline.ir/v5/errors/ERR_005"
  }
}
```

**Resolution Steps:**

1. Use `GET /tracking/{code}/verify` with the existing tracking code.
2. If the existing code needs to be voided, use `POST /tracking/{code}/void` (ADMIN only).
3. After voiding, a new code can be issued.

---

### ERR_006: Review Queue Full

| Attribute        | Value                                               |
|------------------|-----------------------------------------------------|
| **Code**         | `ERR_006`                                           |
| **HTTP Status**  | `503 Service Unavailable`                           |
| **Category**     | REVIEW                                              |
| **English**      | Review queue capacity exceeded                      |
| **Persian**      | صف بررسی پر است                                    |
| **Retryable**    | Yes — retry after `Retry-After` header              |
| **Alertable**    | Yes — ops capacity alert                            |

**Description:**

The review queue has reached its maximum capacity. The system applies backpressure to prevent reviewer overload. Submissions are temporarily blocked until queue drains below the high-water mark (default: 500 items).

**When It Occurs:**

- `POST /contracts/{id}/submit` when queue size >= 500 items.
- Typically occurs during high-volume periods or after system downtime.

**Error Response Example:**

```json
{
  "error": {
    "code": "ERR_006",
    "message": "Review queue capacity exceeded",
    "message_fa": "صف بررسی پر است",
    "details": {
      "queue_size": 500,
      "queue_capacity": 500,
      "estimated_drain_time_minutes": 45,
      "retry_after_seconds": 900
    },
    "documentation_url": "https://docs.amline.ir/v5/errors/ERR_006"
  }
}
```

**Response Headers:**

```http
Retry-After: 900
```

**Resolution Steps:**

1. Wait for the `retry_after_seconds` duration before retrying.
2. Monitor the queue via admin dashboard.
3. If persistent, ops team should onboard additional reviewers.

---

### ERR_007: Escrow Release Conditions Not Met

| Attribute        | Value                                                      |
|------------------|------------------------------------------------------------|
| **Code**         | `ERR_007`                                                  |
| **HTTP Status**  | `422 Unprocessable Entity`                                 |
| **Category**     | PAYMENT                                                    |
| **English**      | Escrow release conditions not met                          |
| **Persian**      | شرایط آزادسازی سپرده برآورده نشده است                      |
| **Retryable**    | No — requires all conditions to be satisfied               |
| **Alertable**    | No (expected business rule)                                |

**Description:**

The escrow release (or tracking code issuance which requires escrow confirmation) was attempted but one or more preconditions have not been satisfied. All conditions must be met simultaneously.

**Conditions Required:**

1. Contract state = `ACCEPTED`
2. Deposit payment = `COMPLETED`
3. Review = `APPROVED`
4. Both parties KYC level = `FULL`

**Error Response Example:**

```json
{
  "error": {
    "code": "ERR_007",
    "message": "Escrow release conditions not met",
    "message_fa": "شرایط آزادسازی سپرده برآورده نشده است",
    "details": {
      "contract_id": "CTR-2026-00001",
      "conditions": {
        "contract_accepted": true,
        "deposit_paid": true,
        "review_approved": true,
        "buyer_kyc_full": false,
        "seller_kyc_full": true
      },
      "failed_conditions": ["buyer_kyc_full"],
      "hint": "Buyer (USR-10001) must complete FULL KYC verification"
    },
    "documentation_url": "https://docs.amline.ir/v5/errors/ERR_007"
  }
}
```

---

### ERR_008: KYC Verification Required

| Attribute        | Value                                              |
|------------------|----------------------------------------------------|
| **Code**         | `ERR_008`                                          |
| **HTTP Status**  | `403 Forbidden`                                    |
| **Category**     | AUTH                                               |
| **English**      | KYC verification required                          |
| **Persian**      | احراز هویت الزامی است                              |
| **Retryable**    | Yes — after KYC is completed                       |
| **Alertable**    | No                                                 |

**Description:**

The requested operation requires a specific KYC verification level that the user has not yet completed. Operations requiring KYC:
- `contract:submit_for_review`: requires BASIC KYC
- `contract:accept`: requires FULL KYC
- `tracking:issue`: requires FULL KYC for both parties

**Error Response Example:**

```json
{
  "error": {
    "code": "ERR_008",
    "message": "KYC verification required",
    "message_fa": "احراز هویت الزامی است",
    "details": {
      "user_id": "USR-10001",
      "current_kyc_level": "NONE",
      "required_kyc_level": "BASIC",
      "kyc_submission_url": "/v5/auth/kyc/submit",
      "operation": "contract:submit_for_review"
    },
    "documentation_url": "https://docs.amline.ir/v5/errors/ERR_008"
  }
}
```

**Resolution Steps:**

1. Direct user to complete KYC via `POST /auth/kyc/submit`.
2. KYC processing takes 5-15 minutes.
3. User receives notification when KYC is approved.
4. Retry the original operation after KYC approval.

---

### ERR_009: Contract Period Expired

| Attribute        | Value                                              |
|------------------|----------------------------------------------------|
| **Code**         | `ERR_009`                                          |
| **HTTP Status**  | `410 Gone`                                         |
| **Category**     | CONTRACT                                           |
| **English**      | Contract period expired                            |
| **Persian**      | مدت قرارداد منقضی شده است                          |
| **Retryable**    | No — create a new contract                         |
| **Alertable**    | No                                                 |

**Description:**

The contract's offer period or end date has expired. Once expired, the contract transitions to `EXPIRED` state automatically. No further operations except viewing history are permitted.

**When It Occurs:**

- Counter-offer not accepted within 48 hours (VR-007) → offer expires.
- Contract in PENDING_REVIEW for > 30 days without action → expires.
- Contract's `end_date` has passed.

**Error Response Example:**

```json
{
  "error": {
    "code": "ERR_009",
    "message": "Contract period expired",
    "message_fa": "مدت قرارداد منقضی شده است",
    "details": {
      "contract_id": "CTR-2026-00001",
      "expired_at": "2026-04-13T18:00:00Z",
      "expiry_reason": "COUNTER_OFFER_WINDOW_EXCEEDED",
      "state": "EXPIRED"
    },
    "documentation_url": "https://docs.amline.ir/v5/errors/ERR_009"
  }
}
```

---

### ERR_010: Duplicate Submission

| Attribute        | Value                                              |
|------------------|----------------------------------------------------|
| **Code**         | `ERR_010`                                          |
| **HTTP Status**  | `409 Conflict`                                     |
| **Category**     | CONTRACT                                           |
| **English**      | Duplicate submission detected                      |
| **Persian**      | ارسال تکراری                                       |
| **Retryable**    | No — use existing resource                         |
| **Alertable**    | Yes — fraud monitoring                             |

**Description:**

A request with the same `Idempotency-Key` has already been processed, OR a business-level duplicate was detected (e.g., same KYC document uploaded twice, same contract created with identical parameters within 60 seconds).

**Error Response Example:**

```json
{
  "error": {
    "code": "ERR_010",
    "message": "Duplicate submission detected",
    "message_fa": "ارسال تکراری",
    "details": {
      "idempotency_key": "550e8400-e29b-41d4-a716-446655440000",
      "original_request_id": "req-660f9511-f30c-52e5",
      "original_created_at": "2026-04-15T10:30:00Z",
      "existing_resource_id": "CTR-2026-00001",
      "existing_resource_url": "/v5/contracts/CTR-2026-00001"
    },
    "documentation_url": "https://docs.amline.ir/v5/errors/ERR_010"
  }
}
```

**Resolution Steps:**

1. If using `Idempotency-Key`: the original response is included — use the `existing_resource_id`.
2. If a business duplicate: use the existing resource or wait 60 seconds before resubmitting.
3. Use `existing_resource_url` to fetch the already-created resource.

---

### ERR_011: Rate Limit Exceeded

| Attribute        | Value                                              |
|------------------|----------------------------------------------------|
| **Code**         | `ERR_011`                                          |
| **HTTP Status**  | `429 Too Many Requests`                            |
| **Category**     | SYSTEM                                             |
| **English**      | Too many requests                                  |
| **Persian**      | محدودیت نرخ درخواست                                |
| **Retryable**    | Yes — after `Retry-After` seconds                  |
| **Alertable**    | Yes — if pattern suggests abuse                    |

**Description:**

The client has exceeded the allowed request rate for their role. Rate limits apply per user per hour (rolling window). See rate limit table in API-CONTRACT.md.

**Response Headers:**

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1713178800
Retry-After: 3547
```

**Error Response Example:**

```json
{
  "error": {
    "code": "ERR_011",
    "message": "Too many requests",
    "message_fa": "محدودیت نرخ درخواست",
    "details": {
      "limit": 1000,
      "window_seconds": 3600,
      "retry_after_seconds": 3547,
      "reset_at": "2026-04-15T11:00:00Z"
    },
    "documentation_url": "https://docs.amline.ir/v5/errors/ERR_011"
  }
}
```

**Resolution Steps:**

1. Implement exponential backoff with jitter in your client.
2. Cache responses where possible.
3. Contact support if legitimate use exceeds limits.

---

### ERR_012: External Service Unavailable

| Attribute        | Value                                                |
|------------------|------------------------------------------------------|
| **Code**         | `ERR_012`                                            |
| **HTTP Status**  | `503 Service Unavailable`                            |
| **Category**     | SYSTEM                                               |
| **English**      | External service unavailable                         |
| **Persian**      | سرویس خارجی در دسترس نیست                            |
| **Retryable**    | Yes — with exponential backoff                       |
| **Alertable**    | Yes — P2 incident alert                              |

**Description:**

A dependency on an external service (payment gateway, KYC provider, SMS provider) is unavailable or timing out. Amline applies a circuit breaker pattern and will return this error during open circuit state.

**When It Occurs:**

- Zarinpal payment gateway returns 5xx or times out.
- Shahkar KYC service is down.
- Kavenegar SMS gateway unavailable.
- Arvan CDN unreachable during document upload.

**Error Response Example:**

```json
{
  "error": {
    "code": "ERR_012",
    "message": "External service unavailable",
    "message_fa": "سرویس خارجی در دسترس نیست",
    "details": {
      "service": "ZARINPAL",
      "service_status_url": "https://status.zarinpal.com",
      "circuit_breaker_state": "OPEN",
      "retry_after_seconds": 60,
      "fallback_available": false
    },
    "documentation_url": "https://docs.amline.ir/v5/errors/ERR_012"
  }
}
```

**Resolution Steps:**

1. Check the external service status page.
2. Retry after `retry_after_seconds` using exponential backoff.
3. Monitor `https://status.amline.ir` for platform-level service status.

---

## ERR_013 through ERR_020

### ERR_013: Invalid Property ID

| Code    | HTTP  | English                          | Persian                         |
|---------|-------|----------------------------------|---------------------------------|
| ERR_013 | 400   | Invalid or non-existent property | شناسه ملک نامعتبر است           |

**Description:** The `property_id` provided does not exist in the property registry or has been archived/removed.

**Details:** `{ "property_id": "PROP-99999", "suggestion": "Check marketplace listing for valid IDs" }`

---

### ERR_014: Property Already Under Active Contract

| Code    | HTTP  | English                              | Persian                         |
|---------|-------|--------------------------------------|---------------------------------|
| ERR_014 | 409   | Property already under active contract | ملک دارای قرارداد فعال است    |

**Description:** Validation rule VR-005 failed. The property already has an active contract with overlapping dates.

**Details:** `{ "property_id": "PROP-40004", "conflicting_contract_id": "CTR-2026-00050", "overlap_period": {"from": "2026-05-01", "to": "2027-05-01"} }`

---

### ERR_015: Counter-offer Window Expired

| Code    | HTTP  | English                       | Persian                                           |
|---------|-------|-------------------------------|---------------------------------------------------|
| ERR_015 | 422   | Counter-offer window expired  | مهلت پیشنهاد متقابل به پایان رسیده است            |

**Description:** VR-007 violation. The 48-hour window for submitting a counter-offer has passed. The original offer has auto-expired.

**Details:** `{ "offer_created_at": "2026-04-13T10:00:00Z", "window_expired_at": "2026-04-15T10:00:00Z", "now": "2026-04-15T14:00:00Z" }`

---

### ERR_016: Dispute Filing Window Expired

| Code    | HTTP  | English                        | Persian                                       |
|---------|-------|--------------------------------|-----------------------------------------------|
| ERR_016 | 422   | Dispute filing window expired  | مهلت ثبت اعتراض به پایان رسیده است            |

**Description:** VR-008 violation. The 7-calendar-day window for filing a dispute has passed.

**Details:** `{ "incident_date": "2026-04-01", "dispute_deadline": "2026-04-08", "now": "2026-04-15" }`

---

### ERR_017: Partial Payment Not Allowed

| Code    | HTTP  | English                     | Persian                         |
|---------|----|------------------------------|---------------------------------|
| ERR_017 | 422 | Partial payment not allowed | پرداخت جزئی مجاز نیست           |

**Description:** VR-010 violation. The payment amount must exactly equal `contract.deposit_amount`. No partial or installment payments are accepted in v5.0.

**Details:** `{ "required_amount": 1500000000, "submitted_amount": 750000000, "policy": "FULL_DEPOSIT_ONLY" }`

---

### ERR_018: Invalid or Expired Token

| Code    | HTTP  | English                   | Persian                               |
|---------|-------|---------------------------|---------------------------------------|
| ERR_018 | 400   | Invalid or expired token  | توکن نامعتبر یا منقضی شده است         |

**Description:** The JWT token provided is malformed, expired, or has been invalidated (logout, role change). Distinct from ERR_003 (which means token is valid but lacks permission).

**Details:** `{ "reason": "TOKEN_EXPIRED", "expired_at": "2026-04-15T09:00:00Z", "hint": "Use POST /auth/refresh to obtain a new token" }`

---

### ERR_019: Agent Commission Rate Exceeds Maximum

| Code    | HTTP  | English                               | Persian                                           |
|---------|-------|---------------------------------------|---------------------------------------------------|
| ERR_019 | 422   | Agent commission rate exceeds maximum | نرخ کمیسیون مشاور از حداکثر بیشتر است             |

**Description:** VR-006 violation. The specified commission rate exceeds the regulatory cap of 5% total (or 2.5% per agent if dual agents).

**Details:** `{ "submitted_rate": 0.06, "max_allowed_rate": 0.05, "dual_agent": false, "regulation": "RE-ORG-CIRCULAR-2025-7" }`

---

### ERR_020: Internal Server Error

| Code    | HTTP  | English                | Persian                |
|---------|-------|------------------------|------------------------|
| ERR_020 | 500   | Internal server error  | خطای داخلی سرور        |

**Description:** An unexpected error occurred in the system. This is always a bug and triggers an automatic P1 alert to the on-call engineering team. The `correlation_id` is critical for investigation.

**Details:** `{ "correlation_id": "req-xxx", "hint": "This error has been automatically reported. Contact support with this correlation_id." }`

---

## 6. Error Monitoring and Alerting

### Error Rate Alerts

```yaml
groups:
  - name: amline_errors
    rules:
      - alert: HighErrorRate_5xx
        expr: |
          rate(http_requests_total{status=~"5.."}[5m]) /
          rate(http_requests_total[5m]) > 0.01
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "5xx error rate exceeds 1% on {{ $labels.endpoint }}"

      - alert: ERR_012_CircuitBreakerOpen
        expr: circuit_breaker_state{state="open"} == 1
        for: 0m
        labels:
          severity: high
        annotations:
          summary: "Circuit breaker OPEN for {{ $labels.service }}"

      - alert: ERR_006_ReviewQueueFull
        expr: review_queue_size >= 450
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Review queue at {{ $value }} — approaching capacity (500)"
```

### Error Rate Dashboard

| Metric                               | Alert Threshold | Severity |
|--------------------------------------|-----------------|----------|
| 5xx rate                             | > 1%            | CRITICAL |
| ERR_001 rate (state transition)      | > 5%            | WARNING  |
| ERR_003 rate (unauthorized)          | > 2%            | WARNING (possible attack) |
| ERR_006 occurrences                  | > 0             | WARNING  |
| ERR_012 occurrences                  | > 0             | HIGH     |
| ERR_020 occurrences                  | > 0             | CRITICAL |

---

## 7. Client Error Handling Best Practices

### Retry Strategy

```python
import time
import random
from typing import Optional

def api_call_with_retry(
    func,
    max_attempts: int = 3,
    base_delay: float = 1.0,
    retryable_codes: list = ["ERR_006", "ERR_012", "ERR_011"]
) -> dict:
    for attempt in range(max_attempts):
        response = func()

        if response["success"]:
            return response

        error_code = response["error"]["code"]

        if error_code not in retryable_codes:
            # Non-retryable: surface immediately
            raise ApiError(response["error"])

        if attempt == max_attempts - 1:
            raise ApiError(response["error"])

        # Exponential backoff with jitter
        delay = base_delay * (2 ** attempt) + random.uniform(0, 1)

        # Respect Retry-After header if present
        retry_after = response.get("error", {}).get("details", {}).get("retry_after_seconds")
        if retry_after:
            delay = max(delay, retry_after)

        time.sleep(delay)
```

### Error Display Guidelines

| Error Code  | Show to User?     | Message to Show                                    |
|-------------|-------------------|----------------------------------------------------|
| ERR_001     | Yes               | `message_fa`                                       |
| ERR_002     | Yes               | `message_fa` + exact amounts from `details`        |
| ERR_003     | Yes               | `message_fa` — do not reveal permission details    |
| ERR_004     | Yes               | `message_fa`                                       |
| ERR_005     | Yes               | `message_fa` + existing code from `details`        |
| ERR_006     | Yes               | `message_fa` + retry time from `details`           |
| ERR_007     | Yes               | `message_fa` + failed conditions from `details`    |
| ERR_008     | Yes               | `message_fa` + link to KYC submission              |
| ERR_009     | Yes               | `message_fa`                                       |
| ERR_010     | Yes               | `message_fa` + link to existing resource           |
| ERR_011     | Yes               | `message_fa` + retry time                          |
| ERR_012     | Yes               | `message_fa` — generic; do not expose service name |
| ERR_018     | Yes               | Prompt re-login; do not show technical details     |
| ERR_020     | Yes               | Generic "خطای سیستمی" + `correlation_id` for support |

### Never Expose to End Users

- Stack traces
- SQL error messages
- Internal service names
- `correlation_id` in automated messages (only in support context)
- Raw `details` object for ERR_003 (security risk)

---

*Document maintained by Backend Platform Team. For changes, open a PR against `docs/v5/ERROR-CODES.md`.*
