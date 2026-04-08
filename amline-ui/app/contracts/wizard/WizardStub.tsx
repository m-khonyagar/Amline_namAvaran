'use client'

/** جایگزین سبک برای بیلدهای Docker/CI بدون باندل کردن کل admin-ui. */
export function ContractWizardPage(_props: { platform: 'admin' | 'user' }) {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-amber-950">
      <p className="font-semibold">ویزارد قرارداد در این تصویر (Docker) تعبیه نشده است.</p>
      <p className="mt-2 text-sm opacity-90">
        برای استفادهٔ کامل از ویزارد، محیط dev با <code className="rounded bg-white/60 px-1">NEXT_PUBLIC_EMBED_ADMIN_WIZARD=1</code>{' '}
        بسازید یا از پنل مدیریت استفاده کنید.
      </p>
    </div>
  )
}
