import { Link } from 'react-router-dom'

export default function ForbiddenPage() {
  return (
    <div
      dir="rtl"
      role="alert"
      className="mx-auto flex max-w-lg flex-col items-center justify-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-10 text-center dark:border-amber-900/50 dark:bg-amber-950/40"
    >
      <span className="text-4xl" aria-hidden>
        🔒
      </span>
      <h1 className="text-xl font-bold text-amber-900 dark:text-amber-100">دسترسی ندارید</h1>
      <p className="text-sm text-amber-800/90 dark:text-amber-200/80">
        نقش شما اجازهٔ مشاهدهٔ این بخش را نمی‌دهد. در صورت نیاز با مدیر سیستم تماس بگیرید.
      </p>
      <Link
        to="/dashboard"
        className="mt-2 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
      >
        بازگشت به داشبورد
      </Link>
    </div>
  )
}
