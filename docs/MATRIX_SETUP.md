# Matrix (Synapse) — راه‌اندازی اختیاری

کلاینت املاین وقتی فعال است که:

- `MATRIX_HOMESERVER_URL` — مثال `http://synapse:8008`
- `MATRIX_ACCESS_TOKEN` — توکن دسترسی یک کاربر ربات یا سرویس (C-S API)

## تولید پیکربندی Synapse (یک‌بار)

```bash
mkdir -p docker/synapse
docker run -it --rm \
  -v "$(pwd)/docker/synapse:/data" \
  -e SYNAPSE_SERVER_NAME=localhost \
  -e SYNAPSE_REPORT_STATS=no \
  matrixdotorg/synapse:latest generate
```

سپس در `docker-compose` سرویس `synapse` را با volume `./docker/synapse:/data` اضافه و پورت `8008` را منتشر کنید. جزئیات به‌روز در [مستندات Matrix](https://matrix-org.github.io/synapse/latest/setup/installation.html) است.

## توکن دسترسی

1. یک کاربر (مثلاً `@bot:localhost`) بسازید.
2. از Element یا `curl` لاگین کنید و `access_token` را در env قرار دهید.

## API استفاده‌شده در کد

- `POST /_matrix/client/v3/createRoom` — `ensure_room_for_agency`
- `PUT /_matrix/client/v3/rooms/{roomId}/send/m.room.message/{txn}` — `send_matrix_message`

وضعیت: `GET /api/v1/integrations/matrix/status`

## E2EE (رمز سرتاسر)

پیام‌های **رمزنگاری‌شدهٔ سرتاسر** (مثلاً در Element با فعال بودن Encryption) روی کلاینت رمزگذاری می‌شوند؛ سرور Synapse محتوای متن را نمی‌خواند و فقط رویدادهای ساختاری را نگه می‌دارد. برای پشتیبانی عملیاتی: کلیدهای پشتیبان کلاینت (Security Phrase) را طبق سیاست سازمان مدیریت کنید؛ ربات‌های سمت سرور بدون عضویت در اتاق E2EE نمی‌توانند متن را بخوانند. مرجع: [Matrix E2EE overview](https://matrix.org/docs/guides/end-to-end-encryption-implementation-guide).

## Docker Compose

سرویس `synapse` در `docker-compose.yml` (profile `integrations`) با named volume `matrix_synapse_data` تعریف شده است. برای تولید `homeserver.yaml` اولیه طبق بخش «تولید پیکربندی» بالا عمل کنید؛ سپس volume را یک‌بار با دادهٔ تولیدشده پر کنید یا مسیر bind `./docker/synapse:/data` را مطابق نیاز خود پیکربندی کنید.
