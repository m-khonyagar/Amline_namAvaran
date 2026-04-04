import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export function AccessDenied({ permission }: { permission: string }) {
  return (
    <div
      dir="rtl"
      className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center"
      role="alert"
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <ShieldAlert className="h-8 w-8" strokeWidth={2} aria-hidden />
      </div>
      <h1 className="amline-title text-xl">دسترسی به این بخش ندارید</h1>
      <p className="amline-body mx-auto mt-3 max-w-md">
        برای مشاهدهٔ این صفحه به مجوز <span className="font-mono text-sm text-[var(--amline-fg)]">{permission}</span>{' '}
        نیاز است. در صورت نیاز با مدیر سامانه تماس بگیرید.
      </p>
      <Link
        to="/dashboard"
        className="btn btn-primary mt-8 min-h-11 px-6"
      >
        بازگشت به داشبورد
      </Link>
    </div>
  );
}
