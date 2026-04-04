# اپ موبایل (Expo / React Native) — شروع

این پوشه فعلاً **فقط راهنما** است؛ پروژه Expo اینجا commit نشده تا lockfile و native را بدون تصمیم تیمی اضافه نکنیم.

## ایجاد پروژه

از **ریشهٔ مخزن**:

```bash
npx create-expo-app@latest apps/amline-mobile --template tabs
```

سپس نام پوشه را در صورت نیاز به `mobile` تغییر دهید یا همین مسیر را در workspace نگه دارید.

## اتصال به API

- `EXPO_PUBLIC_API_URL` مطابق `API_DOCS.md` (staging یا dev).
- Auth: همان JWT/refresh پس از یکپارچه‌سازی بک‌اند (بدون mock).

## مرج با مونوریپو (اختیاری)

پس از ایجاد اپ، می‌توان `apps/mobile` را به `workspaces` ریشه اضافه کرد یا ریپوی جدا نگه داشت.
