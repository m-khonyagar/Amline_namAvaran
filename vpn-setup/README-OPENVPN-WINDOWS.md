# OpenVPN روی ویندوز: همهٔ برنامه‌ها از تونل استفاده کنند + مشکل ChatGPT

این سند برای **OpenVPN Connect** (یا کلاینت رسمی با TAP/Wintun) روی Windows 10/11 است.

## ۰) پروکسی سیستم (WinINET) — علت رایج «ChatGPT is unable to load» با VPN

اگر در **Settings → Network & Internet → Proxy** یا رجیستری `Internet Settings` یک **HTTP proxy** (مثلاً `IP:port`) تنظیم شده باشد، برنامه‌هایی مثل **ChatGPT دسکتاپ** (مبتنی بر Chromium) ترافیک HTTPS را از همان پروکسی می‌فرستند.

وقتی **OpenVPN** وصل است، ممکن است به آن آدرس پروکسی از داخل تونل **دسترسی نباشد** یا پروکسی **CONNECT** به دامنه‌های OpenAI را باز نکند؛ نتیجه: **TCP مستقیم** (مثلاً در `Test-NetConnection`) موفق به نظر می‌رسد ولی **HTTPS در اپ timeout** می‌شود.

**رفع بدون قطع VPN:** دامنه‌های OpenAI/ChatGPT را به **استثنای پروکسی** (`ProxyOverride`) اضافه کنید:

```powershell
cd E:\CTO\vpn-setup
powershell -ExecutionPolicy Bypass -File .\fix-wininet-proxy-bypass-openai.ps1
```

سپس **ChatGPT را یک بار ببندید و دوباره باز کنید**. این کار فقط `HKCU\...\Internet Settings` را عوض می‌کند؛ **تنظیمات OpenVPN را لمس نمی‌کند.**

برای بررسی:

```powershell
powershell -ExecutionPolicy Bypass -File .\verify-proxy-bypass.ps1
```

---

## ۱) چرا بعضی برنامه‌ها «مثل سیستم» از VPN استفاده نمی‌کنند؟

| علت | توضیح کوتاه |
|-----|----------------|
| **پروکسی WinINET** | اپ‌ها HTTPS را از پروکسی سیستم می‌فرستند؛ با VPN ممکن است پروکسی در دسترس نباشد (بخش ۰). |
| **تونل ناقص (split tunnel)** | فقط بخشی از ترافیک به VPN می‌رود؛ بقیه از Wi‑Fi/اینترنت عادی. |
| **DNS بیرون از VPN** | ویندوز هنوز از DNS آداپتر فیزیکی استفاده می‌کند و سایت‌ها را «اشتباه» resolve می‌کند. |
| **IPv6** | اگر IPv6 از آداپتر اصلی بیرون برود و IPv4 از VPN، رفتار اپ‌ها عجیب می‌شود. |
| **مسدود بودن IP خروجی توسط سرویس** | OpenAI/ChatGPT اغلب **IP مراکز داده و VPN** را محدود می‌کند؛ در این حالت «تنظیم OpenVPN» مشکل را حل نمی‌کند مگر IP دیگری (مثلاً residential) بگیرید یا برای آن سرویس split tunnel کنید. |

## ۲) تنظیمات پیشنهادی پروفایل (سمت سرور یا فایل `.ovpn`)

اگر به محتوای پروفایل دسترسی دارید، معمولاً این‌ها **تمام ترافیک پیش‌فرض** را به VPN می‌کشند و DNS را به تونل نزدیک می‌کنند:

```text
# همهٔ IPv4 پیش‌فرض از تونل (الگوی رایج OpenVPN)
redirect-gateway def1

# اگر سرور IPv6 می‌دهد و می‌خواهید IPv6 هم از تونل برود:
# redirect-gateway def1 ipv6

# جلوگیری از استفادهٔ DNS آداپترهای غیر VPN (OpenVPN 2.4+)
block-outside-dns
```

اگر سرور `redirect-gateway` را **push** نمی‌کند، گاهی در **انتهای** همان `.ovpn` (بعد از `remote` و گواهی‌ها) می‌توان این خطوط را اضافه کرد؛ بسته به سیاست سرور ممکن است نیاز به تأیید ارائه‌دهنده VPN باشد.

### نمونهٔ ادغام با پروفایل موجود

فایل `openvpn-profile-append.txt` در همین پوشه را ببینید؛ خطوط را طبق دستور ارائه‌دهندهٔ VPN فقط در صورت مجاز بودن اضافه کنید.

## ۳) OpenVPN Connect (رابط گرافیکی)

- **Settings → Advanced** (در نسخه‌های جدید ممکن است نام بخش فرق کند): گزینه‌های مربوط به **Full tunnel** / **Block DNS outside VPN** را اگر هست فعال کنید.
- بعد از اتصال، یک بار **Windows را از Wi‑Fi قطع و وصل** نکنید مگر لازم باشد؛ گاهی ترتیب interface عوض می‌شود.

## ۴) IPv6 (در صورت مشکل اتصال بعضی اپ‌ها)

موقت برای عیب‌یابی:

1. **Settings → Network & Internet → Ethernet/Wi‑Fi → Properties**
2. **Internet Protocol Version 6 (TCP/IPv6)** را غیرفعال کنید و دوباره تست کنید.

اگر با غیرفعال کردن IPv6 مشکل برطرف شد، روی سرور VPN باید IPv6 درست push شود یا همان حالت IPv4-only نگه دارید.

## ۵) ChatGPT به‌خصوص

- اگر **بدون VPN** وصل می‌شود و **با VPN** نه، احتمال زیاد **IP خروجی VPN** توسط OpenAI رد می‌شود، نه «اشکال ویندوز».
- راه‌حل‌های رایج:
  - سرور/لوکیشن دیگر VPN؛
  - **split tunnel**: ترافیک OpenAI از اینترنت عادی برود (بسته به کلاینت ممکن است پیچیده باشد)؛
  - برای استفادهٔ ChatGPT موقتاً VPN را قطع کنید.

## ۶) تشخیص سریع روی همین PC

PowerShell را باز کنید (در صورت امکان **Run as administrator**):

```powershell
cd E:\CTO\vpn-setup
Set-ExecutionPolicy -Scope Process Bypass -Force
.\diagnose-openvpn-windows.ps1
```

خروجی مسیرهای پیش‌فرض، DNS هر آداپتر و یک تست ساده به `api.openai.com` را نشان می‌دهد.

---

## ارتباط با بقیهٔ این مخزن

راهنمای کلی VPN (WARP / WireGuard) در `README.md` است؛ این فایل فقط **OpenVPN + ویندوز + یکپارچگی سیستم** را پوشش می‌دهد.
