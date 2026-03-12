# راهنمای دیپلوی داشبورد سئو روی پارمین کلود

## ✅ وضعیت فعلی

داشبورد در آدرس زیر **فعال** است:
- **http://212.80.24.109:3003** (مستقیم)
- **http://seo.amline.ir/seo** (بعد از تنظیم DNS و Nginx)

---

## مرحله صفر: تنظیم DNS (برای دامنه seo.amline.ir)

### روش ۱: دستی در پنل آروان

1. وارد [panel.arvancloud.ir](https://panel.arvancloud.ir/) شوید
2. دامنه **amline.ir** → **مدیریت DNS**
3. رکورد جدید: **نوع A** | **نام: seo** | **مقدار: 212.80.24.109** | TTL: 3600

### روش ۲: خودکار با اسکریپت (نیاز به API Key آروان)

```powershell
# API Key را از پنل آروان: پروفایل → API Key بگیرید
$env:ARVAN_API_KEY = "کلید_شما"
python setup_dns_arvan.py
```

---

## ⚠️ مرحله اول: تنظیم متغیرهای محیطی

قبل از دیپلوی، باید متغیرهای محیطی لازم را تنظیم کنید:

```powershell
# در PowerShell:
$env:DEPLOY_PASSWORD = "رمز_جدید_سرور"
$env:OPENAI_API_KEY = "کلید_اپن‌ای‌آی_شما"
```

یا می‌توانید در فایل `.env` در ریشه پروژه تنظیم کنید:

```env
DEPLOY_PASSWORD=رمز_جدید_سرور
OPENAI_API_KEY=sk-proj-...
```

---

## مرحله دوم: تغییر رمز عبور سرور (در صورت نیاز)

اگر رمز عبور سرور منقضی شده، باید آن را عوض کنید.

### روش ۱: کنسول پارمین کلود (پیشنهادی)

1. وارد پنل پارمین کلود شوید: https://my.parmin.cloud
2. به سرویس **Amline-plus** بروید
3. تب **دسترسی** یا **Access** را باز کنید
4. روی **کنسول** یا **Console** / **VNC** کلیک کنید (دکمه‌ای برای دسترسی مستقیم به سرور)
5. با root و رمز فعلی وارد شوید
6. در صورت درخواست تغییر رمز، رمز جدید وارد کنید
7. یا دستی اجرا کنید:
   ```bash
   passwd
   # رمز جدید را دو بار وارد کنید
   ```

### روش ۲: SSH با ترمینال

```bash
ssh root@212.80.24.109
# رمز فعلی را وارد کنید
# اگر رمز منقضی شده، درخواست رمز جدید می‌کند
passwd
# رمز جدید را تنظیم کنید
```

---

## مرحله دوم: اجرای دیپلوی

### روش یک‌کلیک (پیشنهادی)

```powershell
cd E:\CTO

# ۱. فایل .env بسازید (یک بار):
#    Copy-Item .env.deploy.example .env
#    سپس .env را باز کنید و DEPLOY_PASSWORD و OPENAI_API_KEY را پر کنید

# ۲. دیپلوی:
.\deploy-seo-amline.ps1
```

### روش دستی

```powershell
cd E:\CTO
$env:DEPLOY_PASSWORD = "رمز_root_سرور"
$env:OPENAI_API_KEY = "sk-proj-..."
$env:DEPLOY_TARGET = "parmin"
python deploy_amline.py
```

**رمز root سرور** را از پنل پارمین (کنسول/VNC سرور) می‌توانید ببینید یا عوض کنید.

---

## دیپلوی دستی (بدون اسکریپت)

```powershell
# ۱. آپلود فایل‌ها
scp -o StrictHostKeyChecking=no E:\CTO\seo-dashboard-deploy.tar.gz root@212.80.24.109:/tmp/
scp -o StrictHostKeyChecking=no E:\CTO\docs\gsc_data\gsc_full_export.json root@212.80.24.109:/tmp/

# ۲. اتصال به سرور
ssh root@212.80.24.109

# ۳. روی سرور اجرا کنید:
apt-get update && apt-get install -y docker.io docker-compose
systemctl enable docker && systemctl start docker
mkdir -p /opt/amline/seo-dashboard
tar -xzf /tmp/seo-dashboard-deploy.tar.gz -C /opt/amline/seo-dashboard
cp /tmp/gsc_full_export.json /opt/amline/seo-dashboard/data/gsc/
echo 'OPENAI_API_KEY=sk-proj-YOUR_KEY' > /opt/amline/seo-dashboard/.env
cd /opt/amline/seo-dashboard && docker compose up -d --build
```

---

## بعد از دیپلوی

داشبورد در آدرس‌های زیر در دسترس است:
- **http://212.80.24.109:3003/seo**
- **http://seo.amline.ir/seo** (بعد از تنظیم DNS)

**نکته:** Nginx برای `seo.amline.ir` به‌صورت خودکار در مرحله دیپلوی تنظیم می‌شود.

### فعال‌سازی HTTPS (SSL)

بعد از اینکه DNS فعال شد (۵ تا ۳۰ دقیقه):

```bash
ssh root@212.80.24.109
apt install -y certbot python3-certbot-nginx
certbot --nginx -d seo.amline.ir
```

بعد از آن: **https://seo.amline.ir/seo**
