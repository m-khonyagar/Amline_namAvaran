# راهنمای مشارکت

## ساختار پروژه

- قبل از شروع، [REPOSITORY_STRUCTURE.md](./REPOSITORY_STRUCTURE.md) را مطالعه کنید.
- برای دیدن دسته‌بندی پروژه‌ها و دستورهای مشترک، `workspace.manifest.json` را بررسی کنید.
- پروژه‌های اصلی در ریشه قرار دارند؛ هر پروژه `package.json` یا `pyproject.toml` خود را دارد.

## اصول کدنویسی

- **Backend (Python):** از flake8، black، isort و mypy استفاده می‌شود.
- **Frontend (React/Next):** از ESLint و Prettier پیروی کنید.
- **Commit:** پیام‌های واضح و به‌زبان فارسی یا انگلیسی.

## قبل از Commit

1. `node_modules` و `__pycache__` را commit نکنید (در `.gitignore` هستند).
2. فایل‌های حساس (`.env`, `*-key.json`) را commit نکنید.
3. قبل از PR، در صورت امکان `scripts/validate-workspace.ps1` را اجرا کنید.
4. برای نصب سریع وابستگی‌ها از `scripts/bootstrap-workspace.ps1` استفاده کنید.

## افزودن پروژه جدید

- پروژه را در مسیر مناسب قرار دهید.
- در صورت نیاز، `REPOSITORY_STRUCTURE.md` را به‌روزرسانی کنید.
- اگر در CI استفاده می‌شود، workflow مربوطه را به‌روزرسانی کنید.

## GitHub Flow

- برای باگ و درخواست قابلیت از Issue Formهای داخل `.github/ISSUE_TEMPLATE/` استفاده کنید.
- برای Pull Request از قالب استاندارد `.github/PULL_REQUEST_TEMPLATE.md` پیروی کنید.
- تغییرات زیرساخت و CI را با هماهنگی مالک مخزن انجام دهید.
