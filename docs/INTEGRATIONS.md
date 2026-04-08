# یکپارچه‌سازی‌های لبهٔ پلتفرم املاین

این سند متغیرهای محیطی و سرویس‌های Docker (profile `integrations`) را خلاصه می‌کند.

## Meilisearch

- `AMLINE_SEARCH_BACKEND=meilisearch` — جستجوی آگهی از Meilisearch.
- `MEILISEARCH_URL` — مثال: `http://meilisearch:7700` (در Docker) یا `http://127.0.0.1:7700`.
- `MEILISEARCH_API_KEY` — در صورت فعال بودن master key.
- `MEILISEARCH_INDEX_LISTINGS` — پیش‌فرض: `listings`.
- همگام‌سازی: پس از create/update/archive آگهی؛ بازایندکس دستی: `POST /api/v1/integrations/meilisearch/reindex` (نیاز به `listings:write` وقتی RBAC روشن است).

## PostHog

- جزئیات رویداد و PII: [`POSTHOG_EVENTS.md`](./POSTHOG_EVENTS.md)
- `POSTHOG_API_KEY` یا `POSTHOG_PROJECT_API_KEY`
- `POSTHOG_HOST` — پیش‌فرض `https://app.posthog.com`
- `POSTHOG_DISABLED=1` — غیرفعال‌سازی capture سمت سرور
- رویدادهای سرور: پس از ingest آنالیتیکس داخلی؛ پرچم نمونه: `amline_beta_features` (از طریق `GET /api/v1/integrations/feature-flags`).
- فرانت: `VITE_PUBLIC_POSTHOG_KEY` و اختیاری `VITE_PUBLIC_POSTHOG_HOST`.

## Nominatim (OSM)

- `AMLINE_NOMINATIM_URL` — پیش‌فرض `https://nominatim.openstreetmap.org`
- `AMLINE_NOMINATIM_USER_AGENT` — الزامی طبق سیاست استفادهٔ OSM در پروداکشن.
- API: `GET /api/v1/geo/nominatim/search` ، `GET /api/v1/geo/nominatim/reverse`

## n8n

- `AMLINE_N8N_WEBHOOK_URL` — URL وب‌هوک ورودی workflow.
- `AMLINE_N8N_WEBHOOK_SECRET` — هدر `X-Amline-N8N-Secret`.
- رویدادها: `crm.lead.created`, `visit.created`, `contract.started`

## Thumbor

- `THUMBOR_BASE_URL` — پایهٔ URL سرویس Thumbor (امضا در صورت نیاز در `THUMBOR_SECURITY_KEY`).
- `AMLINE_THUMBOR_HTTP_SOURCE_BASE` — در صورت بارگذاری تصویر از HTTP به‌جای مسیر خام.
- کمکی: `GET /api/v1/integrations/thumbor/demo`
- پیش‌تنظیم اندازه: `GET /api/v1/integrations/thumbor/presets` — نام‌ها: `thumb`, `card`, `cover`, `hero`, `og`
- آپلود: `POST /api/v1/media/listing-image?preset=card` (به‌جای `width`/`height`)

## قیمت ML

- `AMLINE_ML_PRICING_URL` — سرویس HTTP که بدنهٔ listing را می‌گیرد و `suggested_price` برمی‌گرداند؛ در نبود سرویس، موتور rule-based استفاده می‌شود. مثال Docker: `http://ml-pricing:8090/v1/estimate`
- سرویس Docker `ml-pricing`: پورت `8090`، `GET /metrics` (Prometheus)، مدل JSON در `services/ml-pricing/models/baseline.json` با متغیر اختیاری `AMLINE_PRICING_MODEL_PATH`.
- آموزش/به‌روزرسانی baseline: `python scripts/ml/train_pricing_baseline.py --out services/ml-pricing/models/baseline.json --multiplier 1.03`
- بک‌اند: سه تلاش با backoff روی HTTP ML + شمارندهٔ `amline_ml_pricing_http_total`.

