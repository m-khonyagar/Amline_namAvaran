'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

const COLORS = ['#1a73e8', '#3b82f6', '#8b5cf6']

export function DevicePie({ data, darkMode = true }: { data: { name: string; value: number }[]; darkMode?: boolean }) {
  const textColor = darkMode ? '#94a3b8' : '#64748b'
  const bgColor = darkMode ? '#1e293b' : '#ffffff'
  const gridColor = darkMode ? '#334155' : '#e2e8f0'
  
  return (
    <div className={`rounded-2xl p-5 h-72 backdrop-blur border ${darkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
      <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>توزیع دستگاه</h3>
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} stroke={darkMode ? '#1e293b' : '#ffffff'} strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: bgColor, border: `1px solid ${gridColor}`, borderRadius: '12px' }}
            formatter={(value: number) => [value.toLocaleString('fa-IR') + ' کلیک', '']}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
