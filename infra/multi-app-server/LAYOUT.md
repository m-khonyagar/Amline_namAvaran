# چیدمان چند‌اپ روی یک سرور لینوکس

## ریشهٔ استاندارد

همهٔ اپلیکیشن‌های استاتیک/SPA که روی یک میزبان مشترک دیپلوی می‌شوند زیر این مسیر قرار می‌گیرند:

```text
/opt/apps/
├── README.txt                 # یادآوری کوتاه + لینک به این مخزن
├── _shared/                   # فقط اسکریپت‌ها و ابزار مشترک (بدون دادهٔ اپ)
│   └── spa_static_server.py   # سرور HTTP سبک برای پوشهٔ استاتیک + fallback SPA
├── _registry/                 # ثبت پورت و مالکیت (خوانا برای انسان)
│   └── ports.txt
└── <app-slug>/                # مثال: amline, seo-dashboard, …
    └── <environment>/         # مثال: staging, production
        └── <role>/            # مثال: admin-ui, marketing-site, landing, …
            └── (فایل‌های build استاتیک)
```

### قواعد

| مورد | قرارداد |
|------|---------|
| **app-slug** | فقط حروف کوچک، اعداد و خط تیره؛ یکتا روی سرور |
| **environment** | `staging`، `production`، `preview-…` |
| **role** | نام مصرف‌کنندهٔ انسانی (مثلاً `admin-ui` نه `dist`) |
| **مسیر قدیمی** | `/opt/amline/staging/*` دیگر استاندارد نیست؛ فقط برای مهاجرت خودکار نگه داشته می‌شود |

## نام واحدهای systemd

الگو:

```text
appsvc-<app-slug>-<environment>-<role-short>.service
```

مثال‌های املاین staging:

- `appsvc-amline-staging-marketing.service` — سایت مارکتینگ
- `appsvc-amline-staging-admin-ui.service` — پنل ادمین

با `systemctl list-units 'appsvc-*'` همهٔ اپ‌های تحت این قرارداد را می‌بینی.

## فایل‌های مخزن

- `PORT-REGISTRY.md` — جدول پورت‌ها برای هر میزبان ثبت‌شده
- `NEW-APPLICATION.md` — چک‌لیست اضافه کردن اپ جدید
