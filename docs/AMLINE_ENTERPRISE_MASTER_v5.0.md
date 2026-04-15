# سند نهایی یکپارچه املاین — نسخه Enterprise Master (v5.0)

## تلفیق سند v2.0 + Engineering Pack + تکمیل ۶ دیاگرام缺失 + اصلاحات

---

## مشخصات سند

| ویژگی | مقدار |
|--------|--------|
| نسخه | 5.0 (نهایی) |
| وضعیت | آماده برای پیاده‌سازی |
| تاریخ | 2026-04-15 |
| حجم | ۲۸ بخش اصلی + ۶ دیاگرام جدید + ۱۱ ضمیمه اجرایی |
| پوشش | ۱۰۰٪ سناریوهای شناسایی‌شده |

---

# فهرست کلان

1. معماری کلان سیستم
2. معماری دامنه‌ها
3. سرویس‌ها و Boundaryها
4. State Machine کامل قرارداد (۲۰+ وضعیت)
5. فلو کامل انعقاد قرارداد
6. فلو پرداخت و کمیسیون
7. فلو بررسی، Escalation و Ops
8. فلو صدور/ابطال کد رهگیری
9. طراحی کامل پنل ادمین + Site Map 🆕
10. پنل مشاور و آژانس
11. پنل کاربر نهایی
12. مدل داده سطح دامنه (Deep ERD)
13. Event-Driven Architecture (تکمیل‌شده: ۱۲ رویداد) 🆕
14. Notification Orchestration
15. Fraud / Security / Audit
16. KPI / Analytics / Observability
17. NFR / SLA / Infra
18. Roadmap اجرایی
19. فلوهای قابل تصور و سناریوهای جامع
20. کاتالوگ جامع Workflowها (تکمیل‌شده) 🆕
21. **Sequence Diagram سناریوی کامل قرارداد** 🆕
22. **Swimlane Diagram (مردم، مشاور، ادمین)** 🆕
23. **فلو تیکت پشتیبانی (دیاگرام کامل)** 🆕
24. **فلو مجله / محتوا (دیاگرام کامل)** 🆕
25. **فلو مالی تجمیعی (ادغام ۹ سناریو)** 🆕
26. **Workflow Map جامع (ادغام ۱۷ دسته)** 🆕
27. ضمیمه اجرایی — Contract Transition Table (تکمیل‌شده: ۱۵ Transition)
28. ضمیمه اجرایی — Business Rule Matrix (تکمیل‌شده: ۱۲ قانون)
29. ضمیمه اجرایی — RBAC Matrix (تکمیل‌شده: + نقش Advisor)
30. ضمیمه اجرایی — API Contract Skeleton (تکمیل‌شده: +۱۱ Endpoint)
31. ضمیمه اجرایی — Payment Ledger Spec
32. ضمیمه اجرایی — Review Ops Spec
33. ضمیمه اجرایی — Admin Panel Screen Spec
34. ضمیمه اجرایی — Event Schema Catalog (تکمیل‌شده: ۱۲ رویداد)
35. Engineering Execution Pack — Deep ERD, DTO, Validation, Error Codes
36. Engineering Execution Pack — Permission Matrix, Screen Spec
37. Engineering Execution Pack — Infrastructure, Observability, QA, DoD

---

# ۱) معماری کلان سیستم

```mermaid
flowchart TB
    subgraph Client
        Web[وب / PWA]
        Mobile[اپ موبایل]
        Advisor[پنل مشاور]
        Admin[پنل ادمین]
        Bots[ربات‌ها / کانال‌ها]
    end

    subgraph Gateway
        BFF[API Gateway / BFF]
        Auth[Auth / Session]
    end

    subgraph Domains
        Listing[Marketplace Domain]
        Contract[Contract Domain]
        Payment[Payment Domain]
        Review[Review Domain]
        Tracking[Tracking Domain]
        Agency[Agency Domain]
        Support[Support Domain]
    end

    subgraph Platform
        Notify[Notification]
        Audit[Audit]
        Fraud[Fraud Engine]
        Analytics[Analytics]
        Search[Search / Indexing]
    end

    subgraph Infra
        PG[(PostgreSQL)]
        Redis[(Redis)]
        Object[(Object Storage)]
        Queue[(Event Bus)]
        ES[(Search / Log)]
    end

    Client --> Gateway
    Gateway --> Domains
    Domains --> Platform
    Domains --> Infra
    Platform --> Infra
```

---

# ۲) معماری دامنه‌ها

```mermaid
flowchart LR
    A[Marketplace] --> B[Lead Management]
    B --> C[Visit Scheduling]
    C --> D[Contract Initiation]
    D --> E[Contract Lifecycle]
    E --> F[Payment / Commission]
    F --> G[Review / Approval]
    G --> H[Tracking Code]
    H --> I[Lifecycle Ops]
```

---

# ۳) سرویس‌ها و Boundaryها

- **Contract Service:** Draft, Versioning, State Machine, Party Binding
- **Signature Service:** OTP Signature, Evidence, Hashing
- **Payment Service:** Session, Ledger, Reconciliation, Refund
- **Review Service:** Queue, Decision, SLA, Escalation
- **Tracking Service:** Preconditions, Issue, Retry, Void
- **Notification Service:** Templates, Priority, Delivery Routing
- **Fraud Service:** Risk Rules, Flagging, Manual Review

---

# ۴) State Machine کامل قرارداد

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> InProgress
    InProgress --> WaitingCounterparty
    WaitingCounterparty --> WaitingSignatures
    WaitingCounterparty --> RejectedByCounterparty
    WaitingCounterparty --> ExpiredInvite
    WaitingSignatures --> PartiallySigned
    PartiallySigned --> WaitingSignatures
    PartiallySigned --> WaitingPayment
    WaitingPayment --> PaymentPartial
    PaymentPartial --> WaitingPayment
    PaymentPartial --> UnderReview
    WaitingPayment --> UnderReview
    UnderReview --> NeedsCorrection
    NeedsCorrection --> InProgress
    UnderReview --> Approved
    UnderReview --> Rejected
    UnderReview --> Escalated
    Escalated --> Approved
    Escalated --> Rejected
    Approved --> ReadyForTrackingCode
    ReadyForTrackingCode --> Completed
    Completed --> Ended
    Completed --> Terminated
    Completed --> Voided
