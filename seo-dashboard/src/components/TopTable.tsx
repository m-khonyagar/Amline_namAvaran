'use client'

interface Row {
  label: string
  clicks: number
}

export function TopTable({ title, data, maxRows = 5, darkMode = true }: { title: string; data: Row[]; maxRows?: number; darkMode?: boolean }) {
  const rows = data.slice(0, maxRows)
  return (
    <div className={`rounded-2xl overflow-hidden backdrop-blur border ${darkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
      <h3 className={`text-lg font-semibold p-4 border-b ${darkMode ? 'text-white border-slate-700/50' : 'text-slate-900 border-slate-200'}`}>{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}>
              <th className={`text-right py-3 px-4 text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>#</th>
              <th className={`text-right py-3 px-4 text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>عنوان</th>
              <th className={`text-right py-3 px-4 text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>کلیک</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`border-t transition-colors ${darkMode ? 'border-slate-700/30 hover:bg-slate-700/20' : 'border-slate-200 hover:bg-slate-50'}`}>
                <td className={`py-3 px-4 text-sm ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{i + 1}</td>
                <td className={`py-3 px-4 text-sm truncate max-w-[200px] ${darkMode ? 'text-white' : 'text-slate-900'}`} title={r.label}>
                  {r.label}
                </td>
                <td className="py-3 px-4 text-primary font-medium">{r.clicks.toLocaleString('fa-IR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
