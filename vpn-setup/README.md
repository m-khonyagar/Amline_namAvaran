# راهنمای VPN برای استفاده شخصی

## OpenVPN روی ویندوز (همهٔ برنامه‌ها + مشکل ChatGPT)

اگر از **OpenVPN Connect** استفاده می‌کنید و بعضی برنامه‌ها (مثل ChatGPT) وصل نمی‌شوند:

- راهنمای کامل: **[README-OPENVPN-WINDOWS.md](./README-OPENVPN-WINDOWS.md)**
- اگر **پروکسی سیستم** دارید و ChatGPT timeout می‌دهد: `.\fix-wininet-proxy-bypass-openai.ps1` (OpenVPN را عوض نمی‌کند)
- تشخیص مسیر/DNS: `.\diagnose-openvpn-windows.ps1` (ترجیحاً PowerShell با دسترسی ادمین)

---

## گزینه ۱: Cloudflare WARP (فوری و رایگان)

**همین الان اجرا کنید:**

```powershell
powershell -ExecutionPolicy Bypass -File install-warp.ps1
```

بعد از نصب:
1. برنامه **1.1.1.1 WARP** را از Start اجرا کنید
2. روی **Connect** کلیک کنید
3. آماده است!

---

## گزینه ۲: WireGuard با IP آمریکا (VPN اختصاصی)

برای IP تضمینی آمریکا، یک VPS در آمریکا بگیرید:

### مراحل:

1. **VPS بگیرید** (حدود ۵ دلار/ماه):
   - [DigitalOcean](https://digitalocean.com) - منطقه New York یا San Francisco
   - [Vultr](https://vultr.com) - سرور آمریکا
   - [Linode](https://linode.com)

2. **اتصال SSH به سرور:**
   ```bash
   ssh root@IP_سرور_شما
   ```

3. **اجرای اسکریپت نصب:**
   ```bash
   curl -sO https://raw.githubusercontent.com/.../wireguard-server-setup.sh
   chmod +x wireguard-server-setup.sh
   ./wireguard-server-setup.sh
   ```
   
   یا فایل `wireguard-server-setup.sh` را کپی کرده و روی سرور اجرا کنید.

4. **نصب WireGuard روی ویندوز:**
   - از [wireguard.com/install](https://www.wireguard.com/install/) دانلود کنید
   - محتوای `client.conf` را Import کنید

---

## خلاصه

| گزینه | هزینه | سرعت | IP آمریکا |
|-------|-------|------|-----------|
| WARP | رایگان | خوب | ممکن |
| WireGuard VPS | ~۵$/ماه | عالی | تضمینی |
