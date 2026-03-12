# راهنمای اتصال داشبورد سئو به admin.amline.ir/seo

## پیش‌نیاز

- سرور admin.amline.ir روی همان ماشینی است که داشبورد سئو (پورت ۳۰۰۳) اجرا می‌شود
- یا داشبورد سئو روی سرور دیگری است و باید به آن proxy شود

---

## سناریو ۱: هر دو روی یک سرور

اگر admin.amline.ir و داشبورد سئو روی **همان سرور** هستند:

1. فایل کانفیگ Nginx سرور admin.amline.ir را باز کنید (مثلاً `/etc/nginx/sites-available/admin.amline.ir`)
2. داخل بلوک `server { ... }` این بخش را اضافه کنید:

```nginx
    location /seo {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
```

3. تست و ری‌لود:
```bash
nginx -t && systemctl reload nginx
```

4. داشبورد در آدرس زیر در دسترس است:
   **https://admin.amline.ir/seo**

---

## سناریو ۲: داشبورد سئو روی سرور جدا (مثلاً پارمین کلود)

اگر داشبورد سئو روی سرور دیگری (مثلاً 212.80.24.109) است:

```nginx
    location /seo {
        proxy_pass http://212.80.24.109:3003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
```

---

## نکات

- داشبورد با `basePath: /seo` ساخته شده؛ همه مسیرها زیر `/seo` هستند
- **مهم:** در `proxy_pass` هیچ اسلش انتهایی نگذارید (`http://127.0.0.1:3003` نه `http://127.0.0.1:3003/`) تا URI کامل به backend ارسال شود
- اگر admin.amline.ir از HTTPS استفاده می‌کند، Nginx به‌طور خودکار ترافیک را به backend ارسال می‌کند
- برای SSL، از `certbot` یا مشابه استفاده کنید
