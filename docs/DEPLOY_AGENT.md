# دیپلوی داشبورد سئو روی agent.amline.ir

## پیش‌نیاز

- زیردامنه `agent.amline.ir` به IP `212.80.24.203` اشاره می‌کند
- دسترسی SSH به سرور با کاربر root

## مراحل دیپلوی

### ۱. ساخت تاربال (با basePath خالی برای روت دامنه)

```powershell
cd E:\CTO
powershell -ExecutionPolicy Bypass -File scripts\build-seo-deploy.ps1
```

### ۲. اجرای دیپلوی

```powershell
$env:DEPLOY_TARGET = "agent"
$env:DEPLOY_PASSWORD = "رمز_root_سرور_212.80.24.203"
$env:OPENAI_API_KEY = "sk-..."
python deploy_amline.py
```

### ۳. تنظیم Nginx روی سرور 212.80.24.203

بعد از دیپلوی موفق، Nginx را برای agent.amline.ir تنظیم کن:

```bash
# کپی کانفیگ
cp /opt/amline/seo-dashboard/nginx-agent.conf /etc/nginx/sites-available/agent.amline.ir

# یا ایجاد دستی
nano /etc/nginx/sites-available/agent.amline.ir
```

محتوا (فایل `seo-dashboard/nginx-agent.conf`):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name agent.amline.ir;

    location / {
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
}
```

فعال‌سازی و ری‌لود:

```bash
ln -sf /etc/nginx/sites-available/agent.amline.ir /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### ۴. SSL (اختیاری)

```bash
certbot --nginx -d agent.amline.ir
```

---

## آدرس نهایی

**https://agent.amline.ir/**