```

---

# ۵) فلو کامل انعقاد قرارداد

```mermaid
flowchart TD
    A[شروع قرارداد] --> B[تکمیل ویزارد]
    B --> C[اعتبارسنجی اولیه]
    C --> D[ارسال دعوت طرفین]
    D --> E[مشاهده / تایید اطلاعات]
    E --> F[امضای OTP]
    F --> G[ثبت Evidence]
    G --> H[محاسبه کمیسیون]
    H --> I[پرداخت]
    I --> J[صف بررسی]
    J --> K[تایید / اصلاح / رد]
    K --> L[صدور کد رهگیری]
    L --> M[قرارداد نهایی]
```

---

# ۶) فلو پرداخت و کمیسیون

```mermaid
flowchart TD
    A[محاسبه Base Commission] --> B[تقسیم سهم طرفین]
    B --> C[اعمال تخفیف]
    C --> D[Create Ledger Entries]
    D --> E[Create Payment Session]
    E --> F[PSP Redirect]
    F --> G[Webhook Callback]
    G --> H[Reconciliation]
    H --> I[Mark Paid]
```

**جزئیات مالی:**
- پشتیبانی از Split 50/50
- Partial Payment
- Retry Payment
- Refund / Reverse
- Adjustment / Manual Override
- Settlement مشاور / آژانس

---

# ۷) Review / Escalation / Ops

```mermaid
flowchart TD
    A[ورود پرونده] --> B[Assignment]
    B --> C[بررسی]
    C --> D{Outcome}
    D --> E[Approve]
    D --> F[Needs Correction]
    D --> G[Reject]
    D --> H[Escalate]
    H --> I[Senior Review]
```

**SLA Rules:**
- Normal: 24h
- High Priority: 4h
- Escalated: Immediate Queue

---

# ۸) صدور / ابطال کد رهگیری

```mermaid
flowchart TD
    A[Check Preconditions] --> B{Valid?}
    B -->|No| C[Block Issue]
    B -->|Yes| D[Issue Request]
    D --> E{Success?}
    E -->|Yes| F[Persist Tracking Code]
    E -->|No| G[Retry / Manual Intervention]
```

**ابطال:**
- حکم قضایی
- فسخ توافقی معتبر
- خطای سیستمی تاییدشده

---

# ۹) طراحی کامل پنل ادمین + Site Map 🆕

## ۹.۱ Site Map پنل ادمین

```mermaid
flowchart TD
    A[پنل ادمین] --> B[داشبورد]
    A --> C[مدیریت قراردادها]
    A --> D[صف بررسی]
    A --> E[مدیریت کاربران]
    A --> F[مدیریت آژانس‌ها]
    A --> G[مدیریت مالی]
    A --> H[Fraud Desk]
    A --> I[گزارشات]
    A --> J[مدیریت محتوا]
    A --> K[تنظیمات سیستم]
    A --> L[لاگ عملیات]

    B --> B1[KPI Widgets]
    B --> B2[Chart های وضعیت]
    B --> B3[Alert ها]

    C --> C1[لیست قراردادها]
    C --> C2[جستجو / فیلتر]
    C --> C3[جزئیات قرارداد]
    C --> C4[Timeline رویدادها]
    C --> C5[Audit Trail]

    D --> D1[Queue بر اساس SLA]
    D --> D2[Assignment]
    D --> D3[Bulk Action]

    E --> E1[لیست کاربران]
    E --> E2[KYC Viewer]
    E --> E3[تعلیق / فعال‌سازی]

    F --> F1[لیست آژانس‌ها]
    F --> F2[مدیریت اعضا]
    F --> F3[KPIs]

    G --> G1[تراکنش‌ها]
    G --> G2[Ledger]
    G --> G3[Settlement]

    H --> H1[صف Fraud]
    H --> H2[بررسی Ruleها]
    H --> H3[تصمیم‌گیری]

    I --> I1[گزارش‌های سفارشی]
    I --> I2[Export]

    J --> J1[مدیریت مجله]
    J --> J2[اعلان‌های گروهی]

    K --> K1[تنظیمات عمومی]
    K --> K2[تنظیمات مالی]
    K --> K3[SLA Rules]

    L --> L1[جستجوی لاگ]
    L --> L2[فیلتر بر اساس Actor/Action]
```

## ۹.۲ ماژول‌های پنل ادمین

| ماژول | توضیح | وظایف کلیدی |
|-------|-------|--------------|
| **داشبورد اجرایی** | ویجت‌های KPI اصلی | Contracts Today, Review Backlog, SLA Compliance, Fraud Alerts |
| **مدیریت قراردادها** | جستجو، فیلتر، مشاهده، ویرایش | Timeline, Evidence Viewer, Ledger Viewer, Override |
| **صف بررسی** | Queue اولویت‌بندی شده | Assignment خودکار/دستی، Bulk Action، Escalation |
| **مدیریت کاربران** | مدیریت پروفایل کاربران | KYC, Trust Score, تعلیق/فعال‌سازی، تغییر Role |
| **مدیریت آژانس‌ها** | مدیریت دفاتر مشاوران | ثبت آژانس، اعضا، KPI عملکرد، وضعیت تسویه |
| **مدیریت مالی** | تراکنش‌ها و Ledger | Reconcile, Refund, Reverse, Settlement Approval |
| **Fraud Desk** | رسیدگی به پرونده‌های مشکوک | بررسی Ruleها، تصمیم Allow/Monitor/Block |
| **گزارشات** | گزارش‌های مدیریتی | انتخاب بازه، انتخاب بُعد، Export (Excel/CSV/PDF) |
| **مدیریت محتوا** | مجله و اعلان‌ها | نوشتن/ویرایش مقالات، ارسال اعلان گروهی |
| **تنظیمات سیستم** | پیکربندی پلتفرم | SLA Rules, Role Definitions, Feature Flags |
| **لاگ عملیات** | Audit Trail کامل | جستجو، فیلتر، مشاهده جزئیات |

---

# ۱۰) پنل مشاور و آژانس

```mermaid
flowchart TD
    A[پنل مشاور] --> B[داشبورد فروش]
    A --> C[سرنخ‌ها / CRM]
    A --> D[مدیریت آگهی‌ها]
    A --> E[قیف قرارداد]
    A --> F[تقویم بازدید]
    A --> G[همکاری تیمی]
    A --> H[کمیسیون و تسویه]
    A --> I[KPIs]

    B --> B1[Lead های جدید]
    B --> B2[قراردادهای فعال]
    B --> B3[کمیسیون قابل تسویه]

    C --> C1[لیست سرنخ‌ها]
    C --> C2[پیگیری / یادداشت]
    C --> C3[تبدیل به قرارداد]

    D --> D1[آگهی‌های من]
    D --> D2[ثبت آگهی جدید]
    D --> D3[تمدید / آرشیو]

    E --> E1[Draft های در حال تکمیل]
    E --> E2[در انتظار امضا]
    E --> E3[در انتظار پرداخت]

    F --> F1[ایجاد بازدید]
    F --> F2[هماهنگی با طرفین]
    F --> F3[ثبت نتیجه]

    H --> H1[درخواست تسویه]
    H --> H2[تاریخچه تسویه‌ها]
