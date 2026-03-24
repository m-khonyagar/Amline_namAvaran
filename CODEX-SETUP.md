# راهنمای نصب و اتصال Codex

## وضعیت نصب (بررسی شده)

- **Codex از Microsoft Store نصب شده است** (OpenAI.Codex، نسخه 26.311.2262.0).
- مسیر نصب: `C:\Program Files\WindowsApps\OpenAI.Codex_26.311.2262.0_x64__2p2nqsd0c76g0`

## اجرای Codex

- از **منوی Start** عبارت **Codex** را جستجو کنید و برنامه را باز کنید.
- یا در PowerShell:  
  `Start-Process "explorer.exe" -ArgumentList "shell:AppsFolder\OpenAI.Codex_2p2nqsd0c76g0!App"`

## بعد از باز شدن Codex

1. با **حساب OpenAI** وارد شوید (Sign in).
2. در صورت درخواست API key: در [OpenAI API keys](https://platform.openai.com/api-keys) یک کلید **جدید** بسازید و **فقط** در خود برنامه Codex وارد کنید.
3. داخل Codex: **Add project** یا **Open folder** → مسیر **`e:\CTO`** را انتخاب کنید.

## اسکریپت خودکار (برای نصب مجدد یا اجرا)

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
& "e:\CTO\install-and-run-codex.ps1"
```

---

**نکته امنیتی:** API key را فقط در تنظیمات Codex روی همین دستگاه وارد کنید؛ در چت یا فایل‌های متنی ذخیره نکنید.
