# راهنمای اتصال داده‌های GSC به گوگل شیت

برای نمایش آنلاین و به‌روز داده‌های گوگل سرچ کنسول در گوگل شیت، این مراحل را انجام دهید.

---

## به‌روزرسانی با کلیک (دکمه Refresh)

برای اینکه با کلیک روی دکمه، داده‌ها خودکار به‌روز شوند:

### روش الف — نصب خودکار (پیشنهادی)

1. **فعال‌سازی Apps Script API:** به این لینک بروید و Enable کنید:
   https://console.cloud.google.com/apis/api/script.googleapis.com/overview?project=trans-sunset-489406-d1

2. **اجرای اسکریپت نصب:**
   ```bash
   python scripts\gsc_install_apps_script.py
   ```

3. **شیت را باز کنید** و یک بار صفحه را Refresh کنید. منوی **GSC** ظاهر می‌شود.

4. **اولین بار:** Extensions > Apps Script > تابع `refreshGSCData` را Run کنید (برای مجوز).

5. **دکمه کلیک:** Insert > Drawing > یک شکل با متن «Refresh» بسازید > راست‌کلیک > Assign script > `refreshGSCData`

### روش ب — نصب دستی

اگر نصب خودکار کار نکرد، فایل `docs/gsc_data/GSC_Refresh_AppsScript.gs` را باز کنید، محتوا را کپی و در Extensions > Apps Script > Code.gs paste کنید. ذخیره و یک بار Run کنید.

---

## ۱. فعال‌سازی Google Sheets API

1. به [Google Cloud Console](https://console.cloud.google.com/) بروید
2. پروژه **trans-sunset-489406-d1** را انتخاب کنید (همان پروژه سرویس اکانت)
3. به **APIs & Services > Library** بروید
4. **Google Sheets API** را جستجو و **Enable** کنید

---

## ۲. ساخت گوگل شیت و اشتراک با سرویس اکانت

1. یک [Google Sheet جدید](https://sheets.google.com) بسازید
2. روی **Share** کلیک کنید
3. این ایمیل را اضافه کنید (با دسترسی **Editor**):
   ```
   amline-seo@trans-sunset-489406-d1.iam.gserviceaccount.com
   ```
4. آدرس شیت را کپی کنید. شناسه شیت بخشی بین `/d/` و `/edit` است:
   ```
   https://docs.google.com/spreadsheets/d/1ABC123xyz.../edit
                                    ^^^^^^^^^^^^^^^^
                                    این همان SHEET_ID است
   ```

---

## ۳. تنظیم شناسه شیت

**روش الف — متغیر محیطی (پیشنهادی):**

در PowerShell:
```powershell
$env:GSC_SHEET_ID = "شناسه_شیت_شما"
```

در CMD:
```cmd
set GSC_SHEET_ID=شناسه_شیت_شما
```

**روش ب — ویرایش اسکریپت:**

فایل `scripts/gsc_sync_to_google_sheets.py` را باز کنید و خط زیر را ویرایش کنید:
```python
SHEET_ID = os.environ.get("GSC_SHEET_ID", "شناسه_شیت_شما").strip()
```

---

## ۴. اجرای اسکریپت‌ها

**برای به‌روزرسانی کامل (دریافت از GSC + آپدیت شیت):**
```bash
python scripts/gsc_refresh_and_sync.py
```

**فقط همگام‌سازی با شیت** (با استفاده از فایل JSON قبلی):
```bash
python scripts/gsc_sync_to_google_sheets.py
```

**فقط دریافت داده از GSC** (بدون شیت):
```bash
python scripts/gsc_export_all.py
```

---

## ۵. به‌روزرسانی منظم

داده‌ها به‌صورت خودکار به‌روز نمی‌شوند. هر بار که اسکریپت را اجرا کنید، داده‌های جدید از GSC گرفته و در شیت به‌روز می‌شود.

برای خودکارسازی می‌توانید:
- یک **Task Scheduler** (ویندوز) یا **cron** (لینوکس) برای اجرای هفتگی تنظیم کنید
- یا از **Google Cloud Functions** / **Cloud Scheduler** برای اجرای خودکار استفاده کنید

---

## شیت‌های ایجادشده در گوگل شیت

| شیت | محتوا |
|-----|--------|
| Meta | اطلاعات سایت و بازه تاریخ |
| Sites | لیست سایت‌های GSC |
| Sitemaps | سایت‌مپ‌ها |
| Performance_by_Date | روند روزانه |
| Queries | کلمات کلیدی |
| Pages | صفحات |
| By_Country | توزیع کشور |
| By_Device | موبایل/دسکتاپ |
| Date_Device | روند روزانه به تفکیک دستگاه |
| Date_Country | روند روزانه به تفکیک کشور |
| Query_Page | ترکیب کوئری + صفحه |
| URL_Inspection | وضعیت ایندکس نمونه URLها |