## OpenTelemetry

- `OTEL_EXPORTER_OTLP_ENDPOINT` — مثال: `http://otel-collector:4318`
- `OTEL_SERVICE_NAME` — پیش‌فرض `amline-api`

## Matrix

- وضعیت: `GET /api/v1/integrations/matrix/status` — آداپتور در `app/adapters/matrix/`.
- راه‌اندازی Synapse و E2EE: [`MATRIX_SETUP.md`](./MATRIX_SETUP.md).

## Metabase / Grafana / Loki

- Metabase در Docker profile `integrations` روی پورت 3005 (پیش‌فرض). کوئری‌های نمونه: [`integrations/metabase/sql/`](../integrations/metabase/sql/).
- Grafana `3010`: داده‌گاه‌های Prometheus (پیش‌فرض)، Loki، Tempo؛ داشبورد provisionشده **Amline overview** در `docker/grafana/provisioning/dashboards/json/`.
- Loki `3100` + Promtail برای لاگ کانتینرهای `amline-*`؛ Prometheus `9090` — scrape بک‌اند و ml-pricing.
- Runbook: [`docs/runbooks/OBSERVABILITY.md`](./runbooks/OBSERVABILITY.md)
- Tempo UI: `http://localhost:3200` — OTLP از collector روی `:4318` به Tempo.
- Metabase: اتصال به Postgres اپ؛ راهنمای داشبورد: [`METABASE_SETUP.md`](./METABASE_SETUP.md)

## ذخیرهٔ رسانه (MinIO) + Thumbor

- `AMLINE_S3_ENDPOINT_URL`, `AMLINE_S3_ACCESS_KEY`, `AMLINE_S3_SECRET_KEY`, `AMLINE_S3_BUCKET`
- `AMLINE_S3_PUBLIC_BASE_URL` — برای URL عمومی فایل، مثال: `http://localhost:9000` (path-style با bucket در مسیر بر عهدهٔ کلاینت/پروکسی)
- آپلود: `POST /api/v1/media/listing-image` (مجوز `listings:write`)
- Thumbor برای بارگذاری HTTP از منبع: `AMLINE_THUMBOR_HTTP_SOURCE_BASE` (مثال: `http://minio:9000/public` بسته به باکت)

## Temporal

- `AMLINE_TEMPORAL_HOST` — مثال `temporal:7233`؛ در صورت تنظیم، هوک‌های `app/integrations/temporal_workflows.py` فعال می‌شوند.
- `AMLINE_TEMPORAL_TASK_QUEUE` — پیش‌فرض `amline-tasks`
- Workflow `AmlineSignalWorkflow` + activity `log_platform_signal` در `app/temporal/`؛ worker: `python -m app.temporal.run_worker` یا سرویس `temporal-worker`.
- سرویس‌های compose: `temporal-postgresql`, `temporal`, `temporal-worker`

## چند آژانس (حوزه داده)

- `AMLINE_AGENCY_SCOPE_ENABLED=1` — فیلتر `agency_id` روی لیست آگهی و لید CRM وقتی هدر `X-Agency-Id` (یا `X-User-Agency-Id`) ارسال شود.
- `AMLINE_AGENCIES_JSON` — آرایه JSON برای UI ادمین، مثال: `[{"id":"a1","name_fa":"آژانس الف"}]`
- API: `GET /api/v1/meta/context` (نیاز `listings:read` وقتی RBAC فعال است)

## n8n

- قالب workflow: [`integrations/n8n/`](../integrations/n8n/)

## اجرای پروفایل Docker

```bash
docker compose --profile integrations up -d \
  meilisearch n8n thumbor metabase metabase-db-init \
  tempo loki promtail prometheus grafana otel-collector \
  temporal-postgresql temporal temporal-worker ml-pricing synapse
```

سپس متغیرهای بالا را روی سرویس `backend` تنظیم کنید.
