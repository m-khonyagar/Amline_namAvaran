'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'

interface Point {
  date: string
  clicks: number
  impressions: number
}

export function ClicksChart({ data, darkMode = true }: { data: Point[]; darkMode?: boolean }) {
  const textColor = darkMode ? '#94a3b8' : '#64748b'
  const gridColor = darkMode ? '#334155' : '#e2e8f0'
  const bgColor = darkMode ? '#1e293b' : '#ffffff'
  
  return (
    <div className={`rounded-2xl p-5 h-80 backdrop-blur border ${darkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
      <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>روند کلیک و نمایش</h3>
      <ResponsiveContainer width="100%" height="90%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a73e8" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#1a73e8" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="impGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="date" stroke={textColor} fontSize={11} />
          <YAxis stroke={textColor} fontSize={11} tickFormatter={(v) => v.toLocaleString('fa-IR')} />
          <Tooltip
            contentStyle={{ background: bgColor, border: `1px solid ${gridColor}`, borderRadius: '12px' }}
            labelStyle={{ color: textColor }}
            formatter={(value: number) => [value.toLocaleString('fa-IR'), '']}
            labelFormatter={(label) => `تاریخ: ${label}`}
          />
          <Area type="monotone" dataKey="clicks" stroke="#1a73e8" fill="url(#clicksGrad)" strokeWidth={2} name="کلیک" />
          <Area type="monotone" dataKey="impressions" stroke="#3b82f6" fill="url(#impGrad)" strokeWidth={2} name="نمایش" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
