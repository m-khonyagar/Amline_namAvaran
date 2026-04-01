# Deploy بک‌اند روی Parmin (212.80.24.109)

Stack: `postgres` + `redis` + `minio` + `backend` از [`docker-compose.yml`](../docker-compose.yml) روی سرور Ubuntu.

## روش پیشنهادی: فقط SSH key (بدون پسورد SSH)

اگر روی سرور `PasswordAuthentication no` است، یک‌بار از **Console/VNC پارمین** کلید عمومی را به `/root/.ssh/authorized_keys` اضافه کن — **راهنمای گام‌به‌گام و دستور یک‌خطی:** [`PARMIN_CONSOLE_SSH_KEY.md`](PARMIN_CONSOLE_SSH_KEY.md).

بعد روی PC:

**Windows (PowerShell):**

```powershell
cd D:\path\to\Amline_namAvaran
.\scripts\deploy-backend-parmin-key.ps1 -IdentityFile "$HOME\.ssh\amline-deploy"
```

یا `$env:PARMIN_SSH_KEY = "$HOME\.ssh\amline-deploy"` و اجرای همان اسکریپت بدون پارامتر (اگر فایل کلید یکی از `amline-deploy` / `id_ed25519` / `id_rsa` باشد).

**Linux / macOS / Git Bash:**

```bash
export PARMIN_SSH_KEY="$HOME/.ssh/amline-deploy"
chmod +x scripts/deploy-backend-parmin-key.sh
./scripts/deploy-backend-parmin-key.sh
```

نیازمند **OpenSSH Client** روی ویندوز (ویژگی اختیاری ویندوز). اسکریپت همان [`parmin-server-deploy.sh`](../scripts/parmin-server-deploy.sh) را روی سرور اجرا می‌کند.

---

## روش جایگزین: پسورد + PuTTY یا sshpass

رمز **root** را در هیچ فایلی commit نکن؛ فقط در ترمینال محلی با `DEPLOY_PASSWORD` بده.

## پیش‌نیاز محلی

- **Linux / WSL / Git Bash** با `sshpass` و `ssh` و ترجیحاً `rsync`.
- **ویندوز (بدون WSL):** PuTTY (`plink` / `pscp`). نصب سریع: `winget install PuTTY.PuTTY`. اسکریپت از `ssh-keyscan` (OpenSSH ویندوز) برای `-hostkey` استفاده می‌کند تا `pscp` با `-batch` بدون سؤال تعاملی کار کند.

## اجرا (Bash / Git Bash / WSL)

```bash
cd /path/to/Amline_namAvaran
export DEPLOY_PASSWORD='...'   # از تب «دسترسی» پنل Parmin
chmod +x scripts/deploy-backend-parmin.sh
./scripts/deploy-backend-parmin.sh
```

## اجرا (PowerShell ویندوز)

```powershell
cd D:\path\to\Amline_namAvaran
$env:DEPLOY_PASSWORD = 'رمز-کپی‌شده-از-پنل-Parmin'
.\scripts\deploy-backend-parmin.ps1
```

اسکریپت بایگانی `tar` می‌سازد، با `pscp` به `/tmp/amline-src.tgz` می‌فرستد، سپس [`scripts/parmin-server-deploy.sh`](../scripts/parmin-server-deploy.sh) را روی سرور اجرا می‌کند.

متغیرهای اختیاری: `PARMIN_HOST`, `PARMIN_USER`, `PARMIN_REMOTE_DIR`.

اسکریپت روی سرور Docker و `docker compose` را نصب می‌کند (در صورت نیاز)، کد ریپو را به `/opt/amline/Amline_namAvaran` همگام می‌کند، در نبود `.env` آن را از `.env.example` می‌سازد، سپس:

`docker compose up -d --build postgres redis minio backend`

و در پایان `curl` به `http://127.0.0.1:8080/health` و یک `POST /admin/login` تستی اجرا می‌کند.

## پس از deploy

1. **`.env` روی سرور** را بازبین کن: `JWT_SECRET`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, کلیدهای MinIO و غیره را برای production قوی کن.
2. **`api.amline.ir`**: اگر هنوز به API قدیمی می‌خورد، در Nginx سرور `proxy_pass` را به `http://127.0.0.1:8080` ببر (snippet زیر).
3. **تداخل پورت**: اگر قبلاً روی هاست 5432/6379/8080 سرویس دیگری است، قبل از `up` conflict را حل کن.

## Snippet Nginx برای `api.amline.ir`

فقط الگو است؛ مسیر فایل کانفیگ روی سرور ممکن است فرق کند (`sites-available` / `conf.d`).

```nginx
server {
    listen 443 ssl;
    server_name api.amline.ir;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

بعد از ویرایش: `nginx -t && systemctl reload nginx`.

## یادداشت

- اولین بار با volume خالی Postgres، دیتابیس تازه است؛ migration با `CMD` تصویر backend (`alembic upgrade head`) اجرا می‌شود.
- اگر `GET` به `/admin/login` بزنی **405** طبیعی است؛ ورود با **POST** و JSON است.
