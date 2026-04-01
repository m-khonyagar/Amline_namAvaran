# پارمین: باز کردن Console با API

این راهنما مکمل [`PARMIN_CONSOLE_SSH_KEY.md`](PARMIN_CONSOLE_SSH_KEY.md) است: اگر SSH با رمز root کار نکند (مثلاً `PasswordAuthentication no`)، می‌توانید با **API رسمی پارمین** یک لینک **کوتاه‌عمر** به noVNC / Console بگیرید و همان **یک خط** نصب کلید را در ترمینال VNC paste کنید.

## پیش‌نیاز

```bash
pip install -r scripts/requirements-parmin.txt
```

(وابستگی جدا از `dev-mock-api` است.)

## مرجع سریع (فایل‌ها + یک خط اجرا)

| نقش | مسیر در ریپو |
|-----|----------------|
| اسکریپت | [`scripts/parmin_open_console.py`](../scripts/parmin_open_console.py) |
| وابستگی pip | [`scripts/requirements-parmin.txt`](../scripts/requirements-parmin.txt) |
| راهنمای کامل همین موضوع | [`docs/PARMIN_API_CONSOLE.md`](PARMIN_API_CONSOLE.md) (همین فایل) |
| بعد از باز شدن کنسول: paste کلید | [`docs/PARMIN_CONSOLE_SSH_KEY.md`](PARMIN_CONSOLE_SSH_KEY.md) |
| deploy با SSH key | [`scripts/deploy-backend-parmin-key.ps1`](../scripts/deploy-backend-parmin-key.ps1) / [`.sh`](../scripts/deploy-backend-parmin-key.sh) |

**Bash (مقادیر را جایگزین کنید؛ خط اول فقط یک‌بار):**

```bash
cd Amline_namAvaran && pip install -r scripts/requirements-parmin.txt
export PARMIN_USERNAME='09xxxxxxxxx' PARMIN_PASSWORD='…' PARMIN_SERVER_ID='2435'
python scripts/parmin_open_console.py --open-browser
```

**PowerShell:**

```powershell
cd "d:\فنی املاین\مدیریتی\Amline_namAvaran"
pip install -r scripts/requirements-parmin.txt
$env:PARMIN_USERNAME='09xxxxxxxxx'; $env:PARMIN_PASSWORD='…'; $env:PARMIN_SERVER_ID='2435'
python scripts/parmin_open_console.py --open-browser
```

## شکل API (تأیید شده علیه `api.parmin.cloud`)

- **لاگین:** `POST {PARMIN_API_BASE}/auth/password` با JSON شامل فیلد **`mobile`** (شماره موبایل حساب) و **`password`**.
- **توکن:** در پاسخ موفق معمولاً زیر **`access_token.token`** است؛ اسکریپت چند شکل رایج دیگر را هم می‌پذیرد.
- **کنسول:** `POST .../servers/{id}/create-console` با هدر `Authorization: Bearer <token>`.

## متغیرهای محیطی (الزامی)

| متغیر | توضیح |
|--------|--------|
| `PARMIN_USERNAME` یا `PARMIN_EMAIL` | برای پنل فعلی پارمین = **شماره موبایل** (همان مقداری که در JSON با فیلد `mobile` می‌رود؛ پیش‌فرض فیلد همان است) |
| `PARMIN_PASSWORD` | رمز پنل (**هرگز** در git یا چت عمومی نگذارید) |
| `PARMIN_SERVER_ID` | شناسهٔ عددی سرور در API (مثال سابق برای **amline-plus**: `2435`) |

## اختیاری

