# Observability محلی (Prometheus + Grafana)

برای **Critical §4** از [docs/platform-transformation/ROADMAP.md](../../docs/platform-transformation/ROADMAP.md).

## پیش‌نیاز

1. API را روی میزبان اجرا کنید (مثلاً پورت `8000`) با:
   - `AMLINE_METRICS_ENABLED=1`
   - در صورت نیاز `AMLINE_PROMETHEUS_MIDDLEWARE=1` (پیش‌فرض روشن است)

2. Docker / Docker Compose v2

## اجرا

```bash
cd infra/observability
docker compose up -d
```

- Prometheus: <http://localhost:9090>
- Grafana: <http://localhost:3030> (کاربر/رمز پیش‌فرض: `admin` / `admin` — فقط dev؛ پورت ۳۰۳۰ تا با اپ‌های روی ۳۰۰۰ تداخل نکند)

Prometheus به `host.docker.internal:8000` متصل می‌شود تا `/metrics` روی **میزبان** را بخواند (Linux: `host-gateway` در compose تنظیم شده است).

## Redis (محدودیت نرخ بک‌اند)

برای ذخیرهٔ محدودیت نرخ بین چند replica بک‌اند، `REDIS_URL=redis://host:6379/0` بگذارید. استک محلی: [`../redis/docker-compose.yml`](../redis/docker-compose.yml).

## OpenTelemetry (اختیاری)

```bash
docker compose --profile otel up -d
```

سپس برای بک‌اند:

```bash
set OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
set OTEL_SERVICE_NAME=amline-api
```

خروجی trace در لاگ collector (exporter `debug`) دیده می‌شود؛ برای production به Jaeger/Tempo وصل کنید.

## امنیت

این فایل‌ها برای **توسعه** هستند. قبل از production: رمز Grafana، TLS، و شبکهٔ داخلی k8s را جایگزین کنید.
