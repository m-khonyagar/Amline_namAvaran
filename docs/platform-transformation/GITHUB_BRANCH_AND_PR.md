# شاخه‌ها و PRهای پیشنهادی

این مخزن را می‌توان به **چند PR کوچک** شکست تا review ساده‌تر شود. دستورات برای [GitHub CLI](https://cli.github.com/) (`gh`) هستند.

## الگوی نام‌گذاری

- شاخه: `platform/<شماره>-<کوتاه>` مثلاً `platform/04-observability`
- عنوان PR: `[platform] <شرح>`

## دستورات نمونه

پس از commit روی شاخه:

```bash
git checkout -b platform/04-observability main
# ... تغییرات ...
git push -u origin platform/04-observability
gh pr create --base main --title "[platform] Observability: Prometheus + Grafana dev stack" --body "See docs/platform-transformation/ROADMAP.md §4 and infra/observability/README.md"
```

## نگاشت PR به محورها

| شاخه پیشنهادی | محور roadmap | توضیح |
|---------------|--------------|--------|
| `platform/01-turborepo` | 1 | ریشه مونوریپو + turbo + lock یکپارچه |
| `platform/02-ci-deploy` | 2 | اتصال deploy production، npm ci، gates |
| `platform/03-rate-jwt` | 3 | Redis rate limit + JWT سخت |
| `platform/04-observability` | 4 | compose + مستند (همین تحویل قابل PR جدا) |
| `platform/05-docs-roadmap` | همه | فقط اسناد `docs/platform-transformation/*` |
| `platform/09-next-align` | 9 | ارتقای amline-ui به Next 15 |

**نکته**: می‌توانید ابتدا `platform/05-docs-roadmap` را merge کنید تا تیم روی یک SSOT کار کند، سپس `platform/04-observability`.

## PR مستقل برای «فقط مستندات»

اگر می‌خواهید تغییرات کد observability جدا باشد:

1. PR A: فقط `docs/platform-transformation/**` + `docs/platform-transformation/VERSIONING.md`
2. PR B: فقط `infra/observability/**`

در حال حاضر هر دو در یک commit ممکن است؛ با `git reset` / cherry-pick قابل تفکیک است.
