# مدل داده قرارداد — قرارداد با [`Amline_Complete_Master_Spec_v2.md`](./Amline_Complete_Master_Spec_v2.md)

این سند **قرارداد داده** بین محصول، بک‌اند و DB را برای شش نوع قرارداد ثابت می‌کند. پیاده‌سازی as-built: فیلدهای حافظه/ORM در `backend/backend`؛ canonical kinds در `app/domain/contracts/ssot.py` (`ContractKind`).

## ۱. Contract (هسته)

| فیلد | نوع | توضیح |
|------|-----|--------|
| `id` | string (UUID یا `contract-*`) | شناسه یکتا |
| `contract_type` | string | مقدار legacy API (مثلاً `PROPERTY_RENT`) + نرمال‌شده به `ssot_kind` |
| `ssot_kind` | enum | `RENT` \| `SALE` \| `EXCHANGE` \| `CONSTRUCTION` \| `PRE_SALE` \| `LEASE_TO_OWN` |
| `status` | string | وضعیت v2 یا نگاشت از کد — نگاه کنید به [`STATUS_MAPPING_v2.md`](./STATUS_MAPPING_v2.md) |
| `substate` | string? | SLA / صف حقوقی / انتظار امضا |
| `created_at` / `updated_at` | datetime | |
| `created_by_user_id` | string? | کاتب |
| `terms` | JSON object | یکی از شکل‌های §۲ (validated بر اساس `ssot_kind`) |
| `parties` | list | §۳ |
| `witnesses` | list | همان ساختار فعلی witness در New Flow |
| `external_refs` | object | `khodnevis_id`, `katib_id`, `tracking_code` |
| `commissions` | list | ارجاع به ردیف‌های `contract_commissions` یا آرایه در state تا migration کامل |

## ۲. Terms (پلی‌مورفیک JSON)

کلید ریشه باید با `ssot_kind` هم‌خوان باشد. پیشنهاد: `{"kind":"SALE","sale":{...}}` یا فقط آبجکت تخت با `ssot_kind` در قرارداد.

### ۲.۱ RENT — `RentTerms`

`property_address`, `rent_amount`, `deposit_amount`, `contract_duration_months`, `start_date`, `end_date`, `special_conditions`

### ۲.۲ SALE — `SaleTerms`

`property_address`, `total_price`, `payment_plan[]` (`type`, `amount`, `due_date`), `transfer_date`, `has_encumbrance`, `encumbrance_details?`

### ۲.۳ EXCHANGE — `ExchangeTerms`

`first_property_address`, `second_property_address`, `price_difference`, `payment_plan` (همان شکل خطی یا ارجاع به intent پرداخت)

### ۲.۴ CONSTRUCTION — `ConstructionTerms`

`land_address`, `land_owner_name`, `contractor_name`, `land_owner_share_percent`, `contractor_share_percent`, `estimated_completion_date`, `penalty_for_delay`

### ۲.۵ PRE_SALE — `PreSaleTerms`

`project_name`, `unit_number`, `total_price`, `payment_schedule[]` (`stage`, `percent`, `due_date`), `delivery_date`, `penalty_for_delay`

### ۲.۶ LEASE_TO_OWN — `LeaseToOwnTerms`

`property_address`, `monthly_rent`, `contract_duration_months`, `final_purchase_price`, `rent_credited_to_price`, `purchase_option_deadline`

## ۳. Party

| فیلد | نوع |
|------|-----|
| `id` | string |
| `party_role` | یکی از نقش‌های مجاز برای `ssot_kind` — جدول §۴ |
| `person_type` | `NATURAL` \| `LEGAL` |
| `natural_person_detail` / `legal_person_detail` | object (موبایل، نام، شناسه ملی، …) |
| `signed` | bool |
| `signature_method` | `SELF_OTP` \| `AGENT_OTP` \| `ADMIN_OTP` \| `AUTO` |
| `agent_user_id` | string? |

### ۴. نقش‌های مجاز به ازای نوع قرارداد

| ssot_kind | نقش‌ها |
|-----------|--------|
| RENT | `LANDLORD`, `TENANT` |
| SALE | `SELLER`, `BUYER` |
| EXCHANGE | `EXCHANGER_FIRST`, `EXCHANGER_SECOND` |
| CONSTRUCTION | `LAND_OWNER`, `CONTRACTOR` |
| PRE_SALE | `DEVELOPER`, `BUYER` |
| LEASE_TO_OWN | `LESSOR`, `LESSEE` |

## ۵. Commission (جدول پیشنهادی `contract_commissions`)

| ستون | نوع |
|------|-----|
| `id` | UUID string |
| `contract_id` | FK قرارداد |
| `commission_type` | `RENT_COMMISSION` \| `SALE_COMMISSION` \| … |
| `paid_by` | `PARTY_A` \| `PARTY_B` \| `BOTH` \| `CONTRACT_CREATOR` |
| `amount` | int (ریال) |
| `status` | `PENDING` \| `PAID` |
| `payment_method` | `SELF` \| `AGENT` \| `ADMIN` |
| `created_at` | datetime |

## ۶. تطبیق ORM فعلی

- `contract_flow_contracts`: افزودن ستون `terms_json` (یا معادل) برای terms پلی‌مورفیک؛ `party_role` در `contract_flow_parties` به رشتهٔ گسترش‌یافته.
- تا هم‌ترازی کامل Postgres، MemoryStore می‌تواند همان ساختار JSON را نگه دارد.
