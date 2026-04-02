import { useMemo, useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { loadLeads } from '../crmService'
import type { Lead, LeadStatus } from '../types'

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

export function CRMDashboard() {
  const [leads, setLeads] = useState<Lead[]>([])

  useEffect(() => {
    void loadLeads().then(setLeads)
  }, [])

  const stats = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const active = leads.filter((l) => l.status !== 'LOST' && l.status !== 'CONTRACTED').length
    const contracted = leads.filter((l) => l.status === 'CONTRACTED').length
    const total = leads.length
    const conversionRate = total > 0 ? Math.round((contracted / total) * 100) : 0
    const thisMonth = leads.filter((l) => new Date(l.created_at) >= startOfMonth).length

    return { active, contracted, total, conversionRate, thisMonth }
  }, [leads])

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
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
          <p className="text-sm text-blue-600">Lead های فعال</p>
          <p className="mt-2 text-3xl font-bold text-blue-700">{stats.active}</p>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50 p-5">
          <p className="text-sm text-green-600">نرخ تبدیل</p>
          <p className="mt-2 text-3xl font-bold text-green-700">{stats.conversionRate}٪</p>
        </div>
        <div className="rounded-xl border border-purple-100 bg-purple-50 p-5">
          <p className="text-sm text-purple-600">Lead این ماه</p>
          <p className="mt-2 text-3xl font-bold text-purple-700">{stats.thisMonth}</p>
        </div>
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
