# Notification Service (اسکلت)

سرویس مستقل برای SMS / push / email — **هنوز کد runtime ندارد**.

## قرارداد پیشنهادی

- ورودی: صف NATS یا Redis Stream topic `notifications.send`.
- Payload: `{ "channel": "sms", "to": "+989...", "template_id": "...", "data": {} }`.

## ادغام با مونولیت

تا زمان استخراج، `app/services` همان ارسال را انجام می‌دهد؛ سپس publisher فقط رویداد می‌فرستد.

## اجرای محلی NATS

از ریشهٔ مخزن:

```bash
docker compose -f infra/nats/docker-compose.yml up -d
```
