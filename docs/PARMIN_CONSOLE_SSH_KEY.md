# پارمین: Console، کلید SSH، و deploy

برای گرفتن لینک Console از **API** (بدون کلیک در پنل) ببینید: [`PARMIN_API_CONSOLE.md`](PARMIN_API_CONSOLE.md).

## آنچه Cursor Agent نمی‌تواند انجام دهد

Agent به **مرورگر شما**، **پنل my.parmin.cloud**، یا **Console/VNC** دسترسی ندارد. نصب کلید روی سرور فقط با **یک بار** کار دستی مالک حساب در Console انجام می‌شود.

## گام ۱ — فقط مالک حساب (Console یا VNC)

1. وارد [my.parmin.cloud](https://my.parmin.cloud) شوید.
2. سرور **amline-plus** (یا نام فعلی سرویس) را باز کنید.
3. تب **Console** یا **VNC** را باز کنید و به shell دسترسی پیدا کنید.
4. **دقیقاً این یک خط** را paste کنید و Enter بزنید:

```bash
mkdir -p /root/.ssh && echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIQT36X9V7Pzs8zJeEwH8Ch7KRAB5jGUFyl0XSaEad1p amline-deploy' >> /root/.ssh/authorized_keys && chmod 700 /root/.ssh && chmod 600 /root/.ssh/authorized_keys && echo OK
```

5. اگر در خروجی **`OK`** دیدید، کلید عمومی روی سرور ثبت شده است.

این رشته یک **کلید عمومی** است؛ اشکالی ندارد در مستندات باشد. **کلید خصوصی** جفت این کلید را هرگز در چت یا git قرار ندهید.

## گام ۲ — امنیت پنل پارمین

اگر رمز ورود به پنل پارمین را در جایی عمومی (مثلاً چت) گذاشته‌اید، آن را **فوراً در تنظیمات حساب پارمین عوض کنید**.

## گام ۳ — بعد از OK: deploy از روی PC

جزئیات کامل در [`DEPLOY_BACKEND_PARMIN.md`](DEPLOY_BACKEND_PARMIN.md). خلاصه:

**Windows (PowerShell):**

```powershell
cd "d:\فنی املاین\مدیریتی\Amline_namAvaran"
.\scripts\deploy-backend-parmin-key.ps1 -IdentityFile "$HOME\.ssh\amline-deploy"
```

مسیر `-IdentityFile` باید همان **کلید خصوصی**ی باشد که جفت خط `ssh-ed25519 AAAAC3NzaC... amline-deploy` است.

**Linux / macOS:**

```bash
export PARMIN_SSH_KEY="$HOME/.ssh/amline-deploy"
./scripts/deploy-backend-parmin-key.sh
```

## تست سریع SSH (اختیاری)

```bash
ssh -i ~/.ssh/amline-deploy -o IdentitiesOnly=yes root@212.80.24.109 "echo connected"
```

(اگر IP سرور عوض شد، همان را بگذارید.)

## فایل‌های مرتبط در ریپو

| فایل | نقش |
|------|-----|
| [`scripts/deploy-backend-parmin-key.ps1`](../scripts/deploy-backend-parmin-key.ps1) | deploy با کلید، ویندوز |
| [`scripts/deploy-backend-parmin-key.sh`](../scripts/deploy-backend-parmin-key.sh) | deploy با کلید، Unix |
| [`scripts/parmin-server-deploy.sh`](../scripts/parmin-server-deploy.sh) | اجرا روی سرور پس از آپلود |
