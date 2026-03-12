# Agent Windsurf Amline - داشبورد سئو

داشبورد حرفه‌ای سئو با امکان چت هوشمند برای تعامل با داده‌های گوگل سرچ کنسول.

## ویژگی‌ها

- نمایش KPI (کلیک، نمایش، CTR، رتبه)
- نمودار روند کلیک و نمایش
- توزیع دستگاه و کشور
- جدول کلمات کلیدی و صفحات برتر
- **چت هوشمند**: سوالات خود را درباره داده‌ها بپرسید

## اجرا

```bash
# نصب وابستگی‌ها
npm install

# اجرای سرور توسعه (پورت ۳۰۰۳)
npm run dev
```

سپس به آدرس http://localhost:3003 بروید.

## پیش‌نیاز

1. **داده GSC**: ابتدا اسکریپت‌های Python را اجرا کنید:
   ```bash
   python scripts/gsc_export_all.py
   ```

2. **متغیرهای محیطی** (اختیاری در `.env.local`):
   - `GSC_DATA_PATH`: مسیر فایل `gsc_full_export.json`
   - `AMLINE_AI_URL`: آدرس سرویس هوش مصنوعی برای چت

## دیپلوی روی پارمین کلود

راهنمای کامل: [DEPLOY_PARMIN.md](./DEPLOY_PARMIN.md)

```bash
# با Docker
docker compose up -d --build
```

---

## ساختار

- `src/app/page.tsx` — صفحه اصلی داشبورد
- `src/app/api/gsc/route.ts` — API داده‌های GSC
- `src/app/api/ai/chat/route.ts` — API چت هوشمند
- `src/components/` — کامپوننت‌های UI
