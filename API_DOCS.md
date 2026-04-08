# اَملاین - API Documentation
# Agent Windsurf Amline - API Documentation

## Observability & ops

- متریک Prometheus: `GET /metrics` (با `AMLINE_METRICS_ENABLED=1`).
- راه‌اندازی محلی Grafana/Prometheus: [`infra/observability/README.md`](infra/observability/README.md).
- محدودیت نرخ سراسری (SlowAPI): با `AMLINE_RATE_LIMIT_ENABLED=1` (پیش‌فرض)، `AMLINE_RATE_LIMIT_DEFAULT` مثلاً `300/minute`، و اختیاری `REDIS_URL` برای حالت چند نمونه.

## Base URL
```
Production: https://api.amline.ir
Staging (پروکسی Caddy روی admin.staging): پیش‌فرض `https://api.amline.ir` با strip مسیر `/api/v1` — یا `STAGING_API_URL` برای Darkube/سرویس دیگر
Local: http://localhost:8080
```

## Authentication

### POST /admin/login
ورود ادمین با OTP

**Request:**
```json
{
  "mobile": "09121234567",
  "otp": "1234"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "123456789",
    "mobile": "09121234567",
    "full_name": "مدیر سیستم",
    "role": "admin",
    "permissions": ["users:read", "users:write", "contracts:read", ...]
  }
}
```

### POST /admin/otp/send
ارسال کد OTP

**Request:**
```json
{
  "mobile": "09121234567"
}
```

**Response:**
```json
{
  "success": true,
  "message": "کد تأیید ارسال شد"
}
```

### POST /admin/otp/verify
تأیید کد OTP

**Request:**
```json
{
  "mobile": "09121234567",
  "otp": "1234"
}
```

**Response:**
```json
{
  "valid": true
}
```

---

## Users Management

### GET /admin/users
دریافت لیست کاربران

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | int | شماره صفحه |
| limit | int | تعداد آیتم در صفحه |
| search | string | جستجو در نام و موبایل |
| role | string | فیلتر بر اساس نقش |

**Response:**
```json
{
  "items": [
    {
      "id": "123456789",
      "mobile": "09121234567",
      "full_name": "علی محمدی",
      "role": "user",
      "created_at": "2024-01-15T10:30:00Z",
      "is_active": true
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

### GET /admin/users/{id}
دریافت جزئیات کاربر

**Response:**
```json
{
  "id": "123456789",
  "mobile": "09121234567",
  "full_name": "علی محمدی",
  "national_id": "1234567890",
  "email": "ali@example.com",
  "role": "user",
  "wallet_balance": 5000000,
  "created_at": "2024-01-15T10:30:00Z",
  "profile": {
    "avatar": "https://minio.example.com/avatars/123.jpg",
    "birth_date": "1990-01-01"
  }
}
```

### POST /admin/users/create-or-update
ایجاد یا به‌روزرسانی کاربر

**Request:**
```json
{
  "mobile": "09121234567",
  "full_name": "علی محمدی",
  "national_id": "1234567890",
  "email": "ali@example.com",
  "role": "user"
}
```

### POST /admin/users/{id}/access-token
دریافت توکن دسترسی برای ورود نمایشی (Impersonation)

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 3600
}
```

---

## Call & Text Logs

### GET /users/user-calls/{user_id}
دریافت تاریخچه تماس‌های کاربر

**Response:**
```json
{
  "items": [
    {
      "id": "call_123",
      "user_id": "123456789",
      "type": "incoming",
      "status": "completed",
      "duration": 120,
      "notes": "تماس در مورد آگهی",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### POST /users/user-calls
ثبت تماس جدید

**Request:**
```json
{
  "user_id": "123456789",
  "type": "incoming",
  "duration": 120,
  "notes": "تماس در مورد آگهی"
}
```

### GET /users/user-texts/{user_id}
دریافت تاریخچه پیامک‌های کاربر

### POST /users/user-texts
ثبت پیامک جدید

**Request:**
```json
{
  "user_id": "123456789",
  "type": "sent",
  "text": "متن پیامک",
  "direction": "incoming"
}
```

---

## Advertisement Management

### POST /ads/properties
ایجاد آگهی ملک

**Request:**
```json
{
  "title": "آپارتمان ۲ خوابه در مرکز شهر",
  "description": "آپارتمان lux با تمام امکانات",
  "property_type": "residential",
  "transaction_type": "rent",
  "price": 500000000,
  "monthly_rent": 50000000,
  "area": 85,
  "address": "تهران، منطقه ۱",
  "rooms": 2,
  "floor": 3,
  "total_floors": 10,
  "built_year": 1398,
  "facilities": ["پارکینگ", "انباری", "آسانسور"]
}
```

### GET /ads/properties
دریافت لیست آگهی‌ها

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | int | شماره صفحه |
| limit | int | تعداد آیتم |
| property_type | string | نوع ملک |
| transaction_type | string | نوع معامله |
| city | string | شهر |
| district | string | منطقه |
| min_price | int | حداقل قیمت |
| max_price | int | حداکثر قیمت |

### GET /ads/properties/{id}
دریافت جزئیات آگهی

### PATCH /ads/properties/{id}
ویرایش آگهی

### DELETE /ads/properties/{id}
حذف آگهی

### GET /ads/properties/current-user
آگهی‌های کاربر جاری

---

## Visit Requests

### POST /ads/visit-requests
ثبت درخواست بازدید

**Request:**
```json
{
  "property_id": "prop_123",
  "preferred_date": "2024-01-20",
  "preferred_time": "10:00",
  "notes": "مایلم صبح بازدید کنم"
}
```

**Response:**
```json
{
  "id": "vr_123",
  "status": "pending",
  "property_id": "prop_123",
  "user_id": "123456789",
  "preferred_date": "2024-01-20",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

## Contract Management

### POST /admin/contracts/start
شروع قرارداد جدید

**Request:**
```json
{
  "property_id": "prop_123",
  "contract_type": "rent",
  "start_date": "2024-02-01",
  "end_date": "2025-02-01",
  "monthly_rent": 50000000,
  "deposit": 150000000
}
```

### POST /admin/contracts/create-empty
ایجاد قرارداد خالی

**Request:**
```json
{
  "contract_type": "rent"
}
```

### GET /admin/pr-contracts/list
لیست پیش‌قرارداها

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | int | شماره صفحه |
| limit | int | تعداد آیتم |
| status | string | فیلتر وضعیت |
| from_date | string | تاریخ شروع |
| to_date | string | تاریخ پایان |

### POST /admin/pr-contracts/{id}/parties
اضافه کردن طرفین قرارداد

**Request:**
```json
{
  "party_type": "landlord",
  "full_name": "محمد حسینی",
  "national_id": "1234567890",
  "mobile": "09121234567"
}
```

### POST /admin/contracts/{id}/pdf-file
تولید فایل PDF قرارداد

**Response:**
```json
{
  "success": true,
  "file_url": "https://minio.example.com/contracts/123.pdf",
  "file_name": "contract_123_20240115.pdf"
}
```

---

## Commission Calculator

### POST /users/calculate/rent-commission
محاسبه کمیسیون اجاره

**Request:**
```json
{
  "monthly_rent": 50000000,
  "deposit": 150000000,
  "contract_duration_months": 12
}
```

**Response:**
```json
{
  "monthly_rent": 50000000,
  "deposit": 150000000,
  "commission_rate": 0.25,
  "commission_amount": 1250000,
  "tax": 125000,
  "total": 1375000
}
```

### POST /users/calculate/sale-commission
محاسبه کمیسیون فروش

**Request:**
```json
{
  "sale_price": 2000000000,
  "property_type": "residential"
}
```

**Response:**
```json
{
  "sale_price": 2000000000,
  "commission_rate": 0.02,
  "commission_amount": 40000000,
  "tax": 4000000,
  "total": 44000000
}
```

---

## Wallet & Payments

### GET /users/wallet
دریافت موجودی کیف پول

**Response:**
```json
{
  "user_id": "123456789",
  "balance": 5000000,
  "currency": "IRR",
  "frozen_balance": 1000000
}
```

### GET /users/payments
دریافت لیست پرداخت‌ها

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | int | شماره صفحه |
| limit | int | تعداد آیتم |
| status | string | فیلتر وضعیت |
| type | string | نوع پرداخت |

**Response:**
```json
{
  "items": [
    {
      "id": "pay_123",
      "type": "rent",
      "amount": 50000000,
      "status": "paid",
      "due_date": "2024-02-01",
      "paid_at": "2024-02-01T10:30:00Z"
    }
  ],
  "total": 50,
  "page": 1
}
```

### POST /users/payments
ایجاد پرداخت جدید

**Request:**
```json
{
  "type": "rent",
  "amount": 50000000,
  "payment_method": "cash",
  "due_date": "2024-02-01",
  "contract_id": "contract_123",
  "description": "اجاره ماهانه فروردین"
}
```

### apiCompletePayment
نهایی‌سازی پرداخت

**Request:**
```json
{
  "payment_id": "pay_123",
  "amount": 50000000,
  "transaction_id": "tx_123",
  "gateway": "zarinpal"
}
```

**Response:**
```json
{
  "success": true,
  "payment_id": "pay_123",
  "status": "completed",
  "transaction_id": "tx_123"
}
```

---

## Error Responses

### 400 - Bad Request
```json
{
  "detail": "پیام خطا",
  "field_errors": {
    "mobile": "شماره موبایل نامعتبر است"
  }
}
```

### 401 - Unauthorized
```json
{
  "detail": "احراز هویت نامعتبر"
}
```

### 403 - Forbidden
```json
{
  "detail": "دسترسی مجاز نیست"
}
```

### 404 - Not Found
```json
{
  "detail": "منبع مورد نظر یافت نشد"
}
```

### 422 - Validation Error
```json
{
  "detail": "خطای اعتبارسنجی",
  "errors": [
    {
      "loc": ["body", "field_name"],
      "msg": "پیام خطا",
      "type": "value_error"
    }
  ]
}
```

### 500 - Internal Server Error
```json
{
  "detail": "خطای سرور"
}
```

---

## Response Enums

### User Roles
- `admin` - مدیر سیستم
- `user` - کاربر عادی
- `realtor` - مشاور املاک
- `accountant` - حسابدار

### Property Types
- `residential` - مسکونی
- `commercial` - تجاری
- `office` - اداری
- `land` - زمین

### Transaction Types
- `rent` - اجاره
- `sale` - فروش
- `swap` - معاوضه

### Contract Status
- `draft` - پیش‌نویس
- `pending` - در انتظار
- `active` - فعال
- `completed` - تکمیل شده
- `cancelled` - لغو شده

### Payment Status
- `pending` - در انتظار
- `paid` - پرداخت شده
- `failed` - ناموفق
- `cancelled` - لغو شده

### Payment Methods
- `cash` - نقدی
- `cheque` - چک
- `monthly_rent` - پرداخت ماهانه
- `online` - آنلاین
