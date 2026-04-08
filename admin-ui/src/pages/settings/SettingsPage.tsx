'use client'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../lib/cn'
import { apiClient } from '../../lib/api'
import { apiV1 } from '../../lib/apiPaths'

type Tab = 'profile' | 'security' | 'notifications' | 'system'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'profile', label: 'پروفایل', icon: '👤' },
  { id: 'security', label: 'امنیت', icon: '🔒' },
  { id: 'notifications', label: 'اعلان‌ها', icon: '🔔' },
  { id: 'system', label: 'سیستم', icon: '⚙️' },
]

function ProfileTab() {
  const { user } = useAuth()
  const [saved, setSaved] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
          {user?.full_name?.[0] ?? user?.mobile?.[0] ?? 'U'}
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            {user?.full_name ?? '—'}
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-400">{user?.mobile}</p>
          <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            {user?.role}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
            نام کامل
          </label>
          <input
            type="text"
            defaultValue={user?.full_name ?? ''}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
            شماره موبایل
          </label>
          <input
            type="tel"
            defaultValue={user?.mobile ?? ''}
            dir="ltr"
            disabled
            className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
          ایمیل (اختیاری)
        </label>
        <input
          type="email"
          dir="ltr"
          placeholder="example@amline.ir"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      <button
        type="button"
        onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }}
        className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        {saved ? '✓ ذخیره شد' : 'ذخیره تغییرات'}
      </button>
    </div>
  )
}

function SecurityTab() {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
        احراز هویت از طریق OTP موبایل انجام می‌شود. رمز عبور جداگانه‌ای تنظیم نشده است.
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-slate-200">
          نشست‌های فعال
        </h3>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-slate-100">
                نشست جاری
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                127.0.0.1 — همین لحظه
              </p>
            </div>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
              فعال
            </span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-slate-200">
          مجوزهای حساب
        </h3>
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          {show ? 'پنهان کردن' : 'نمایش مجوزها'}
        </button>
        {show && (
          <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900">
            <PermissionsList />
          </div>
        )}
      </div>
    </div>
  )
}

function PermissionsList() {
  const { user } = useAuth()
  return (
    <ul className="flex flex-wrap gap-1.5">
      {(user?.permissions ?? []).map((p) => (
        <li
          key={p}
          className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
        >
          {p}
        </li>
      ))}
    </ul>
  )
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    newContract: true,
    auditAlert: true,
    systemUpdate: false,
    emailDigest: false,
  })

  const toggle = (key: keyof typeof prefs) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }))

  const items = [
    { key: 'newContract' as const, label: 'قرارداد جدید', desc: 'هنگام ثبت قرارداد جدید اطلاع‌رسانی شود' },
    { key: 'auditAlert' as const, label: 'هشدار ممیزی', desc: 'رویدادهای مهم ممیزی' },
    { key: 'systemUpdate' as const, label: 'به‌روزرسانی سیستم', desc: 'اطلاعیه‌های فنی و نگهداری' },
    { key: 'emailDigest' as const, label: 'خلاصه ایمیل', desc: 'گزارش هفتگی به ایمیل' },
  ]

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.key}
          className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
        >
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-slate-100">{item.label}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">{item.desc}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs[item.key]}
            onClick={() => toggle(item.key)}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              prefs[item.key] ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                prefs[item.key] ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
        </div>
      ))}
    </div>
  )
}

type MetaContext = {
  agency_scope_enabled: boolean
  agencies: { id: string; name_fa?: string; name?: string }[]
}

