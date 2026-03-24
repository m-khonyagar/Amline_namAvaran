# اجرای تمام تست‌های QA املاین (بدون @manual)
# Usage: .\run-all-tests.ps1

Write-Host "=== اجرای تست‌های جامع املاین ===" -ForegroundColor Cyan
Write-Host ""

$env:BASE_URL = "https://app-dev.amline.ir"
npx playwright test --grep-invert "@manual" --reporter=list

Write-Host ""
Write-Host "برای مشاهده گزارش: npm run report" -ForegroundColor Green
