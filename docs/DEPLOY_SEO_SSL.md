# SSL برای seo.amline.ir (Certbot)

روی سروری که nginx/caddy برای `seo.amline.ir` دارد (مثال Ubuntu):

```bash
sudo apt update && sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seo.amline.ir
```

برای Caddy یا را‌ه‌اندازی دستی، گواهی را در مسیر `fullchain.pem` / `privkey.pem` تنظیم و سرویس وب را reload کنید. زمان‌بندی تمدید: `certbot renew --dry-run`.
