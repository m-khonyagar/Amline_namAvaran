# راه‌اندازی دیپلوی agent.amline.ir

## وضعیت فعلی

سرور `212.80.24.203` رمز عبور را رد می‌کند. اتصال برقرار می‌شود اما احراز هویت ناموفق است.

## گزینه ۱: تست رمز عبور

در ترمینال خودت امتحان کن:

```powershell
ssh root@212.80.24.203
```

رمز: `~XdQtr0<F<s6Q.8$gmLa`

اگر وارد شدی، همان رمز را در `run_deploy_agent.py` بگذار و اجرا کن:

```powershell
python e:\CTO\run_deploy_agent.py
```

## گزینه ۲: استفاده از کلید SSH (پیشنهادی)

### مرحله ۱: ساخت کلید

```powershell
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\id_ed25519_amline -N '""'
```

### مرحله ۲: اضافه کردن کلید به سرور

با **کنسول وب** (VNC/Console) پنل ابری به سرور وصل شو و اجرا کن:

```bash
mkdir -p /root/.ssh
echo "محتوای_فایل_id_ed25519_amline.pub" >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
```

### مرحله ۳: دیپلوی با کلید

```powershell
$env:DEPLOY_SSH_KEY = "$env:USERPROFILE\.ssh\id_ed25519_amline"
$env:DEPLOY_PASSWORD = ""
python e:\CTO\run_deploy_agent.py
```

## گزینه ۳: دیپلوی با GitHub Actions

### مرحله ۱: کلید SSH

```powershell
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\id_ed25519_github_deploy -N '""'
```

### مرحله ۲: اضافه کردن به سرور

محتوای `id_ed25519_github_deploy.pub` را در `authorized_keys` سرور قرار بده.

### مرحله ۳: Secrets در GitHub

در مخزن GitHub: **Settings → Secrets and variables → Actions**:

| نام | مقدار |
|-----|-------|
| `DEPLOY_SSH_KEY` | محتوای کامل فایل `id_ed25519_github_deploy` (کلید خصوصی) |
| `OPENAI_API_KEY` | کلید API اپن‌ای‌آی |

### مرحله ۴: اجرای دیپلوی

**Actions → Deploy SEO Dashboard → Run workflow**

---

## گزینه ۴: ریست رمز از طریق کنسول

اگر به کنسول سرور (مثلاً از پنل پارمین/آروان) دسترسی داری:

```bash
passwd root
# رمز جدید را وارد کن
```

بعد از آن اسکریپت دیپلوی را با رمز جدید اجرا کن.
