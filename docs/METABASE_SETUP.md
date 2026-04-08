# Metabase — اتصال به دیتابیس املاین

## Docker (profile `integrations`)

سرویس `metabase` پس از `metabase-db-init` به همان PostgreSQL پروژه (`postgres`) و دیتابیس `metabase` برای متادیتای Metabase وصل می‌شود. دادهٔ تحلیلی از دیتابیس `amline` (یا مقدار `POSTGRES_DB`) خوانده می‌شود.

1. اجرا:

```bash
docker compose --profile integrations up -d metabase-db-init metabase postgres
```

2. مرورگر: `http://localhost:3005` — اولین اجرا setup ادمین.

3. **Add data** → PostgreSQL:
   - Host: `postgres` (از داخل شبکهٔ Docker) یا `localhost` از میزبان
   - Port: `5432`
   - Database: `amline`
   - User / Password: همان `POSTGRES_USER` / `POSTGRES_PASSWORD`

## سوالات نمونه (SQL)

**تعداد لیدها به تفکیک وضعیت**

```sql
SELECT status, COUNT(*) AS n
FROM crm_leads
GROUP BY status
ORDER BY n DESC;
```

**آگهی‌های منتشرشدهٔ عمومی**

```sql
SELECT COUNT(*) FROM listings
WHERE visibility = 'PUBLIC' AND status = 'PUBLISHED';
```

**ویزیت‌های هفتهٔ جاری (تقویم را در Metabase تنظیم کنید)**

```sql
SELECT status, COUNT(*)
FROM visits
WHERE scheduled_at >= NOW() - INTERVAL '7 days'
GROUP BY status;
```

**قراردادها در mock حافظه** — در بک‌اند واقعی جدول قرارداد ممکن است متفاوت باشد؛ تا آن زمان از KPIهای CRM/لیستینگ استفاده کنید.

پس از ذخیرهٔ سوالات، داشبورد «CRM / Listings / Visits» را بسازید و ویجت‌ها را اضافه کنید.

## داشبوردهای پیشنهادی v5.0

| داشبورد | کارت‌های پیشنهادی |
|---------|-------------------|
| **CRM** | تعداد لید به تفکیک `status`؛ روند زمانی ایجاد لید (اگر ستون زمان در Metabase بسازید) |
| **Listings** | تعداد `PUBLIC` + `published`؛ توزیع `deal_type` |
| **Visits** | ویزیت‌های ۷ روز اخیر به تفکیک `status` |
| **Contracts** | فعلاً کارت نگهدار؛ پس از جدول دائمی قرارداد، کوئری را جایگزین کنید |
| **Revenue** | مجموع `amount_cents` روزانه برای `payment_intents.status = 'COMPLETED'` |

فایل‌های SQL آمادهٔ کپی در Metabase: [`integrations/metabase/sql/`](../integrations/metabase/sql/) (`01` … `05`).
