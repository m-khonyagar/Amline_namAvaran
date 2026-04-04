# نسخه‌دهی و Release (پیشنهاد CTO)

## اجزای قابل نسخه‌گذاری

| جزء | قالب پیشنهادی | مثال |
|-----|----------------|------|
| API بک‌اند | SemVer روی OpenAPI / تگ git | `v3.2.0` |
| تصاویر Docker (backend, pdf-generator, …) | همان SemVer + `:sha` برای ردیابی | `ghcr.io/org/backend:v3.2.0` و `:abc1234` |
| فرانت‌ها (Next/Vite) | SemVer یا CalVer سازمانی | `2026.04.0` یا `1.4.0` |

## قرارداد پیشنهادی

1. **تگ git** روی `main` پس از هر release پایدار: `api/vX.Y.Z`.
2. **CHANGELOG** در `docs/CHANGELOG.md` (یا ریشه) با بخش‌های `Added` / `Changed` / `Security`.
3. CI: job «version guard» که نسخهٔ `app.version` یا `pyproject.toml` با تگ هم‌خوان باشد (در PR جدا اضافه شود).

## CI/CD

- **staging**: دیپلوی از شاخهٔ `staging` با تصویر `:staging-<short-sha>`.
- **production**: فقط از تگ یا `release/*` با تأیید دستی environment.

جزئیات workflowهای موجود: `.github/workflows/ci.yml`, `deploy-staging.yml`.
