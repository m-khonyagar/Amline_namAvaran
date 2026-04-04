# سرویس جستجو (Meilisearch / Elastic)

## وضعیت فعلی

ادغام جزئی در `app/integrations/meilisearch_listings.py`.

## هدف

- ایندکس readonly از listing/قرارداد با sync idempotent.
- API جستجو از BFF یا سرویس جدا با همان auth.

## گام‌های بعد

1. تعریف schema ایندکس و job sync (Temporal یا cron).
2. Deploy Meilisearch یا Elastic Cloud؛ secret در GitHub Environments.
3. جدا کردن مسیر `/search` از مونولیت در صورت نیاز به scale مستقل.
