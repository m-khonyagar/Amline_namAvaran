# Git و سیاست backend

## `develop` و `main`

- توسعهٔ روزمره روی `develop`.
- پس از QA، merge به `main` و deploy. قبل از merge، `npx tsc --noEmit` در frontها و تست‌های CI سبز باشند.

## پوشهٔ `backend/backend`

در برخی checkoutها تحت `.gitignore` است؛ نسخهٔ canonical باید با تیم Backend هماهنگ شود تا CI و clone تازه یکسان بمانند.

## TaskFlow Desktop

پوشهٔ TaskFlow در `handoff/.../TaskFlowDesktop` کامپوننت‌های بلااستفاده را طبق `docs/TASKFLOW_CLEANUP.md` می‌توان حذف یا آرشیو کرد.
