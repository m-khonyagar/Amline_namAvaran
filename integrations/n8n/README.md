# n8n — وب‌هوک املاین

## بدنهٔ درخواست

همهٔ رویدادها JSON با شکل زیر دارند:

```json
{
  "source": "amline",
  "event": "crm.lead.created",
  "payload": { "lead_id": "...", "listing_id": null }
}
```

رویدادها:

| `event` | زمان |
|---------|------|
| `crm.lead.created` | پس از ایجاد لید در `/api/v1/crm/leads` |
| `visit.created` | پس از ایجاد ویزیت |
| `contract.started` | پس از `POST /contracts/start` |

هدر اختیاری: `X-Amline-N8N-Secret` اگر `AMLINE_N8N_WEBHOOK_SECRET` تنظیم شده باشد.

## n8n UI

1. Workflow جدید → گره **Webhook** (POST).
2. مسیر را کپی کنید و در `AMLINE_N8N_WEBHOOK_URL` بگذارید.
3. گره **IF** روی `{{ $json.event }}` برای شاخه‌بندی lead / visit / contract.
4. گره‌های CRM (Sheets، ایمیل، Slack، …) را وصل کنید.

## فایل نمونه

[`amline-webhook-fanout.json`](./amline-webhook-fanout.json) را در n8n از منوی Import اضافه کنید و URL وب‌هوک را با محیط خود جایگزین کنید.

## Pipeline واقعی (لید → ویزیت → قرارداد)

[`amline-lead-visit-contract.json`](./amline-lead-visit-contract.json) پس از رویداد `crm.lead.created` (همان بدنهٔ خروجی املاین) درخواست‌های زیر را می‌زند:

1. `POST /api/v1/visits` با `crm_lead_id` و `listing_id` (اختیاری)
2. `POST /api/v1/contracts/start` با پیش‌نویس قرارداد

**تنظیم:** مقدار `AMLINE_N8N_WEBHOOK_URL` را برابر آدرس وب‌هوک همین workflow بگذارید. در گره‌های HTTP، اگر n8n خارج از شبکهٔ Docker است، `http://backend:8000` را با `http://host.docker.internal:8080` (یا URL عمومی API) عوض کنید. هدر `X-User-Permissions: *` برای محیط dev با RBAC سخت‌گیرانه مناسب نیست — در پروداکشن از توکن سرویس و نقش محدود استفاده کنید.
