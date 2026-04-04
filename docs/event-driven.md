# معماری رویدادمحور (برنامه)

## هدف

کاهش coupling بین قرارداد، پرداخت، سئو و نوتیفیکیشن با انتشار رویدادهای دامنه.

## رویدادهای پیشنهادی (نمونه)

| رویداد | Payload خلاصه | مشترک |
|--------|----------------|--------|
| `contract.signed` | `contract_id`, `party_id` | نوتیفیکیشن، audit |
| `payment.captured` | `wallet_tx_id`, `amount` | wallet، گزارش |
| `lead.qualified` | `lead_id` | CRM |

## فناوری

- **فاز ۱**: Redis Streams (ساده، همان Redis rate limit).
- **فاز ۲**: NATS JetStream (`infra/nats/docker-compose.yml`) برای چند مصرف‌کننده و replay.

## پیاده‌سازی

هنوز در کد تولید فعال نشده؛ پس از ADR و اسپایک، publisher در مونولیت و consumer در worker اضافه می‌شود.
