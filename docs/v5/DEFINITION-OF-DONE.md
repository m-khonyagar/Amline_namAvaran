# Definition of Done — Amline Enterprise Master v5.0

> **Version:** 5.0 | **Status:** Active | **Last Updated:** 2026-04-15

## Table of Contents
1. [Overview](#overview)
2. [Code Quality](#code-quality)
3. [Testing Requirements](#testing)
4. [Documentation](#documentation)
5. [Security](#security)
6. [Performance](#performance)
7. [Internationalization](#i18n)
8. [Deployment Checklist](#deployment)
9. [Monitoring & Alerting](#monitoring)
10. [Review & Sign-Off](#sign-off)

---

## Overview

تعریف "تمام‌شده" برای هر فیچر در Amline v5.0. تمام موارد زیر باید قبل از مرج PR تأیید شوند.

---

## Code Quality

- [ ] کد مطابق با PEP 8 (Python) / ESLint (TypeScript) نوشته شده
- [ ] هیچ کد مرده‌ای باقی نمانده (unused imports, dead code)
- [ ] Type hints کامل در تمام توابع Python
- [ ] هیچ `print()` یا `console.log()` debug باقی نمانده
- [ ] Linter بدون warning اجرا می‌شود
- [ ] هیچ hardcoded credential یا secret وجود ندارد
- [ ] Error handling کامل با exception types مشخص
- [ ] Logging با structured format (JSON) پیاده‌سازی شده
- [ ] Database queries بهینه‌سازی شده (N+1 query problem نیست)
- [ ] Code review توسط حداقل یک peer انجام شده

---

## Testing Requirements {#testing}

### Unit Tests
- [ ] Coverage ≥ 80% برای منطق business
- [ ] تمام edge case ها پوشش داده شده
- [ ] تمام validation rules تست شده (VR-001 تا VR-012)
- [ ] Mock های مناسب برای external services

### Integration Tests
- [ ] API endpoint ها با real database تست شده
- [ ] Event publishing/consuming تست شده
- [ ] Payment gateway mock integration تست شده
- [ ] Authentication/Authorization flows تست شده

### E2E Tests
- [ ] Happy path از UI تا Database تست شده
- [ ] سناریوهای QS-001 تا QS-012 پوشش داده شده (حداقل QS-001, QS-003, QS-012)
- [ ] Cross-browser testing انجام شده (Chrome, Firefox, Safari)

### Performance Tests
- [ ] API response time < 200ms برای P95
- [ ] Load test با ۱۰۰۰ concurrent users انجام شده
- [ ] Database query time < 50ms

---

## Documentation {#documentation}

- [ ] API endpoint در [API-CONTRACT.md](API-CONTRACT.md) مستند شده
- [ ] Error codes جدید در [ERROR-CODES.md](ERROR-CODES.md) اضافه شده
- [ ] Business rules در [VALIDATION-RULES.md](VALIDATION-RULES.md) ثبت شده
- [ ] Event schemas در [EVENTS-CATALOG.md](EVENTS-CATALOG.md) آپدیت شده
- [ ] RBAC changes در [RBAC-PERMISSIONS.md](RBAC-PERMISSIONS.md) منعکس شده
- [ ] README یا مستندات کاربر آپدیت شده
- [ ] Changelog ثبت شده

---

## Security {#security}

- [ ] SQL injection بررسی شده (Parameterized queries)
- [ ] XSS prevention در frontend اعمال شده
- [ ] CSRF protection فعال است
- [ ] Rate limiting برای endpoint اعمال شده
- [ ] Authorization check در هر endpoint وجود دارد
- [ ] Sensitive data در log ها ثبت نمی‌شود
- [ ] HTTPS enforced در production
- [ ] Input validation در API layer انجام شده
- [ ] Audit log برای عملیات حساس ثبت می‌شود

---

## Performance {#performance}

- [ ] Database indexes مناسب اضافه شده
- [ ] Caching (Redis) برای داده‌های پرتکرار اعمال شده
- [ ] Pagination برای list endpoints پیاده‌سازی شده
- [ ] Background jobs برای عملیات سنگین استفاده شده
- [ ] File uploads به MinIO object storage منتقل می‌شوند

---

## Internationalization (i18n) {#i18n}

- [ ] تمام پیام‌های خطا به فارسی و انگلیسی موجود است
- [ ] تاریخ‌ها در قالب شمسی (Jalali) قابل نمایش است
- [ ] اعداد در قالب فارسی (ارقام) قابل نمایش است
- [ ] متون RTL در UI به درستی نمایش داده می‌شوند
- [ ] فرمت‌های تلفن و کد ملی ایرانی پشتیبانی می‌شوند

---

## Deployment Checklist {#deployment}

- [ ] Environment variables مستند و در vault ذخیره شده‌اند
- [ ] Database migrations بدون downtime اجرا می‌شوند
- [ ] Feature flag (اگر لازم است) پیاده‌سازی شده
- [ ] Rollback plan مشخص است
- [ ] Staging deploy موفق بوده
- [ ] Smoke tests در staging انجام شده
- [ ] Production deploy plan تأیید شده

---

## Monitoring & Alerting {#monitoring}

- [ ] Metrics در Prometheus منتشر می‌شوند
- [ ] Dashboard در Grafana ایجاد/آپدیت شده
- [ ] Alert برای error rate > 1% تنظیم شده
- [ ] Alert برای response time > 500ms تنظیم شده
- [ ] Logs در Loki indexed می‌شوند
- [ ] Distributed tracing در Tempo پیکربندی شده
- [ ] Health check endpoint پیاده‌سازی شده

---

## Review & Sign-Off {#sign-off}

- [ ] ✅ Developer — کد آماده است
- [ ] ✅ Peer Reviewer — code review انجام شده
- [ ] ✅ QA — تست‌های مربوطه پاس شده
- [ ] ✅ Security — بررسی امنیتی انجام شده
- [ ] ✅ Product Owner — acceptance criteria تأیید شده
- [ ] ✅ Tech Lead — معماری و کد مورد تأیید است

---

*Cross-reference: [QA-SCENARIOS.md](QA-SCENARIOS.md) | [VALIDATION-RULES.md](VALIDATION-RULES.md) | [ARCHITECTURE-v5.md](ARCHITECTURE-v5.md)*
