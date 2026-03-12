# 📋 گزارش جامع آنبوردینگ پروژه Agent Windsurf Amline

**تاریخ تهیه**: ۱۲ مارس ۲۰۲۶  
**وضعیت Git**: تمام تغییرات به‌صورت محلی commit شده‌اند  
**توجه**: برای همگام‌سازی با remote، پس از بستن Windsurf یا سایر ابزارهای Git، دستورات `git pull --rebase origin main` و `git push origin main` را اجرا کنید.

---

## 🎯 خلاصه اجرایی

این مخزن شامل **دو پروژه اصلی** است:

| پروژه | مسیر | تکنولوژی | وضعیت |
|-------|------|----------|-------|
| **Agent Windsurf Amline Dashboard** | `Agent/Agent/winfsurf-20/taskflow/TaskFlowDesktop/` | React 19 + Tauri + Vite | ✅ کامل |
| **Agent Windsurf Amline - داشبورد سئو** | `seo-dashboard/` | Next.js 15 + Tailwind | ✅ کامل |

---

## 📦 ۱. Agent Windsurf Amline Dashboard

### ویژگی‌های طراحی‌شده (باید داشته باشد)

- **Dashboard**: نمایش کلی سیستم، وظایف اخیر، عامل‌های فعال
- **Tasks**: لیست وظایف با جستجو، فیلتر، ایجاد/ویرایش/حذف
- **Task Detail**: جزئیات وظیفه با ۵ تب (Overview, Steps, Logs, Artifacts, Collaboration)
- **Memory Explorer**: مدیریت و کاوش حافظه AI
- **Artifacts Viewer**: نمایش خروجی‌ها و فایل‌های تولیدشده
- **Settings**: تنظیمات (تم، زبان، workspace، مدل‌های AI، امنیت، ابزارهای خارجی)
- **Agent Collaboration**: همکاری چند عاملی
- **External Supervision**: نظارت خارجی
- **Computer Control**: کنترل کامپیوتر با ۳ سطح مجوز (Safe, Workspace, Full)

### ویژگی‌های فعلی (الان دارد)

| ویژگی | وضعیت | توضیح |
|-------|-------|-------|
| Dashboard | ✅ | Mock backend، WebSocket simulation، real-time updates |
| Tasks List | ✅ | جستجو، فیلتر، CRUD کامل |
| Task Detail | ✅ | ۵ تب کامل |
| Memory Explorer | ✅ | جستجو، فیلتر، نمایش جزئیات |
| Artifacts Viewer | ✅ | پیش‌نمایش فایل، باز کردن در explorer |
| Settings | ✅ | ۶ بخش تنظیمات |
| Agent Collaboration | ✅ | نمای چند عاملی |
| External Supervision | ✅ | نظارت ابزارهای خارجی |
| Computer Control | ✅ | Session، Screenshot، Terminal، IDE (VS Code, Windsurf, Cursor) |
| دو زبانه (فارسی/انگلیسی) | ✅ | با RTL |
| تم شب/روز | ✅ | CSS variables |
| Command Palette (Ctrl+K) | ✅ | ناوبری سریع |
| Mock Backend | ✅ | API + WebSocket simulation |

### کامپوننت‌های استفاده‌نشده (در پوشه components)

این کامپوننت‌ها موجود هستند اما در `App.tsx` استفاده نمی‌شوند:

- `ChatInterface.tsx`
- `TaskPanel.tsx`
- `AdaptiveNav.tsx`
- `MainLayout.tsx`
- `DevinLayout.tsx`
- `WorkflowBoard.tsx`

**پیشنهاد**: در صورت نیاز به لایه چت، ناوبری تطبیقی یا برد workflow، می‌توان آن‌ها را به layout اصلی متصل کرد؛ در غیر این صورت می‌توان حذف کرد.

### مزایای فعلی Agent Windsurf Amline

- معماری component-based با TypeScript
- UI مدرن با TailwindCSS v4 و semantic tokens
- پشتیبانی RTL و دو زبانه
- Mock backend آماده برای اتصال به backend واقعی
- مستندات فنی (TECHNICAL_ONBOARDING.md، CODE_REVIEW_REPORT.md)
- امتیاز کیفیت: ۹۵/۱۰۰

---

## 📊 ۲. Agent Windsurf Amline - داشبورد سئو

### ویژگی‌های طراحی‌شده (باید داشته باشد)

