#!/usr/bin/env pwsh
# تست سریع integration — backend باید روی پورت 8080 در حال اجرا باشد
# اجرا: .\scripts\test-backend-integration.ps1

param([string]$Base = "http://localhost:8080")

$pass = 0; $fail = 0

function Test-Endpoint {
    param($Method, $Path, $Body, $Token, $ExpectStatus = 200, $Label)
    $uri = "$Base$Path"
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    try {
        $params = @{ Method = $Method; Uri = $uri; Headers = $headers; ErrorAction = "Stop" }
        if ($Body) { $params["Body"] = ($Body | ConvertTo-Json) }
        $resp = Invoke-WebRequest @params
        if ($resp.StatusCode -eq $ExpectStatus) {
            Write-Host "  ✓ $Label ($($resp.StatusCode))" -ForegroundColor Green
            $script:pass++
            return $resp.Content | ConvertFrom-Json
        } else {
            Write-Host "  ✗ $Label — expected $ExpectStatus got $($resp.StatusCode)" -ForegroundColor Red
            $script:fail++
        }
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if ($code -eq $ExpectStatus) {
            Write-Host "  ✓ $Label ($code)" -ForegroundColor Green
            $script:pass++
        } else {
            Write-Host "  ✗ $Label — $($_.Exception.Message)" -ForegroundColor Red
            $script:fail++
        }
    }
    return $null
}

Write-Host "`nAmline Backend Integration Test" -ForegroundColor Cyan
Write-Host "Target: $Base`n"

# Health
Test-Endpoint GET "/health" -Label "GET /health"

# OTP send + ورود با کانون تست: موبایل 09100000000 و کد 11111 (هم backend dev/staging هم mock)
$mobile = "09100000000"
Test-Endpoint POST "/admin/otp/send" @{ mobile = $mobile } -Label "POST /admin/otp/send" -ExpectStatus 200
$otpFixed = "11111"

# Login
$loginResp = Test-Endpoint POST "/admin/login" @{ mobile = $mobile; otp = $otpFixed } -Label "POST /admin/login" -ExpectStatus 200
$token = $loginResp?.access_token

if (-not $token) {
    Write-Host "`n⚠ Cannot continue without token" -ForegroundColor Yellow
} else {
    # Auth me
    Test-Endpoint GET "/auth/me" -Token $token -Label "GET /auth/me"

    # Admin endpoints
    Test-Endpoint GET "/admin/roles" -Token $token -Label "GET /admin/roles"
    Test-Endpoint GET "/admin/audit" -Token $token -Label "GET /admin/audit"
    Test-Endpoint GET "/admin/metrics/summary" -Token $token -Label "GET /admin/metrics/summary"
    Test-Endpoint GET "/admin/notifications" -Token $token -Label "GET /admin/notifications"
    Test-Endpoint GET "/admin/staff/activity" -Token $token -Label "GET /admin/staff/activity"
    Test-Endpoint GET "/admin/sessions" -Token $token -Label "GET /admin/sessions"
    Test-Endpoint GET "/admin/users" -Token $token -Label "GET /admin/users"
    Test-Endpoint GET "/admin/crm/leads" -Token $token -Label "GET /admin/crm/leads"

    # Contract wizard
    $startResp = Test-Endpoint POST "/contracts/start" @{ contract_type = "PROPERTY_RENT"; party_type = "LANDLORD" } -Token $token -Label "POST /contracts/start" -ExpectStatus 201
    Test-Endpoint GET "/contracts/list" -Token $token -Label "GET /contracts/list"

    if ($startResp?.id) {
        $cid = $startResp.id
        Test-Endpoint GET "/contracts/$cid/status" -Token $token -Label "GET /contracts/{id}/status"
    }

    # CRM
    $leadResp = Test-Endpoint POST "/admin/crm/leads" @{ full_name = "تست کاربر"; mobile = "09121111111"; need_type = "RENT" } -Token $token -Label "POST /admin/crm/leads" -ExpectStatus 201
    if ($leadResp?.id) {
        Test-Endpoint GET "/admin/crm/leads/$($leadResp.id)" -Token $token -Label "GET /admin/crm/leads/{id}"
        Test-Endpoint PATCH "/admin/crm/leads/$($leadResp.id)" @{ status = "CONTACTED" } -Token $token -Label "PATCH /admin/crm/leads/{id}"
    }
}

Write-Host "`n─────────────────────────────────"
Write-Host "Passed: $pass  Failed: $fail" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Yellow" })