| متغیر | پیش‌فرض | توضیح |
|--------|---------|--------|
| `PARMIN_API_BASE` | `https://api.parmin.cloud/api_v1.0` | پایهٔ API |
| `PARMIN_LOGIN_PATH` | (پیش‌فرض: `/auth/password` و چند مسیر پشتیبان) | در صورت تغییر API، مسیر دقیق را از DevTools بگذارید (نسبت به `PARMIN_API_BASE`) |
| `PARMIN_CONSOLE_PATH` | `/servers/{id}/create-console` | `{id}` یا `{server_id}` با `PARMIN_SERVER_ID` جایگزین می‌شود |
| `PARMIN_AUTH_HEADER` | `Bearer` | پیشوند هدر `Authorization`؛ برای `none` هدر زده نمی‌شود (مثلاً اگر فقط کوکی لاگین کافی باشد) |
| `PARMIN_NEED_OTP` | خالی (= false) | اگر باید در بدنهٔ لاگین `need_otp` ارسال شود، `1` بگذارید |
| `PARMIN_INCLUDE_NEED_OTP` | خالی | اگر API حتی برای `false` هم به کلید `need_otp` در JSON نیاز دارد، `1` بگذارید |
| `PARMIN_USERNAME_FIELD` / `PARMIN_PASSWORD_FIELD` | `mobile` / `password` | نام فیلدهای JSON بدنهٔ لاگین (پنل فعلی: `mobile`) |
| `PARMIN_OPEN_BROWSER` | — | مقدار `1` مثل `--open-browser` تب مرورگر را باز می‌کند |
| `PARMIN_PRINT_BOOTSTRAP_CMD` | — | `1` مثل `--print-bootstrap-cmd`: بعد از URL، همان دستور یک‌خطی `authorized_keys` روی stderr |
| `PARMIN_BOOTSTRAP_PUBKEY_FILE` | — | مسیر فایل `.pub`؛ وگرنه به‌ترتیب `~/.ssh/amline_deploy.pub` و `amline-deploy.pub` |
| `PARMIN_BOOTSTRAP_PUBKEY` | — | یک خط کامل کلید عمومی (اگر فایل ندارید) |
| `PARMIN_DEBUG` | — | `1` برای چاپ وضعیت درخواست‌ها و بدنهٔ JSON (بدون چاپ رمز) |

**فقط دستور paste (بدون API):** `python scripts/parmin_open_console.py --bootstrap-cmd-only`

## اجرا

```bash
cd Amline_namAvaran
export PARMIN_USERNAME="09xxxxxxxxx"   # موبایل ثبت‌شده در پارمین
export PARMIN_PASSWORD="..."   # فقط در شل موقت
export PARMIN_SERVER_ID="2435"
python scripts/parmin_open_console.py
```

باز کردن خودکار مرورگر:

```bash
python scripts/parmin_open_console.py --open-browser
```

**Windows (PowerShell):**

```powershell
$env:PARMIN_USERNAME = "09xxxxxxxxx"
$env:PARMIN_PASSWORD = "..."
$env:PARMIN_SERVER_ID = "2435"
python scripts/parmin_open_console.py --open-browser
```

خروجی: **یک URL** (معمولاً HTTPS). لینک معمولاً **زود منقضی** می‌شود؛ فوراً باز کنید.

## بعد از باز شدن Console

همان مراحل [`PARMIN_CONSOLE_SSH_KEY.md`](PARMIN_CONSOLE_SSH_KEY.md) — paste کردن دستور `authorized_keys`، سپس deploy با [`scripts/deploy-backend-parmin-key.ps1`](../scripts/deploy-backend-parmin-key.ps1) یا `.sh`.

## امنیت

- هر رمز یا توکنی که در جای ناامن فاش شده باشد را **در پنل پارمین عوض کنید** و فرض کنید افشا شده است.
- توکن API را فقط در **env موقت** نگه دارید؛ در فایل پروژه یا git قرار ندهید.
- این اسکریپت عمداً **رمز یا توکن را لاگ نمی‌کند**؛ با `PARMIN_DEBUG=1` فقط ساختار پاسخ دیده می‌شود.

## اگر JSON API با اسکریپت هم‌خوان نبود

پاسخ واقعی API ممکن است نام فیلد دیگری برای توکن یا URL داشته باشد. با `PARMIN_DEBUG=1` یک بار اجرا کنید؛ در صورت نیاز توابع `extract_token` / `extract_console_url` در [`scripts/parmin_open_console.py`](../scripts/parmin_open_console.py) را مطابق پاسخ واقعی به‌روز کنید (یا `PARMIN_LOGIN_PATH` و فیلدهای بدنه را با DevTools تنظیم کنید).