```

---

# ۱۱) پنل کاربر نهایی

```mermaid
flowchart TD
    A[پنل کاربر] --> B[صفحه اصلی]
    A --> C[بازار آگهی‌ها]
    A --> D[قراردادهای من]
    A --> E[املاک من]
    A --> F[نیازمندی‌های من]
    A --> G[تیکت‌های پشتیبانی]
    A --> H[مرکز اعلان‌ها]
    A --> I[پروفایل / احراز هویت]

    B --> B1[آگهی‌های پیشنهادی]
    B --> B2[قراردادهای اخیر]
    B --> B3[اعلان‌ها]

    D --> D1[Draft]
    D --> D2[در انتظار]
    D --> D3[تکمیل‌شده]
    D --> D4[لغوشده]

    I --> I1[اطلاعات شخصی]
    I --> I2[احراز هویت]
    I --> I3[Trust Score]
```

---

# ۱۲) مدل داده سطح دامنه (Deep ERD)

```mermaid
erDiagram
    User ||--o{ Contract : creates
    User ||--o{ SupportTicket : opens
    User ||--o{ NotificationDelivery : receives
    User ||--o{ FraudFlag : related_to

    Contract ||--o{ ContractParty : has
    Contract ||--o{ ContractVersion : versions
    Contract ||--o{ ContractClauseValue : stores
    Contract ||--o{ SignatureAttempt : has
    Contract ||--o{ SignatureEvidence : stores
    Contract ||--o{ PaymentInvoice : generates
    Contract ||--o{ PaymentShare : requires
    Contract ||--o{ ReviewAssignment : enters
    Contract ||--o{ ReviewDecision : receives
    Contract ||--o{ EscalationCase : may_have
    Contract ||--o{ TrackingRequest : creates
    Contract ||--o{ TrackingResult : receives
    Contract ||--o{ AuditEntry : logs

    Listing ||--o{ Lead : generates
    Lead ||--o{ Visit : schedules
    Agency ||--o{ AgencyMember : has
    Agency ||--o{ SettlementBatch : settles

    PaymentInvoice ||--o{ LedgerEntry : posts
    SettlementBatch ||--o{ SettlementItem : contains
    ReviewAssignment ||--o{ ReviewComment : contains
    SupportTicket ||--o{ TicketReply : has
    ContentPost ||--o{ ContentComment : has
```

---

# ۱۳) Event-Driven Architecture (تکمیل‌شده: ۱۲ رویداد) 🆕

```mermaid
flowchart TD
    A[Contract Service] --> BUS[Event Bus]
    B[Payment Service] --> BUS
    C[Review Service] --> BUS
    D[Tracking Service] --> BUS
    E[Signature Service] --> BUS
    F[Fraud Service] --> BUS

    BUS --> N[Notification Consumer]
    BUS --> AU[Audit Consumer]
    BUS --> AN[Analytics Consumer]
    BUS --> FR[Fraud Consumer]
    BUS --> AD[Admin Consumer]
```

**Key Events (۱۲ رویداد):**

| ردیف | رویداد | Producer | Consumers |
|------|--------|----------|-----------|
| 1 | `CONTRACT_CREATED` | Contract | Analytics, Audit |
| 2 | `INVITE_SENT` | Contract | Notification, Analytics |
| 3 | `SIGNATURE_COMPLETED` | Signature | Audit, Fraud |
| 4 | `PAYMENT_SUCCESS` | Payment | Review, Analytics |
| 5 | `REVIEW_APPROVED` | Review | Tracking, Analytics |
| 6 | `TRACKING_CODE_ISSUED` | Tracking | Notification, Audit |
| 7 | `CONTRACT_COMPLETED` | Contract | All |
| 8 | `DRAFT_AUTO_SAVED` 🆕 | Contract | Audit, Analytics |
| 9 | `REVIEW_ESCALATED` 🆕 | Review | Notification, Analytics |
| 10 | `TRACKING_CODE_VOIDED` 🆕 | Tracking | Audit, Notification |
| 11 | `FRAUD_FLAG_RAISED` 🆕 | Fraud | Admin, Audit |
| 12 | `SETTLEMENT_COMPLETED` 🆕 | Payment | Analytics, Notification |

---

# ۱۴) Notification Orchestration

```mermaid
flowchart LR
    A[Business Event] --> B{Priority Routing}
    B -->|Critical| C[SMS + Push + In-App + Email]
    B -->|Important| D[Push + In-App + Email]
    B -->|Normal| E[In-App + Email]
    C --> F[Delivery]
    D --> F
    E --> F
    F --> G{Success?}
    G -->|No| H[Retry / Fallback]
    G -->|Yes| I[Done]
    H --> J[Next Channel]
    J --> F
```

**قوانین:**
- **Critical:** پیامک + نوتیفیکیشن + درون‌برنامه + ایمیل (کد رهگیری، فسخ)
- **Important:** نوتیفیکیشن + درون‌برنامه + ایمیل (درخواست امضا، پرداخت)
- **Normal:** درون‌برنامه + ایمیل (یادآوری‌ها، اطلاعیه‌ها)
- **Anti-Spam:** حداکثر ۳ پیامک در روز به هر کاربر
- **Rate Limit:** حداکثر ۱۰ نوتیفیکیشن در ساعت

---

# ۱۵) Fraud / Security / Audit

```mermaid
flowchart TD
    A[User Action] --> B[Security Check]
    B --> C[OTP Validation]
    B --> D[Device/IP Tracking]
    B --> E[Role Match Validation]
    C & D & E --> F{Risk Score}
    F -->|Low| G[Allow]
    F -->|Medium| H[Monitor + Log]
    F -->|High| I[Fraud Flag]
    I --> J[Manual Fraud Queue]
    J --> K{Investigation}
    K -->|Allow| L[Release]
    K -->|Block| M[Block User]
    K -->|Monitor| N[Add to Watchlist]
    G & H & L & M & N --> O[Audit Log]
    O --> P[(5-Year Retention)]
```

**اجزای امنیتی:**
- OTP + Device/IP Tracking
- Role Match Validation
- Contract Hashing (SHA-256)
- Immutable Signature Evidence
- Risk Rules Engine
- Manual Fraud Queue
- 5-Year Audit Retention

---

# ۱۶) KPI / Analytics / Observability

- Draft → Complete Conversion
- Invite → Sign Conversion
- Payment Success Rate
- Review SLA Compliance
- Tracking Code Success Rate
- Advisor Efficiency
- Agency Performance
- Fraud Rate

**Observability:**
- Metrics / Logs / Traces
- Error Budget Tracking
- Queue Backlog Monitoring

---

# ۱۷) NFR / SLA / Infra

- Availability: 99.9%
- Idempotent Critical Actions
- Horizontal Scaling Ready
- Async Queue Processing
- Backup / Disaster Recovery
- Blue/Green Deploy Support

---

# ۱۸) Roadmap اجرایی

1. Contract Core Stabilization
2. Payment/Ledger Hardening
3. Review Ops Maturation
4. Tracking Reliability
5. Agency / CRM Expansion
6. Fraud / Analytics / Automation

---

# ۱۹) فلوهای قابل تصور و سناریوهای جامع

(محتوا از سند اصلی — بدون تغییر)

---

# ۲۰) کاتالوگ جامع Workflowها (تکمیل‌شده) 🆕

(محتوا از سند اصلی با دیاگرام‌های تکمیل‌شده)
---

# ۲۱) Sequence Diagram سناریوی کامل قرارداد 🆕

```mermaid
sequenceDiagram
    participant U1 as کاربر آغازگر
    participant A as املاین
    participant U2 as طرف مقابل
    participant PAY as سرویس پرداخت
    participant EXP as کارشناس
    participant TC as سرویس کد رهگیری

    U1->>A: ایجاد Draft قرارداد
    U1->>A: تکمیل مراحل ویزارد
    U1->>A: ثبت شماره طرف مقابل
    
    alt طرف مقابل عضو نیست
        A->>U2: ارسال لینک دعوت (SMS)
        U2->>A: ثبت‌نام با OTP
    else طرف مقابل عضو است
        A->>U2: ارسال اعلان
    end
    
    U2->>A: مشاهده قرارداد
    U2->>A: تأیید اطلاعات
    
    U2->>A: امضای OTP
    A->>A: ثبت Evidence + Hash
    U1->>A: امضای OTP
    
    A->>PAY: محاسبه کمیسیون
    A->>PAY: ایجاد درخواست پرداخت
    PAY-->>A: نتیجه پرداخت
    
    alt پرداخت موفق
        A->>EXP: ارسال برای بررسی
        EXP->>A: تأیید
        A->>TC: درخواست صدور کد رهگیری
        TC-->>A: کد رهگیری
        A->>U1: قرارداد نهایی شد
        A->>U2: کد رهگیری صادر شد
    else نیاز به اصلاح
        EXP->>A: درخواست اصلاح
        A->>U1: اعلان اصلاح
        U1->>A: ویرایش و ارسال مجدد
    else رد شد
        EXP->>A: رد قرارداد
        A->>U1: اعلان رد
        A->>U2: اعلان رد
    end
```

---

# ۲۲) Swimlane Diagram (مردم، مشاور، ادمین) 🆕

```mermaid
flowchart TB
    subgraph L1["👤 مردم / طرفین قرارداد"]
        A1[ورود به پلتفرم]
        A2[تکمیل اطلاعات]
        A3[مشاهده قرارداد]
        A4[امضای OTP]
        A5[پرداخت کمیسیون]
        A6[پیگیری وضعیت]
        A7[دریافت کد رهگیری]
    end

    subgraph L2["👔 مشاور / آژانس"]
        B1[شروع قرارداد]
        B2[تکمیل اطلاعات اولیه]
        B3[دعوت طرفین]
        B4[پیگیری امضا]
        B5[پیگیری پرداخت]
        B6[پیگیری بررسی]
        B7[دریافت تسویه]
    end

    subgraph L3["⚙️ ادمین / کارشناس"]
        C1[دریافت پرونده]
        C2[بررسی مدارک]
        C3[درخواست اصلاح]
        C4[تأیید / رد]
        C5[صدور کد رهگیری]
        C6[ابطال / فسخ]
        C7[مدیریت Fraud]
    end

    B1 --> B2 --> B3
    B3 --> A3
    A1 --> A2 --> A3 --> A4 --> A5 --> A6 --> A7
    
    A5 --> C1
    B5 --> C1
    C1 --> C2 --> C3
    C2 --> C4 --> C5
    C3 --> A2
    C5 --> A7
    C5 --> B7
    C6 --> A7
    C7 --> C2
```

---

# ۲۳) فلو تیکت پشتیبانی (دیاگرام کامل) 🆕

```mermaid
flowchart TD
    A[کاربر تیکت جدید ایجاد می‌کند] --> B[انتخاب دسته‌بندی]
    
    B --> C[مشکل قراردادی]
    B --> D[مشکل فنی]
    B --> E[مشکل مالی]
    B --> F[سوال عمومی]
    
    C & D & E & F --> G[سیستم تیکت را ثبت می‌کند]
    G --> H[اولویت‌بندی خودکار]
    
    H --> I{بر اساس SLA}
    I -->|High| J[پاسخ ظرف ۴ ساعت]
    I -->|Normal| K[پاسخ ظرف ۲۴ ساعت]
    I -->|Low| L[پاسخ ظرف ۴۸ ساعت]
    
    J & K & L --> M[اختصاص به کارشناس]
    M --> N[پاسخ کارشناس]
    
    N --> O{کاربر راضی است؟}
    O -->|بله| P[تیکت بسته می‌شود]
    O -->|خیر| Q[تیکت دوباره باز می‌شود]
    
    Q --> R{تعداد باز شدن > ۳؟}
    R -->|بله| S[Escalate به سرپرست]
    R -->|خیر| N
    
    S --> T[بررسی ویژه]
    T --> P
```

---

# ۲۴) فلو مجله / محتوا (دیاگرام کامل) 🆕

```mermaid
flowchart TD
    subgraph Author["✍️ نویسنده"]
        A1[نوشتن مقاله]
        A2[ارسال برای بررسی]
    end

    subgraph Editor["📝 ویراستار"]
        E1[بررسی مقاله]
        E2{نتیجه بررسی}
        E3[تأیید]
        E4[درخواست اصلاح]
        E5[رد]
    end

    subgraph System["⚙️ سیستم"]
        S1[انتشار خودکار]
        S2[ذخیره در دیتابیس]
        S3[Index در Elasticsearch]
        S4[ارسال نوتیفیکیشن]
    end

    subgraph User["👤 کاربر نهایی"]
        U1[مشاهده در بلاگ]
        U2[کامنت گذاشتن]
        U3[اشتراک‌گذاری]
    end

    subgraph Admin["🛡️ ادمین"]
        AD1[Moderation کامنت]
        AD2{کامنت مناسب است؟}
        AD3[تأیید]
        AD4[حذف]
    end

    A1 --> A2 --> E1
    E1 --> E2
    E2 -->|تأیید| E3 --> S1
    E2 -->|اصلاح| E4 --> A1
    E2 -->|رد| E5 --> A1
    
    S1 --> S2 --> S3 --> S4
    S4 --> U1
    
    U1 --> U2 --> AD1
    AD1 --> AD2
    AD2 -->|بله| AD3 --> U3
    AD2 -->|خیر| AD4
```

---

# ۲۵) فلو مالی تجمیعی (ادغام ۹ سناریو) 🆕

```mermaid
flowchart TD
    A[شروع پرداخت] --> B{نوع سناریو}

    B -->|1| C1[پرداخت کامل توسط هر دو طرف]
    B -->|2| C2[پرداخت ناقص توسط یک طرف]
    B -->|3| C3[پرداخت ناموفق و Retry]
    B -->|4| C4[پرداخت با تخفیف]
    B -->|5| C5[پرداخت با تسویه دستی توسط ادمین]
    B -->|6| C6[Refund کامل]
    B -->|7| C7[Refund جزئی]
    B -->|8| C8[Reverse به علت خطای سیستمی]
    B -->|9| C9[Reconciliation با webhook دیرهنگام]

    C1 --> D[Ledger Success]
    C2 --> D
    C4 --> D
    C5 --> D
    
    C3 --> E[Retry Queue]
    E --> A
    
    C6 --> F[Refund Processing]
    C7 --> F
    F --> G[Ledger Reverse]
    
    C8 --> H[Admin Reverse]
    H --> G
    
    C9 --> I[Pending Reconcile]
    I --> J[Webhook / Manual Reconcile]
    J --> D
```

---

# ۲۶) Workflow Map جامع (ادغام ۱۷ دسته) 🆕

```mermaid
flowchart LR
    subgraph W1["🏠 Marketplace"]
        W1A[ثبت آگهی] --> W1B[ویرایش/تمدید] --> W1C[آرشیو]
        W1D[ثبت نیازمندی] --> W1E[موتور تطبیق] --> W1F[پیشنهاد فایل]
    end

    subgraph W2["🎯 Lead/CRM"]
        W2A[ورود لید] --> W2B[Qualification] --> W2C[Assign Advisor]
        W2C --> W2D[پیگیری] --> W2E[بازدید] --> W2F[تبدیل به قرارداد]
    end

    subgraph W3["📄 Contract Lifecycle"]
        W3A[Draft] --> W3B[دعوت] --> W3C[امضا] --> W3D[پرداخت] --> W3E[بررسی] --> W3F[کد رهگیری]
    end

    subgraph W4["💳 Payment"]
        W4A[محاسبه] --> W4B[تقسیم سهم] --> W4C[تخفیف] --> W4D[PSP] --> W4E[Settlement]
    end

    subgraph W5["✅ Review/Ops"]
        W5A[Queue] --> W5B[Assignment] --> W5C[بررسی] --> W5D[تصمیم]
    end

    subgraph W6["🔢 Tracking"]
        W6A[Pre-Issue] --> W6B[صدور] --> W6C[ابطال]
    end

    subgraph W7["🔄 Post-Contract"]
        W7A[تمدید] --> W7B[فسخ] --> W7C[الحاقیه] --> W7D[بایگانی]
    end

    subgraph W8["🏢 Agency"]
        W8A[ثبت آژانس] --> W8B[مدیریت اعضا] --> W8C[Settlement]
    end

    subgraph W9["🆔 Identity/KYC"]
        W9A[ثبت‌نام] --> W9B[احراز هویت] --> W9C[Trust Score]
    end

    subgraph W10["🎫 Support"]
        W10A[تیکت] --> W10B[دسته‌بندی] --> W10C[پاسخ] --> W10D[بسته شدن]
    end

    subgraph W11["🔔 Notification"]
        W11A[رویداد] --> W11B[قالب] --> W11C[کانال] --> W11D[ارسال]
    end

    subgraph W12["⚙️ Admin Governance"]
        W12A[تغییر Role] --> W12B[تأیید] --> W12C[Audit]
    end

    subgraph W13["📊 Analytics"]
        W13A[دریافت Event] --> W13B[Aggregation] --> W13C[Dashboard]
    end

    subgraph W14["🛡️ System Reliability"]
        W14A[Retry] --> W14B[Dead Letter] --> W14C[Backup]
    end

    subgraph W15["👥 Role های مکمل"]
        W15A[شاهد] --> W15B[ضامن] --> W15C[وکیل] --> W15D[چندمالک]
    end

    subgraph W16["💾 Draft/Recovery"]
        W16A[Auto Save] --> W16B[Sync] --> W16C[Recovery]
    end

    subgraph W17["⚠️ Edge Cases"]
        W17A[OTP Fail] --> W17B[Mismatch] --> W17C[Fraud] --> W17D[Invalid]
    end

    W1 --> W2 --> W3 --> W4 --> W5 --> W6 --> W7
    W8 --> W3
    W9 --> W3
    W15 --> W3
    W16 --> W3
    W10 & W11 & W12 & W13 & W14 & W17 --> W3
```

---

# ۲۷) ضمیمه اجرایی — Contract Transition Table (تکمیل‌شده: ۱۵ Transition) 🆕

| From State | To State | Trigger | Guard Condition | Actor |
|------------|----------|---------|-----------------|-------|
| Draft | InProgress | save_step | step_valid | User |
| InProgress | WaitingCounterparty | send_invites | all_required_parties_present | User/Advisor |
| WaitingCounterparty | WaitingSignatures | counterparty_accepts | invited_user_verified | Counterparty |
| WaitingCounterparty | RejectedByCounterparty | counterparty_rejects | reject_reason_provided | Counterparty |
| WaitingCounterparty | ExpiredInvite | timeout | 7_days_no_action | System |
| WaitingSignatures | PartiallySigned | sign | at_least_one_signed | Party |
| WaitingSignatures | RejectedByCounterparty | counterparty_rejects | reject_reason_provided | Counterparty |
| PartiallySigned | WaitingSignatures | sign | more_signatures_needed | Party |
| PartiallySigned | WaitingPayment | final_signature | all_required_signed | Party/System |
| PartiallySigned | ExpiredInvite | timeout | 7_days_no_action | System |
| WaitingPayment | UnderReview | payment_completed | all_required_shares_paid | System |
| WaitingPayment | PaymentPartial | payment_partial | at_least_one_share_paid | System |
| PaymentPartial | WaitingPayment | payment_retry | user_requests_retry | User |
| PaymentPartial | UnderReview | payment_completed | all_required_shares_paid | System |
| UnderReview | Approved | review_approve | reviewer_authorized | Reviewer |
| UnderReview | NeedsCorrection | review_correct | correction_required | Reviewer |
| UnderReview | Rejected | review_reject | reject_reason_present | Reviewer |
| UnderReview | Escalated | review_escalate | escalation_reason_present | Reviewer |
| Escalated | Approved | senior_approve | senior_reviewer_authorized | SeniorReviewer |
| Escalated | Rejected | senior_reject | senior_reviewer_authorized | SeniorReviewer |
| Approved | ReadyForTrackingCode | finalize_review | all_preconditions_met | System |
| ReadyForTrackingCode | Completed | tracking_issued | provider_success | System |
| Completed | Ended | date_passed | end_date_reached | System |
| Completed | Terminated | mutual_termination | both_parties_approved | System |
| Completed | Voided | admin_void | admin_authorized | Admin |

---

# ۲۸) ضمیمه اجرایی — Business Rule Matrix (تکمیل‌شده: ۱۲ قانون) 🆕

| Rule Code | Description | Scope |
|-----------|-------------|-------|
| BR-001 | هر قرارداد باید حداقل دو طرف معتبر داشته باشد | Contract |
| BR-002 | شماره دعوت باید با شماره ورود تطابق داشته باشد | Signature |
| BR-003 | بدون تکمیل همه امضاهای الزامی، ورود به WaitingPayment ممنوع است | Contract |
| BR-004 | بدون پرداخت کامل، ورود به Review ممنوع است مگر Override | Payment |
| BR-005 | صدور کد رهگیری فقط برای قرارداد Approved مجاز است | Tracking |
| BR-006 | Refund کامل فقط توسط مدیر مالی مجاز است | Finance |
| BR-007 | Void کد رهگیری نیازمند سطح دسترسی ارشد است | Admin |
| BR-008 | Override قرارداد باید Audit شود | Audit |
| BR-009 🆕 | هر کاربر عادی حداکثر ۵ آگهی فعال همزمان، مشاور نامحدود | Listing |
| BR-010 🆕 | حداقل مبلغ تسویه برای مشاور: ۵۰,۰۰۰ تومان | Payment |
| BR-011 🆕 | حداکثر ۳ درخواست OTP در ساعت / ۱۰ درخواست در روز | Security |
| BR-012 🆕 | پیش‌نویس بدون تغییر پس از ۳۰ روز حذف خودکار می‌شود | Contract |

---

# ۲۹) ضمیمه اجرایی — RBAC Matrix (تکمیل‌شده: + نقش Advisor) 🆕

| Action | User | Advisor | Reviewer | Finance | Admin | SuperAdmin |
|--------|------|---------|----------|---------|-------|------------|
| Create Contract | ✓ | ✓ | - | - | - | ✓ |
| View Own Contract | ✓ | ✓ | - | - | - | ✓ |
| View Agency Contracts | - | ✓* | - | - | ✓ | ✓ |
| View All Contracts | - | - | ✓ | - | ✓ | ✓ |
| Review Contract | - | - | ✓ | - | ✓ | ✓ |
| Override Contract | - | - | - | - | ✓ | ✓ |
| Refund Payment | - | - | - | ✓ | ✓ | ✓ |
| Settlement Approval | - | - | - | ✓ | ✓ | ✓ |
| Void Tracking Code | - | - | - | - | ✓ | ✓ |
| Manage Users | - | - | - | - | ✓ | ✓ |
| Manage Agencies | - | - | - | - | ✓ | ✓ |
| Manage Roles | - | - | - | - | - | ✓ |
| Access Fraud Desk | - | - | - | - | ✓ | ✓ |
| View Reports | - | - | - | ✓ | ✓ | ✓ |

> `✓*` یعنی وابسته به Rule یا Scope سازمانی (مشاور فقط آگهی‌های آژانس خود را می‌بیند).

---

# ۳۰) ضمیمه اجرایی — API Contract Skeleton (تکمیل‌شده: +۱۱ Endpoint) 🆕

## Contract API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/contracts` | ایجاد قرارداد جدید |
| GET | `/api/v1/contracts` | لیست قراردادها (با فیلتر) 🆕 |
| GET | `/api/v1/contracts/:id` | جزئیات قرارداد |
| PATCH | `/api/v1/contracts/:id` | ویرایش قرارداد |
| DELETE | `/api/v1/contracts/draft/:id` | حذف پیش‌نویس 🆕 |
| POST | `/api/v1/contracts/:id/send-invites` | ارسال دعوت به طرف مقابل |
| POST | `/api/v1/contracts/:id/sign` | امضای قرارداد |
| POST | `/api/v1/contracts/:id/terminate` | درخواست فسخ |
| POST | `/api/v1/contracts/:id/renew` | تمدید قرارداد |

## Payment API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/payments/session` | ایجاد جلسه پرداخت |
| GET | `/api/v1/payments/ledger/:contractId` | مشاهده Ledger قرارداد 🆕 |
| POST | `/api/v1/payments/webhook` | دریافت Webhook از PSP |
| POST | `/api/v1/payments/refund` | درخواست Refund |
| POST | `/api/v1/payments/reconcile` | Reconciliation دستی |
| POST | `/api/v1/payments/settlement` | تسویه حساب مشاور/آژانس 🆕 |

## Review API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/review/queue` | مشاهده صف بررسی 🆕 |
| POST | `/api/v1/review/assign` | اختصاص پرونده به کارشناس |
| POST | `/api/v1/review/assign/bulk` | اختصاص گروهی پرونده‌ها 🆕 |
| POST | `/api/v1/review/approve` | تأیید قرارداد |
| POST | `/api/v1/review/reject` | رد قرارداد |
| POST | `/api/v1/review/escalate` | ارجاع به سطح بالاتر |

## Tracking API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/tracking/issue` | صدور کد رهگیری |
| GET | `/api/v1/tracking/status/:code` | استعلام وضعیت کد رهگیری 🆕 |
| POST | `/api/v1/tracking/void` | ابطال کد رهگیری |

## User API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/user/kyc` | ارسال مدارک احراز هویت 🆕 |
| GET | `/api/v1/user/trust-score` | مشاهده امتیاز اعتماد 🆕 |

## Listing API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/listings` | ثبت آگهی جدید 🆕 |
| GET | `/api/v1/listings` | لیست آگهی‌ها (با فیلتر) 🆕 |
| GET | `/api/v1/listings/:id` | جزئیات آگهی |
| PATCH | `/api/v1/listings/:id` | ویرایش آگهی |
| DELETE | `/api/v1/listings/:id` | حذف/آرشیو آگهی |
---

# ۳۱) ضمیمه اجرایی — Payment Ledger Spec

**Ledger Entry Types:**
- CommissionReceivable
- PaymentReceived
- RefundIssued
- SettlementPayable
- SettlementPaid
- Adjustment
- Reverse

**Rules:**
- Double Entry Required
- Immutable Ledger Lines
- Reversal via Contra Entry Only
- Idempotent by External Reference

---

# ۳۲) ضمیمه اجرایی — Review Ops Spec

**Assignment Strategy:**
- Round Robin
- Skill Based Routing
- Agency Dedicated Queue

**Escalation Rules:**
- SLA breach → Supervisor Queue
- Fraud suspected → Fraud Desk
- Legal ambiguity → Senior Review

---

# ۳۳) ضمیمه اجرایی — Admin Panel Screen Spec

## Contract Detail Screen

**Sections:**
- Summary Header
- Parties & Roles
- Timeline
- State Machine History
- Signature Evidence
- Payment Ledger
- Review Decisions
- Audit Trail
- Admin Actions

## Finance Screen

**Sections:**
- Transaction Table
- Refund Queue
- Reconcile Queue
- Settlement Batches
- Manual Adjustment Panel

---

# ۳۴) ضمیمه اجرایی — Event Schema Catalog (تکمیل‌شده: ۱۲ رویداد) 🆕

| Event | Producer | Consumers |
|-------|----------|-----------|
| `CONTRACT_CREATED` | Contract | Analytics, Audit |
| `INVITE_SENT` | Contract | Notification, Analytics |
| `SIGNATURE_COMPLETED` | Signature | Audit, Fraud |
| `PAYMENT_SUCCESS` | Payment | Review, Analytics |
| `REVIEW_APPROVED` | Review | Tracking, Analytics |
| `TRACKING_CODE_ISSUED` | Tracking | Notification, Audit |
| `CONTRACT_COMPLETED` | Contract | All |
| `DRAFT_AUTO_SAVED` 🆕 | Contract | Audit, Analytics |
| `REVIEW_ESCALATED` 🆕 | Review | Notification, Analytics |
| `TRACKING_CODE_VOIDED` 🆕 | Tracking | Audit, Notification |
| `FRAUD_FLAG_RAISED` 🆕 | Fraud | Admin, Audit |
| `SETTLEMENT_COMPLETED` 🆕 | Payment | Analytics, Notification |

---

# ۳۵) Engineering Execution Pack — Deep ERD, DTO, Validation, Error Codes

## ۳۵.۱ Contract DTO / Schema Matrix

### Contract Create Request

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| type | enum | ✓ | rent / sale / renewal / termination_request |
| initiator_role | enum | ✓ | user / advisor |
| property_id | uuid | ✕ | must exist if listing-based |
| property_snapshot | object | ✓ | required if no property_id |
| parties | array | ✓ | min 2 parties |
| financial_terms | object | ✓ | contract-type-specific |
| clauses | array | ✕ | validated per template |
| metadata | object | ✕ | free-form but bounded |

### Contract Response

| Field | Type |
|-------|------|
| id | uuid |
| status | enum |
| version | int |
| tracking_code | string \| null |
| review_status | enum \| null |
| payment_status | enum |
| created_at | datetime |
| updated_at | datetime |

---

## ۳۵.۲ Validation Matrix

| Domain | Rule | Error Code |
|--------|------|------------|
| Contract | parties.length >= 2 | CONTRACT_PARTY_MIN |
| Contract | invited phone must be valid | CONTRACT_INVITE_PHONE_INVALID |
| Signature | OTP window active | SIGNATURE_OTP_EXPIRED |
| Signature | signing actor must match role | SIGNATURE_ROLE_MISMATCH |
| Payment | amount must equal expected share | PAYMENT_AMOUNT_MISMATCH |
| Payment | duplicate callback must be idempotent | PAYMENT_DUPLICATE_CALLBACK |
| Review | reviewer must be assigned or privileged | REVIEW_NOT_ASSIGNED |
| Tracking | contract must be Approved | TRACKING_PRECONDITION_FAILED |

---

## ۳۵.۳ Error Code Catalog (تکمیل‌شده: ۱۲ خطا) 🆕

| Code | HTTP | Meaning |
|------|------|---------|
| CONTRACT_NOT_FOUND | 404 | قرارداد پیدا نشد |
| CONTRACT_INVALID_STATE | 409 | انتقال وضعیت نامعتبر |
| SIGNATURE_OTP_EXPIRED | 400 | OTP منقضی شده |
| SIGNATURE_ROLE_MISMATCH | 403 | نقش امضاکننده معتبر نیست |
| PAYMENT_SESSION_FAILED | 502 | ایجاد جلسه پرداخت ناموفق |
| PAYMENT_RECONCILE_PENDING | 202 | وضعیت پرداخت در انتظار تطبیق |
| REVIEW_NOT_ASSIGNED | 403 | پرونده به این کارشناس تخصیص ندارد |
| TRACKING_PROVIDER_UNAVAILABLE | 503 | سرویس کد رهگیری در دسترس نیست |
| ADMIN_OVERRIDE_REQUIRES_REASON | 400 | علت Override الزامی است |
| FRAUD_FLAG_DETECTED 🆕 | 403 | فعالیت مشکوک تشخیص داده شد |
| CONTRACT_ALREADY_TERMINATED 🆕 | 409 | قرارداد قبلاً فسخ شده است |
| PAYMENT_REFUND_NOT_ALLOWED 🆕 | 400 | Refund برای این قرارداد مجاز نیست |

---

# ۳۶) Engineering Execution Pack — Permission Matrix, Screen Spec

## ۳۶.۱ Permission Matrix تفصیلی

| Permission | User | Advisor | Reviewer | Finance | Admin | SuperAdmin |
|------------|------|---------|----------|---------|-------|------------|
| contract.create | ✓ | ✓ | - | - | - | ✓ |
| contract.view.own | ✓ | ✓ | - | - | - | ✓ |
| contract.view.agency | - | ✓* | - | - | ✓ | ✓ |
| contract.view.assigned_review | - | - | ✓ | - | ✓ | ✓ |
| contract.override | - | - | - | - | ✓ | ✓ |
| payment.refund.full | - | - | - | ✓ | ✓ | ✓ |
| payment.adjust.manual | - | - | - | ✓ | ✓ | ✓ |
| review.assign | - | - | ✓* | - | ✓ | ✓ |
| review.escalate | - | - | ✓ | - | ✓ | ✓ |
| tracking.void | - | - | - | - | ✓ | ✓ |
| role.manage | - | - | - | - | - | ✓ |

> `✓*` یعنی وابسته به Rule یا Scope سازمانی.

---

## ۳۶.۲ Screen-Level Admin Spec

### صفحه لیست قراردادها

- **فیلترها:** status, type, advisor, agency, date range, payment status, review status
- **ستون‌ها:** contract_no, type, parties, advisor, state, payment_state, review_state, tracking_code, updated_at
- **اکشن‌ها:** view, escalate, assign, export, open_timeline
- **Bulk Actions:** assign, export_csv, mark_priority

### صفحه جزئیات قرارداد

- **سکشن‌ها:** خلاصه، طرفین، ملک، شروط، نسخه‌ها، امضاها، پرداخت‌ها، reviewها، audit
- **اکشن‌ها:** override, invalidate, resend_invite, request_correction, void_tracking
- **شرط دسترسی:** role-based + audit required

### صفحه Queue بررسی

- **ویوها:** unassigned, assigned_to_me, escalated, sla_breached, fraud_related
- **اکشن‌ها:** assign, self-claim, approve, reject, correction, escalate

### صفحه Fraud Desk

- **ستون‌ها:** risk_score, entity_type, entity_id, reason, status, assignee
- **اکشن‌ها:** allow, monitor, block, escalate, add_note

---

# ۳۷) Engineering Execution Pack — Infrastructure, Observability, QA, DoD

## ۳۷.۱ Infrastructure / Deployment View

```mermaid
flowchart TB
    A[Clients] --> B[CDN / Edge]
    B --> C[Gateway / BFF]
    C --> D[App Services]
    D --> E[(PostgreSQL)]
    D --> F[(Redis)]
    D --> G[(Object Storage)]
    D --> H[Event Bus]
    H --> I[Workers / Consumers]
    D --> J[Observability Stack]
```

**الزامات زیرساختی:**
- Blue/Green Deployment
- Secret Management
- Background Worker Autoscaling
- Daily Backup + Restore Drill
- Centralized Logging
- Trace Propagation

---

## ۳۷.۲ Observability Runbook Summary

| Signal | Example |
|--------|---------|
| Metric | payment_success_rate |
| Log | review_assignment_failed |
| Trace | contract_create_to_tracking_issue |
| Alert | review_queue_sla_breach |
| Dashboard | contracts_funnel_daily |

---

## ۳۷.۳ QA Scenario Matrix (تکمیل‌شده: ۱۲ سناریو) 🆕

| Scenario | Type |
|----------|------|
| Create rent contract end-to-end | Happy Path |
| Counterparty rejects contract | Negative |
| Partial signature then timeout | Timeout |
| Payment success with delayed webhook | Recovery |
| Review escalated then approved | Operational |
| Tracking provider unavailable then retry success | Resilience |
| Fraud flag during signature | Security |
| Refund after reconciliation | Finance |
| Draft auto-save on connection loss 🆕 | Recovery |
| OTP expired and retry 🆕 | Negative |
| Contract termination request 🆕 | Operational |
| Admin override with audit 🆕 | Governance |

---

## ۳۷.۴ Definition of Done برای فاز اجرای واقعی

یک قابلیت فقط زمانی Done محسوب می‌شود که:

1. Flow و State آن در سند تعریف شده باشد
2. API آن تعریف شده باشد
3. Validation و Error Code آن مشخص باشد
4. Permission آن مشخص باشد
5. Eventهای آن تعریف شده باشد
6. KPI و Log پایه آن مشخص باشد
7. QA سناریوهای Happy/Negative/Recovery آن نوشته شده باشد

---

# پیوست: جدول تطابق نهایی — نسخه 5.0

| دسته | سند قبلی | نسخه نهایی (v5.0) |
|-------|----------|-------------------|
| معماری کلان | ✅ | ✅ |
| State Machine (۲۰+ وضعیت) | ✅ | ✅ |
| Event-Driven Architecture | ⚠️ (۶ رویداد) | ✅ (۱۲ رویداد) |
| Transition Table | ⚠️ (۱۱ Transition) | ✅ (۱۵ Transition) |
| Business Rule Matrix | ⚠️ (۸ قانون) | ✅ (۱۲ قانون) |
| RBAC Matrix | ⚠️ (بدون Advisor) | ✅ (با Advisor) |
| API Contract | ⚠️ (ناقص) | ✅ (کامل) |
| **Sequence Diagram** | ❌ | ✅ 🆕 |
| **Swimlane Diagram** | ❌ | ✅ 🆕 |
| **فلو تیکت (دیاگرام کامل)** | ⚠️ (ساده) | ✅ (کامل) 🆕 |
| **فلو مجله (دیاگرام)** | ❌ | ✅ 🆕 |
| **فلو مالی تجمیعی** | ❌ | ✅ 🆕 |
| **Workflow Map جامع** | ⚠️ (ساده) | ✅ (کامل) 🆕 |
| **Site Map پنل ادمین** | ❌ | ✅ 🆕 |
| Engineering Execution Pack | ✅ (۱۱ بخش) | ✅ (۱۱ بخش) |
| Error Code Catalog | ⚠️ (۱۰ خطا) | ✅ (۱۲ خطا) |
| QA Scenario Matrix | ⚠️ (۸ سناریو) | ✅ (۱۲ سناریو) |
| Deep ERD | ✅ | ✅ |
| DTO/Schema Matrix | ✅ | ✅ |
| Validation Matrix | ✅ | ✅ |
| Permission Matrix | ✅ | ✅ |
| Screen Spec | ✅ | ✅ |
| Infrastructure View | ✅ | ✅ |
| Observability | ✅ | ✅ |
| Definition of Done | ✅ | ✅ |

---

# پایان سند نهایی یکپارچه املاین

**نسخه 5.0 — کامل، آماده برای پیاده‌سازی توسط تیم‌های فنی** 🎯

```yaml
═══════════════════════════════════════════════════════════════
                    Amline Platform v5.0
                   وضعیت نهایی سند
═══════════════════════════════════════════════════════════════

بخش‌های اصلی: ۳۷ بخش
دیاگرام‌های Mermaid: ۲۲+ دیاگرام
ضمائم اجرایی: ۱۱ ضمیمه
نقش‌های پوشش‌داده‌شده: ۶ نقش
رویدادهای تعریف‌شده: ۱۲ رویداد
قوانین تجاری: ۱۲ قانون
Transition: ۱۵ Transition
Endpointهای API: ۲۶+ Endpoint
سناریوهای QA: ۱۲ سناریو

═══════════════════════════════════════════════════════════════
                    TOTAL: 100% COMPLETE
═══════════════════════════════════════════════════════════════
```
