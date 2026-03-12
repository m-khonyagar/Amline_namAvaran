# ساختار حرفه‌ای ریپوزیتوری CTO

این سند ساختار پروژه‌ها و دسته‌بندی آن‌ها را شرح می‌دهد.

---

## دسته‌بندی پروژه‌ها

### پلتفرم اَملاین (Amline Platform) — پروژه اصلی

| پروژه | مسیر | تکنولوژی | توضیحات |
|-------|------|----------|---------|
| **Backend API** | `backend/backend/` | FastAPI, PostgreSQL, Redis | API اصلی، احراز هویت، RBAC |
| **PDF Generator** | `pdf-generator/` | Python, FastAPI, MinIO | تولید PDF قراردادها |
| **Admin UI** | `admin-ui/` | React, Vite, TypeScript | پنل مدیریت ادمین |
| **Amline UI** | `amline-ui/` | Next.js 14, React | داشبورد کاربری |
| **Site** | `site/` | Next.js 15, React | وب‌سایت بازاریابی |

### سرویس‌های جانبی

| پروژه | مسیر | تکنولوژی | توضیحات |
|-------|------|----------|---------|
| **SEO Dashboard** | `seo-dashboard/` | Next.js 14, Recharts | داشبورد سئو + چت هوشمند GSC |
| **Figma Tools** | `Figma/` | React, Python | ابزارهای Figma API و طراحی |

### پروژه‌های Agent / Windsurf

| پروژه | مسیر | تکنولوژی | توضیحات |
|-------|------|----------|---------|
| **TaskFlow Desktop** | `Agent/Agent/winfsurf-20/taskflow/` | Tauri, React, Vite | اپلیکیشن دسکتاپ TaskFlow |
| **Cascade 2048** | `Agent/Agent/winfsurf-20/CascadeProjects/2048/` | Vanilla JS | پروژه دمو بازی ۲۰۴۸ |

### ابزارها و اسکریپت‌ها

| پروژه | مسیر | تکنولوژی | توضیحات |
|-------|------|----------|---------|
| **GSC Scripts** | `scripts/` | Python | اسکریپت‌های Google Search Console |
| **AI Video Spec** | `ai-video-directory/` | — | مشخصات پروژه دایرکتوری ویدیو AI |

### مستندات و پیکربندی

| مسیر | توضیحات |
|------|---------|
| `docs/` | مستندات، داده‌های GSC |
| `.github/workflows/` | CI/CD (deploy-seo-agent, ci) |
| `workspace.manifest.json` | رجیستر مرکزی پروژه‌ها و فرمان‌های workspace |
| `scripts/bootstrap-workspace.ps1` | نصب وابستگی‌های همه پروژه‌ها |
| `scripts/validate-workspace.ps1` | اجرای lint/build/check برای workspace |

---

## ساختار پیشنهادی برای آینده

```
CTO/
├── apps/                    # اپلیکیشن‌های اصلی
│   ├── admin-ui/
│   ├── amline-ui/
│   ├── site/
│   └── seo-dashboard/
├── services/                # سرویس‌های بک‌اند
│   ├── backend/             # (مسیر: backend/backend)
│   └── pdf-generator/
├── tools/                    # ابزارها
│   ├── figma/                # (نام فعلی: Figma)
│   └── scripts/
├── docs/
└── .github/
```

---

## نکات مهم

### ۱. ساختار Backend
- مسیر: `backend/backend/` (پوشه بیرونی: backend، پروژه داخلی: backend)
- در صورت تغییر، باید `ci.yml` و `docker-compose` به‌روزرسانی شوند.

### ۲. حذف `node_modules` از Git
اگر `node_modules` قبلاً commit شده:
```bash
git rm -r --cached Figma/node_modules
git rm -r --cached Agent/Agent/winfsurf-20/taskflow/frontend/node_modules
git commit -m "chore: remove node_modules from tracking"
```

### ۳. پوشه‌های نیازمند بررسی
- `Google Dos/` — در .gitignore قرار دارد
- `تست برنامه نویسی/` — در .gitignore قرار دارد
- `Agent/Amline test` — احتمالاً فایل تست

### ۴. Remote Repository
- آدرس فعلی: `https://github.com/m-khonyagar/taskflow-desktop.git`
- نام ریپو با محتوای فعلی (پلتفرم اَملاین) هماهنگ نیست؛ در صورت نیاز نام ریپو را به‌روزرسانی کنید.

---

## CI/CD Workflows

| Workflow | Trigger | وظیفه |
|----------|---------|-------|
| `deploy-seo-agent.yml` | push به main (فقط seo-dashboard) | دیپلوی روی agent.amline.ir |
| `ci.yml` | push/PR به main و develop | تست Backend، Build Docker برای همه سرویس‌ها |
| `repo-hygiene.yml` | push/PR به main و develop | جلوگیری از commit شدن `node_modules` و artifactها |
