# اجرای سریع فرآیند قرارداد
# استفاده: .\run-contract-flow.ps1 -OtpCode "12345"
param([string]$OtpCode = $env:OTP_CODE)

if (-not $OtpCode) {
    Write-Host "کد OTP را وارد کنید (یا از env: `$env:OTP_CODE='12345')" -ForegroundColor Yellow
    $OtpCode = Read-Host "OTP"
}

$env:OTP_CODE = $OtpCode
npx playwright test tests/06-contract-flow-full.spec.ts tests/07-owner-step-from-current.spec.ts --headed --reporter=list
