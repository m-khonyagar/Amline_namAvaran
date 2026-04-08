# چک‌لیست: اپ جدید روی همان سرور

1. **نام‌ها**
   - [ ] `app-slug` یکتا (مثلاً `myproduct`)
   - [ ] `environment` (مثلاً `staging`)
   - [ ] `role` برای هر بیلد قابل‌سرو (مثلاً `web`, `admin-ui`)

2. **مسیر دیسک**
   - [ ] دایرکتوری بساز: `/opt/apps/<app-slug>/<environment>/<role>/`
   - [ ] بیلد استاتیک را اینجا extract کن (بدون قاطی کردن با اپ‌های دیگر)

3. **پورت**
   - [ ] در `infra/multi-app-server/PORT-REGISTRY.md` (و در صورت تمایل در `/opt/apps/_registry/ports.txt` روی سرور) پورت را ثبت کن
   - [ ] مطمئن شو با `ss -ltnp` تداخلی نیست

4. **systemd**
   - [ ] واحد جدید با الگوی `appsvc-<app>-<env>-<role>.service`
   - [ ] `Environment=ROOT=/opt/apps/...` و `Environment=PORT=...`
   - [ ] `ExecStart=/usr/bin/python3 /opt/apps/_shared/spa_static_server.py` (برای SPA استاتیک) یا فرمان مخصوص اپ

5. **فایروال**
   - [ ] در صورت فعال بودن `ufw`: `ufw allow <port>/tcp`

6. **مخزن**
   - [ ] اسکریپت دیپلوی یا GitHub Action را با مسیرهای جدید به‌روز کن؛ از `scripts/server_layout_constants.py` الگو بگیر

7. **تست**
   - [ ] از بیرون سرور: `curl -sI http://<host>:<port>/`
   - [ ] مسیرهای عمیق SPA (مثلاً `/dashboard`) بدون 404 پوشه‌ای