- نمایش KPI سئو (کلیک، نمایش، CTR، رتبه)
- نمودار روند کلیک و نمایش
- توزیع دستگاه و کشور
- جدول کلمات کلیدی و صفحات برتر
- چت هوشمند برای پرسش درباره داده‌ها
- اتصال به Google Search Console
- دیپلوی روی سرور (Parmin Cloud)

### ویژگی‌های فعلی (الان دارد)

| ویژگی | وضعیت | توضیح |
|-------|-------|-------|
| KPI Cards | ✅ | کلیک، نمایش، CTR، رتبه |
| نمودار روند | ✅ | ClicksChart |
| توزیع دستگاه | ✅ | DevicePie |
| کلمات کلیدی برتر | ✅ | TopTable |
| صفحات برتر | ✅ | TopTable |
| کشورهای برتر | ✅ | TopTable |
| چت هوشمند AI | ✅ | AIChat با context داده GSC |
| تم شب/روز | ✅ | دکمه toggle |
| اتصال GSC | ✅ | از طریق `gsc_full_export.json` |
| API چت | ✅ | `/api/ai/chat` |
| Docker | ✅ | Dockerfile و docker-compose |
| RTL | ✅ | پشتیبانی فارسی |

### مزایای فعلی SEO Dashboard

- Next.js 15 با App Router
- انیمیشن با Framer Motion
- چت هوشمند با context داده سئو
- اتصال به Google Sheets
- آماده دیپلوی با Docker

---

## 🛠 ۳. ابزارها و اسکریپت‌های پروژه

| فایل/پوشه | کاربرد |
|-----------|--------|
| `scripts/gsc_*.py` | اسکریپت‌های GSC (export، sync، merge، refresh) |
| `scripts/gsc_cli.py` | CLI برای کار با GSC |
| `deploy_amline.py` | دیپلوی املاین |
| `deploy-seo-amline.ps1` | دیپلوی با PowerShell |
| `setup_dns_arvan.py` | تنظیم DNS در اروان |
| `setup_nginx_amline.py` | تنظیم Nginx |
| `upload_gsc.py` | آپلود داده GSC |
| `.github/workflows/deploy-seo-agent.yml` | CI/CD برای SEO agent |

---

## 📁 ۴. ساختار کلی مخزن

```
e:\CTO\
├── Agent/Agent/winfsurf-20/taskflow/     # TaskFlow
│   ├── TaskFlowDesktop/                  # اپ دسکتاپ
│   ├── CODE_REVIEW_REPORT.md
│   ├── TECHNICAL_ONBOARDING.md
│   └── PROJECT_SUMMARY.md
├── seo-dashboard/                        # داشبورد سئو
├── docs/                                 # مستندات
├── scripts/                              # اسکریپت‌های GSC و deploy
├── .github/workflows/                    # CI/CD
└── PROJECT_ONBOARDING_REPORT.md         # این گزارش
```

---

## ⚠️ ۵. نکات مهم برای ادامه کار

### Git

- **وضعیت**: merge انجام شده و تغییرات commit شده‌اند.
- **فایل‌های untracked**: `CascadeProjects/`, `Amline test/`, `Figma/`, `seo-dashboard-deploy.tar.gz`
- **همگام‌سازی با remote**: ابتدا `git pull --rebase origin main`، سپس `git push origin main` (پس از آزاد شدن قفل Git).

### Agent Windsurf Amline

- کامپوننت‌های ChatInterface، TaskPanel، AdaptiveNav و غیره در حال حاضر استفاده نمی‌شوند.
- برای اتصال به backend واقعی، باید mock backend را با API واقعی جایگزین کرد.

### SEO Dashboard

- داده GSC از `scripts/gsc_export_all.py` و فایل `gsc_full_export.json` تأمین می‌شود.
- چت AI به `AMLINE_AI_URL` در `.env.local` وابسته است.

---

## 🚀 ۶. دستورات سریع

```bash
# Agent Windsurf Amline - اجرا
cd Agent/Agent/winfsurf-20/taskflow/TaskFlowDesktop
npm run dev

# SEO Dashboard - اجرا
cd seo-dashboard
npm install && npm run dev

# GSC - export داده
python scripts/gsc_export_all.py
```

---

**این گزارش برای آنبوردینگ کامل پروژه تهیه شده است. برای ادامه کار، بگویید روی کدام بخش می‌خواهید تمرکز کنید.**
