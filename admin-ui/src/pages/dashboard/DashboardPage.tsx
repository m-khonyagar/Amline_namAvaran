import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAuth } from '../../hooks/useAuth'
import { apiClient } from '../../lib/api'
import { loadLeads } from '../../features/crm/crmService'
import { formatShamsiWeekdayLong } from '../../lib/persianDateTime'

interface MetricsSummary {
  contracts_total: number
  users_total: number
  active_leads: number
  contracts_today: number
  audit_events_total: number
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, hasPermission } = useAuth()

  const { data: metrics, isError: metricsError } = useQuery({
    queryKey: ['admin-metrics-summary'],
    queryFn: async () => {
      const res = await apiClient.get<MetricsSummary>('/admin/metrics/summary')
      return res.data
    },
  })

  const { data: leads = [] } = useQuery({
    queryKey: ['crm-leads-dashboard'],
    queryFn: loadLeads,
  })
  const activeLeadsLocal = leads.filter((l) => l.status !== 'LOST' && l.status !== 'CONTRACTED').length

  const activeLeads = metrics && !metricsError ? metrics.active_leads : activeLeadsLocal

  const trendData = useMemo(() => {
    const base = metrics && !metricsError ? metrics.contracts_today : 3
    return Array.from({ length: 7 }, (_, i) => ({
      name: `ر${i + 1}`,
      contracts: Math.max(0, Math.round(base * (0.6 + i * 0.08) + (i % 3))),
    }))
  }, [metrics, metricsError])

  return (
    <div dir="rtl" className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          خوش آمدید{user?.full_name ? `، ${user.full_name}` : ''}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          {formatShamsiWeekdayLong(new Date())}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900/50 dark:bg-blue-950/30">
          <p className="text-sm text-blue-600 dark:text-blue-400">قراردادهای امروز</p>
          <p className="mt-2 text-3xl font-bold text-blue-700 dark:text-blue-300">
            {metrics && !metricsError ? metrics.contracts_today : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/50">
          <p className="text-sm text-slate-600 dark:text-slate-400">کل قراردادها</p>
          <p className="mt-2 text-3xl font-bold text-slate-800 dark:text-slate-100">
            {metrics && !metricsError ? metrics.contracts_total : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50 p-5 dark:border-green-900/40 dark:bg-green-950/30">
          <p className="text-sm text-green-600 dark:text-green-400">کاربران (mock)</p>
          <p className="mt-2 text-3xl font-bold text-green-700 dark:text-green-300">
            {metrics && !metricsError ? metrics.users_total : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-purple-100 bg-purple-50 p-5 dark:border-purple-900/40 dark:bg-purple-950/30">
          <p className="text-sm text-purple-600 dark:text-purple-400">Lead های فعال</p>
          <p className="mt-2 text-3xl font-bold text-purple-700 dark:text-purple-300">{activeLeads}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-950/30">
          <p className="text-sm text-amber-700 dark:text-amber-500">رویدادهای ممیزی</p>
          <p className="mt-2 text-3xl font-bold text-amber-800 dark:text-amber-200">
            {metrics && !metricsError ? metrics.audit_events_total : '—'}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-2 text-lg font-semibold text-gray-800 dark:text-slate-200">روند قرارداد (نمونهٔ ۷ روز)</h2>
        <p className="mb-4 text-xs text-gray-500 dark:text-slate-400">
          دادهٔ نمایشی تا اتصال سری زمانی واقعی از API؛ برای KPI سریع.
        </p>
        <div className="h-56 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis width={32} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="contracts" stroke="#2563eb" fill="#93c5fd" fillOpacity={0.35} name="قرارداد" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-slate-200">دسترسی سریع</h2>
        {!hasPermission('contracts:write') &&
        !hasPermission('crm:read') &&
        !hasPermission('users:read') ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">
            برای میانبرها به مجوزهای مرتبط (قرارداد، CRM یا کاربران) نیاز دارید.
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {hasPermission('contracts:write') ? (
            <button
              type="button"
              onClick={() => navigate('/contracts/wizard')}
              className="rounded-xl border-2 border-dashed border-blue-300 p-6 text-center hover:border-blue-400 hover:bg-blue-50 dark:border-blue-700 dark:hover:bg-blue-950/40"
            >
              <div className="mb-2 text-3xl">📄</div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">قرارداد جدید</p>
            </button>
          ) : null}
          {hasPermission('crm:read') ? (
            <button
              type="button"
              onClick={() => navigate('/crm')}
              className="rounded-xl border-2 border-dashed border-purple-300 p-6 text-center hover:border-purple-400 hover:bg-purple-50 dark:border-purple-700 dark:hover:bg-purple-950/40"
            >
              <div className="mb-2 text-3xl">🎯</div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">مدیریت CRM</p>
            </button>
          ) : null}
          {hasPermission('users:read') ? (
            <button
              type="button"
              onClick={() => navigate('/users')}
              className="rounded-xl border-2 border-dashed border-green-300 p-6 text-center hover:border-green-400 hover:bg-green-50 dark:border-green-700 dark:hover:bg-green-950/40"
            >
              <div className="mb-2 text-3xl">👥</div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">کاربران</p>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
