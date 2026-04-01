# پاکسازی کامپوننت‌های TaskFlow Desktop

مسیر مرجع: `handoff/Amline_namAvaran/Agent/Agent/winfsurf-20/taskflow/TaskFlowDesktop/`

کامپوننت‌هایی که در `App.tsx` یا مسیرهای فعلی import نمی‌شوند (نمونه از گزارش‌ها): `ChatInterface`, `TaskPanel`, `AdaptiveNav` و مشابه — قبل از حذف:

1. در کل پروژه `TaskFlowDesktop` جستجوی نام فایل.
2. اگر هیچ ارجاعی نبود، حذف یا انتقال به پوشهٔ `_archive/`.
3. `npm run build` در TaskFlowDesktop باید بدون خطا بماند.
