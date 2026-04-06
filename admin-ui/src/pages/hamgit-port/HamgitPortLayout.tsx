import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '../../lib/cn'

const SUB = [
  { to: '/admin/hamgit-port', label: 'نمای کلی', end: true },
  { to: '/admin/hamgit-port/requirements', label: 'نیازمندی‌ها' },
  { to: '/admin/hamgit-port/ads', label: 'آگهی (پیشرفته)' },
  { to: '/admin/hamgit-port/settlements', label: 'تسویه' },
  { to: '/admin/hamgit-port/invoices', label: 'فاکتور / لینک پرداخت' },
  { to: '/admin/hamgit-port/clauses', label: 'بندهای پایه' },
  { to: '/admin/hamgit-port/promo', label: 'کد تخفیف' },
  { to: '/admin/hamgit-port/market', label: 'بازار' },
  { to: '/admin/hamgit-port/wallet-tools', label: 'کیف (ابزار)' },
] as const

export default function HamgitPortLayout() {
  return (
    <div className="min-h-[60vh]">
      <div className="border-b border-[var(--amline-border)] bg-[var(--amline-surface-muted)]/30 px-4 py-3 dark:border-slate-700">
        <p className="text-sm font-medium text-[var(--amline-fg)]">ادغام تدریجی با پنل Hamgit</p>
        <p className="mt-0.5 text-xs text-[var(--amline-fg-muted)]">
          مسیرها و mockها برای جلوگیری از 404؛ فرم‌های کامل در اسپرینت‌های بعدی.
        </p>
        <nav className="mt-3 flex flex-wrap gap-2" aria-label="زیربخش‌های Hamgit">
          {SUB.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              end={'end' in s ? s.end : false}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                )
              }
            >
              {s.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  )
}
