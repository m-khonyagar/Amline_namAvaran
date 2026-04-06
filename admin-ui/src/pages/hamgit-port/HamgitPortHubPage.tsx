import { Link } from 'react-router-dom'

const CARDS = [
  {
    to: '/admin/hamgit-port/requirements',
    title: 'نیازمندی‌ها',
    body: 'خرید/رهن، معاوضه — APIهای wanted و swaps',
  },
  {
    to: '/admin/hamgit-port/ads',
    title: 'آگهی (پیشرفته)',
    body: 'ملک، درخواست بازدید — جدا از لیست سادهٔ فعلی',
  },
  {
    to: '/admin/hamgit-port/settlements',
    title: 'تسویه کاربران',
    body: 'درخواست برداشت و وضعیت تسویه',
  },
  {
    to: '/admin/hamgit-port/invoices',
    title: 'فاکتور و لینک پرداخت',
    body: 'کاربران دارای فاکتور و ساخت لینک پرداخت',
  },
  {
    to: '/admin/hamgit-port/clauses',
    title: 'بندهای پیش‌فرض قرارداد',
    body: 'base clauses ادمین',
  },
  {
    to: '/admin/hamgit-port/promo',
    title: 'کدهای تخفیف',
    body: 'financials/promos',
  },
  {
    to: '/admin/hamgit-port/market',
    title: 'بازار (فایل، مشاور، وظیفه)',
    body: 'بزرگ‌ترین ماژول Hamgit — فاز بعد',
  },
  {
    to: '/admin/hamgit-port/wallet-tools',
    title: 'کیف پول (ابزار ادمین)',
    body: 'شارژ دستی و لیست financials',
  },
]

export default function HamgitPortHubPage() {
  return (
    <div className="p-6">
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="rounded-xl border border-[var(--amline-border)] bg-[var(--amline-surface)] p-4 shadow-sm transition hover:border-blue-400 dark:border-slate-700"
          >
            <h2 className="font-semibold text-[var(--amline-fg)]">{c.title}</h2>
            <p className="mt-1 text-sm text-[var(--amline-fg-muted)]">{c.body}</p>
            <span className="mt-2 inline-block text-xs text-blue-600 dark:text-blue-400">ورود ←</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