function SystemTab() {
  const { hasPermission } = useAuth()
  const [agencyId, setAgencyId] = useState('')

  useEffect(() => {
    try {
      setAgencyId(localStorage.getItem('amline_x_agency_id') ?? '')
    } catch {
      setAgencyId('')
    }
  }, [])

  const metaQ = useQuery({
    queryKey: ['meta-context'],
    queryFn: async () => {
      const res = await apiClient.get<MetaContext>(apiV1('meta/context'))
      return res.data
    },
    enabled: hasPermission('listings:read'),
  })

  const persistAgency = (id: string) => {
    const v = id.trim()
    try {
      if (v) localStorage.setItem('amline_x_agency_id', v)
      else localStorage.removeItem('amline_x_agency_id')
    } catch {
      /* ignore */
    }
    setAgencyId(v)
  }

  const envItems = [
    { label: 'نسخه پنل', value: '1.0.0' },
    { label: 'محیط', value: import.meta.env.MODE },
    { label: 'MSW', value: import.meta.env.VITE_USE_MSW === 'true' ? 'فعال' : 'غیرفعال' },
    { label: 'API URL', value: import.meta.env.VITE_API_URL ?? '(پیش‌فرض)' },
  ]

  return (
    <div className="space-y-6">
      {metaQ.data?.agency_scope_enabled ? (
        <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">حوزهٔ آژانس (سرور)</h3>
          <p className="mt-1 text-xs text-blue-800/90 dark:text-blue-300/90">
            با فعال بودن <code className="rounded bg-white/60 px-1 dark:bg-slate-900/60">AMLINE_AGENCY_SCOPE_ENABLED</code>، هدر{' '}
            <code className="rounded bg-white/60 px-1 dark:bg-slate-900/60">X-Agency-Id</code> روی لیست آگهی و CRM اعمال می‌شود.
          </p>
          <label className="mt-3 block text-xs font-medium text-blue-900 dark:text-blue-200">
            آژانس فعال برای درخواست‌های API
            <select
              className="mt-1 block w-full max-w-md rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              value={agencyId}
              onChange={(e) => persistAgency(e.target.value)}
            >
              <option value="">— بدون فیلتر —</option>
              {(metaQ.data?.agencies ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name_fa || a.name || a.id}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : metaQ.isSuccess && hasPermission('listings:read') ? (
        <p className="text-xs text-gray-500 dark:text-slate-400">
          حوزهٔ چند آژانسی روی سرور غیرفعال است؛ در صورت نیاز{' '}
          <code className="rounded bg-gray-100 px-1 dark:bg-slate-800">AMLINE_AGENCY_SCOPE_ENABLED=1</code> و{' '}
          <code className="rounded bg-gray-100 px-1 dark:bg-slate-800">AMLINE_AGENCIES_JSON</code> را تنظیم کنید.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="min-w-full text-right text-sm">
          <tbody>
            {envItems.map((item) => (
              <tr key={item.label} className="border-b border-gray-100 last:border-0 dark:border-slate-800">
                <td className="px-4 py-3 font-medium text-gray-600 dark:text-slate-400">{item.label}</td>
                <td className="px-4 py-3 font-mono text-gray-900 dark:text-slate-100">{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/20">
        <p className="text-sm font-semibold text-red-700 dark:text-red-400">ناحیه خطرناک</p>
        <p className="mt-1 text-xs text-red-600 dark:text-red-500">
          پاک‌سازی داده‌های محلی (cache، کوکی‌ها) — این عمل برگشت‌پذیر نیست.
        </p>
        <button
          type="button"
          onClick={() => {
            document.cookie.split(';').forEach((c) => {
              document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/')
            })
            window.location.href = '/login'
          }}
          className="mt-3 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          پاک‌سازی و خروج
        </button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const { hasPermission } = useAuth()

  if (!hasPermission('settings:read')) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500 dark:text-slate-400">
        دسترسی به این بخش مجاز نیست.
      </div>
    )
  }

  const panels: Record<Tab, JSX.Element> = {
    profile: <ProfileTab />,
    security: <SecurityTab />,
    notifications: <NotificationsTab />,
    system: <SystemTab />,
  }

  return (
    <div dir="rtl" className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">تنظیمات</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          مدیریت پروفایل، امنیت و تنظیمات سیستم
        </p>
      </div>

      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-slate-700 dark:bg-slate-900">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-300'
                : 'text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            <span aria-hidden="true">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        {panels[activeTab]}
      </div>
    </div>
  )
}
