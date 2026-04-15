# راهنمای دیپلوی Amline روی سرور

## ۱. پیش‌نیازها

### GitHub Secrets (Settings → Secrets and variables → Actions)

| Secret | توضیح | نمونه |
|--------|-------|-------|
| `DEPLOY_SSH_KEY` | کلید SSH خصوصی (ed25519 یا RSA) | محتوای فایل `~/.ssh/id_ed25519` |
| `DEPLOY_HOST` | آدرس IP یا دامنه سرور | `212.80.24.109` |
| `DEPLOY_USER` | نام کاربری SSH (اختیاری، پیش‌فرض: `root`) | `root` |

**ساخت کلید SSH:**
```bash
# روی کامپیوتر خودتان:
ssh-keygen -t ed25519 -f ~/.ssh/amline_deploy -N ""

# کلید عمومی را روی سرور کپی کنید:
ssh-copy-id -i ~/.ssh/amline_deploy.pub root@YOUR_SERVER_IP

# محتوای کلید خصوصی را به GitHub Secret اضافه کنید:
cat ~/.ssh/amline_deploy
```

---

## ۲. آماده‌سازی سرور (یک‌بار)

### روش خودکار (پیشنهادی)
```bash
# روی سرور اجرا کنید:
curl -fsSL https://raw.githubusercontent.com/m-khonyagar/Amline_namAvaran/main/scripts/server-setup.sh | bash
```

اسکریپت `server-setup.sh` موارد زیر را نصب و تنظیم می‌کند:
- Docker + Docker Compose v2
- فایروال UFW (پورت‌های ۲۲، ۸۰، ۴۴۳)
- Nginx به عنوان reverse proxy
- Certbot برای SSL/TLS
- کلون مخزن در `/opt/amline/app`
- ساخت `.env` با کلیدهای امنیتی خودکار

### روش دستی
```bash
# ۱. نصب Docker
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin

# ۲. فایروال
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
ufw --force enable

# ۳. Nginx
apt-get install -y nginx certbot python3-certbot-nginx

# ۴. کلون پروژه
mkdir -p /opt/amline
git clone https://github.com/m-khonyagar/Amline_namAvaran.git /opt/amline/app
cd /opt/amline/app

# ۵. ساخت .env
cp .env.production.example .env
nano .env   # مقادیر را پر کنید

# ۶. تنظیم nginx
cp docker/nginx/amline.conf /etc/nginx/sites-available/amline
ln -sf /etc/nginx/sites-available/amline /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### مقادیر مهم در `.env`
```bash
# اجباری — حتماً مقدار واقعی بگذارید:
JWT_SECRET=$(openssl rand -hex 32)
SECRET_KEY=$(openssl rand -hex 32)
POSTGRES_PASSWORD=یک_پسورد_قوی
REDIS_PASSWORD=یک_پسورد_قوی
MINIO_SECRET_KEY=یک_پسورد_قوی
BOOTSTRAP_ADMIN_MOBILE=09120000000

# برای ارسال OTP واقعی (اختیاری):
KAVENEGAR_API_KEY=کلید_از_kavenegar.com

# دامنه‌های frontend:
CORS_ORIGINS=https://admin.amline.ir,https://app.amline.ir
```

---

## ۳. دیپلوی

### دیپلوی خودکار (CI/CD)
بعد از هر push به `main`، دیپلوی خودکار اجرا می‌شود (به شرط تنظیم GitHub Secrets).

### دیپلوی دستی روی سرور
```bash
cd /opt/amline/app
git pull origin main
bash deploy-production.sh
```

### دیپلوی با Docker Compose (بدون اسکریپت)
```bash
cd /opt/amline/app
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## ۴. تنظیم DNS و HTTPS

### رکوردهای DNS (A Record)
| ساب‌دامنه | مقدار | توضیح |
|-----------|-------|-------|
| `api.amline.ir` | IP سرور | Backend API |
| `app.amline.ir` | IP سرور | اپلیکیشن کاربران |
| `admin.amline.ir` | IP سرور | پنل ادمین |
| `amline.ir` | IP سرور | سایت مارکتینگ |
| `consultant.amline.ir` | IP سرور | پنل مشاوران |
| `seo.amline.ir` | IP سرور | داشبورد سئو |

### فعال‌سازی HTTPS
```bash
certbot --nginx \
  -d api.amline.ir \
  -d app.amline.ir \
  -d admin.amline.ir \
  -d amline.ir \
  -d consultant.amline.ir \
  -d seo.amline.ir
```

---

## ۵. پورت‌ها

| سرویس | پورت داخلی | دامنه |
|--------|------------|-------|
| Backend API | 8080 | api.amline.ir |
| Admin UI | 3002 | admin.amline.ir |
| Amline UI (کاربران) | 3000 | app.amline.ir |
| Site | 3001 | amline.ir |
| Consultant UI | 3004 | consultant.amline.ir |
| SEO Dashboard | 3003 | seo.amline.ir |
| PDF Generator | 8001 | (داخلی) |
| MinIO Console | 9001 | (داخلی) |

---

## ۶. بررسی وضعیت

```bash
# وضعیت سرویس‌ها
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# لاگ‌ها
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs backend --tail=50

# سلامت API
curl http://localhost:8080/health
```

---

## ۷. آپدیت

```bash
cd /opt/amline/app
git pull origin main
bash deploy-production.sh
```

## ۸. Container Registry (GHCR)

ایمیج‌های Docker در هر push به `main` به صورت خودکار به GitHub Container Registry پوش می‌شوند:

```
ghcr.io/m-khonyagar/amline-backend:latest
ghcr.io/m-khonyagar/amline-admin-ui:latest
ghcr.io/m-khonyagar/amline-amline-ui:latest
ghcr.io/m-khonyagar/amline-site:latest
ghcr.io/m-khonyagar/amline-consultant-ui:latest
ghcr.io/m-khonyagar/amline-pdf-generator:latest
ghcr.io/m-khonyagar/amline-channel-gateway:latest
```
