import { useMemo, useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { loadLeads, loadStats } from '../crmService'
import type { Lead, LeadStatus, CrmStats } from '../types'

const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'جدید',
  CONTACTED: 'تماس گرفته',
  NEGOTIATING: 'در مذاکره',
  CONTRACTED: 'منعقد شده',
  LOST: 'از دست رفته',
}

const STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: '#3b82f6',
  CONTACTED: '#f59e0b',
  NEGOTIATING: '#f97316',
  CONTRACTED: '#22c55e',
  LOST: '#ef4444',
}

function KpiSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 animate-pulse">
      <div className="h-3 w-24 rounded bg-gray-200" />
      <div className="mt-3 h-8 w-16 rounded bg-gray-200" />
    </div>
  )
}

export function CRMDashboard() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<CrmStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    void loadLeads().then(setLeads)
  }, [])

  useEffect(() => {
    setStatsLoading(true)
    loadStats()
      .then(setStats)
      .catch(() => {/* toast already shown by service */})
      .finally(() => setStatsLoading(false))
  }, [])

  const chartData = useMemo(() => {
    const statuses: LeadStatus[] = ['NEW', 'CONTACTED', 'NEGOTIATING', 'CONTRACTED', 'LOST']
    return statuses.map((status) => ({
      name: STATUS_LABELS[status],
      count: leads.filter((l) => l.status === status).length,
      color: STATUS_COLORS[status],
    }))
  }, [leads])

  return (
    <div dir="rtl" className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        {statsLoading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
              <p className="text-sm text-blue-600">Lead های فعال</p>
              <p className="mt-2 text-3xl font-bold text-blue-700">{stats?.active_leads ?? 0}</p>
            </div>
            <div className="rounded-xl border border-green-100 bg-green-50 p-5">
              <p className="text-sm text-green-600">نرخ تبدیل</p>
              <p className="mt-2 text-3xl font-bold text-green-700">{stats?.conversion_rate ?? 0}٪</p>
            </div>
            <div className="rounded-xl border border-purple-100 bg-purple-50 p-5">
              <p className="text-sm text-purple-600">Lead این ماه</p>
              <p className="mt-2 text-3xl font-bold text-purple-700">{stats?.leads_this_month ?? 0}</p>
            </div>
          </>
        )}
      </div>

      {/* Bar Chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-800">توزیع Lead بر اساس وضعیت</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barSize={40}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
