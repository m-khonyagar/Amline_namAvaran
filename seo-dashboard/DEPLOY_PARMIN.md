# راهنمای پیاده‌سازی داشبورد سئو روی پارمین کلود

## پیش‌نیازها

- سرور لینوکس (Ubuntu 22.04 پیشنهادی) روی پارمین کلود
- دسترسی SSH
- دامنه (اختیاری) برای دسترسی از اینترنت

---

## مرحله ۱: آماده‌سازی سرور

```bash
# اتصال به سرور
ssh root@YOUR_SERVER_IP

# نصب Docker و Docker Compose
apt update && apt install -y docker.io docker-compose

# فعال‌سازی Docker
systemctl enable docker
systemctl start docker
```

---

## مرحله ۲: آپلود پروژه

### روش الف: Git (پیشنهادی)

```bash
# روی سرور
cd /opt
git clone YOUR_REPO_URL amline
cd amline

# کپی فایل GSC (از export محلی)
# یا آپلود دستی: scp gsc_full_export.json root@SERVER:/opt/amline/seo-dashboard/data/gsc/
```

### روش ب: آپلود دستی

از ویندوز (PowerShell):

```powershell
cd E:\CTO

# فشرده‌سازی
Compress-Archive -Path seo-dashboard -DestinationPath seo-dashboard.zip -Force

# آپلود
scp seo-dashboard.zip root@YOUR_SERVER_IP:/opt/
scp docs\gsc_data\gsc_full_export.json root@YOUR_SERVER_IP:/opt/
```

روی سرور:

```bash
cd /opt
unzip seo-dashboard.zip
mkdir -p seo-dashboard/data/gsc
mv gsc_full_export.json seo-dashboard/data/gsc/
```

---

## مرحله ۳: تنظیم متغیرهای محیطی

```bash
cd /opt/seo-dashboard

# ایجاد فایل .env
cat > .env << 'EOF'
OPENAI_API_KEY=sk-proj-YOUR_OPENAI_KEY_HERE
EOF
```

کلید OpenAI را جایگزین کنید.

---

## مرحله ۴: اجرا با Docker

```bash
cd /opt/seo-dashboard
docker compose up -d --build
```

بررسی وضعیت:

```bash
docker compose ps
docker compose logs -f seo-dashboard
```

---

## مرحله ۵: Nginx (Reverse Proxy)

برای دسترسی از دامنه و HTTPS:

```bash
apt install -y nginx certbot python3-certbot-nginx

# ایجاد کانفیگ
cat > /etc/nginx/sites-available/seo-dashboard << 'EOF'
server {
    listen 80;
    server_name seo.amline.ir;  # دامنه خود را جایگزین کنید

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -s /etc/nginx/sites-available/seo-dashboard /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# SSL با Let's Encrypt
certbot --nginx -d seo.amline.ir
```

---

## به‌روزرسانی داده GSC

برای به‌روزرسانی دوره‌ای داده‌ها:

### روش ۱: آپلود دستی

```bash
scp docs/gsc_data/gsc_full_export.json root@YOUR_SERVER_IP:/opt/seo-dashboard/data/gsc/
```

### روش ۲: Cron روی سرور (با Python)

اگر Python و اسکریپت‌های GSC روی سرور نصب باشند:

```bash
# crontab -e
0 6 * * * cd /opt/gsc-scripts && python gsc_export_all.py && cp docs/gsc_data/gsc_full_export.json /opt/seo-dashboard/data/gsc/
```

### روش ۳: rsync از ویندوز

```powershell
scp E:\CTO\docs\gsc_data\gsc_full_export.json root@YOUR_SERVER_IP:/opt/seo-dashboard/data/gsc/
```

---

## دستورات مفید

```bash
# مشاهده لاگ
docker compose logs -f seo-dashboard

# ری‌استارت
docker compose restart seo-dashboard

# توقف
docker compose down

# بازسازی و اجرا
docker compose up -d --build
```

---

## عیب‌یابی

| مشکل | راه‌حل |
|------|--------|
| داده نمایش داده نمی‌شود | فایل `gsc_full_export.json` در `data/gsc/` قرار دارد؟ |
| چت کار نمی‌کند | `OPENAI_API_KEY` در `.env` تنظیم شده؟ |
| پورت 3003 باز نیست | فایروال: `ufw allow 3003` یا از Nginx استفاده کنید |
