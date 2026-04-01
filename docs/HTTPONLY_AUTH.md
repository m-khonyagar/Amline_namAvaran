# مهاجرت احراز هویت به httpOnly

## وضعیت فعلی

Admin UI توکن را در cookie قابل‌دسترسی از JavaScript نگه می‌دارد (`lib/cookies`). این برای XSS ضعیف‌تر از **httpOnly + Secure + SameSite** است که فقط توسط مرورگر به درخواست‌های same-site ارسال شود.

## گام‌های پیشنهادی (backend + frontend)

1. Backend: `Set-Cookie` برای session یا access token با فلگ‌های `HttpOnly; Secure; SameSite=Lax` (یا `Strict` در صورت امکان).
2. Frontend: حذف ذخیرهٔ توکن در `document.cookie` از JS؛ تکیه بر `credentials: 'include'` در axios (`withCredentials: true`) برای درخواست‌های cross-origin در صورت نیاز.
3. مسیر logout: endpoint backend که کوکی را پاک کند.

پس از آماده شدن API، `useAuth.ts` و `LoginPage` را فقط روی `/auth/me` و پاسخ login بدون پارس کردن token در JS به‌روز کنید.
