# راهنمای دیپلوی Amline روی سرور

## پیش‌نیازها روی سرور

```bash
# Docker + Docker Compose
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin
```

## مراحل اول (یک‌بار)

```bash
# ۱. کلون پروژه
mkdir -p /opt/amline
cd /opt/amline
git clone https://github.com/m-khonyagar/Amline_namAvaran.git app
cd app

# ۲. ساخت .env از نمونه
cp .env.production.example .env
nano .env   # مقادیر را پر کنید

# مهم‌ترین مقادیر:
# JWT_SECRET  → openssl rand -hex 32
# SECRET_KEY  → openssl rand -hex 32
# POSTGRES_PASSWORD → یک پسورد قوی
# BOOTSTRAP_ADMIN_MOBILE → مثال کانون تست: 09100000000 (با OTP از SMS یا با AMLINE_FIXED_TEST_OTP_ENABLED=true و کد 11111)
# CORS_ORIGINS → دامنه‌های frontend

# ۳. دیپلوی
bash deploy.sh
```

## آپدیت بعدی

```bash
cd /opt/amline/app
git pull origin main
bash deploy.sh
```

## پورت‌ها

| سرویس | پورت |
|-------|------|
| Backend API | 8080 |
| Admin UI | 3002 |
| Amline UI (کاربران) | 3000 |
| Site | 3001 |
| Consultant UI | 3004 |
| SEO Dashboard | 3003 |
| MinIO Console | 9001 |

## GitHub Actions (دیپلوی خودکار)

در تنظیمات ریپو → Secrets → Actions این مقادیر را اضافه کنید:

- `DEPLOY_SSH_KEY` — کلید SSH خصوصی برای اتصال به سرور
- `DEPLOY_HOST` — IP یا دامنه سرور
- `DEPLOY_USER` — نام کاربر SSH (معمولاً `root`)

بعد از هر push به `main`، دیپلوی خودکار اجرا می‌شود.

## بررسی وضعیت

```bash
docker compose ps
docker compose logs backend --tail=50
curl http://localhost:8080/health
```
