'use client'

import { motion } from 'framer-motion'
import { TrendingUp, MousePointer, Eye, Target } from 'lucide-react'

const cards: { key: string; label: string; icon: typeof MousePointer; color: string; suffix?: string }[] = [
  { key: 'clicks', label: 'کل کلیک', icon: MousePointer, color: 'from-teal-500 to-emerald-600' },
  { key: 'impressions', label: 'کل نمایش', icon: Eye, color: 'from-blue-500 to-cyan-600' },
  { key: 'ctr', label: 'میانگین CTR', suffix: '%', icon: Target, color: 'from-violet-500 to-purple-600' },
  { key: 'position', label: 'میانگین رتبه', icon: TrendingUp, color: 'from-amber-500 to-orange-600' },
]

export function KPICards({ data, darkMode = true }: { data: Record<string, number>; darkMode?: boolean }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ key, label, icon: Icon, color, suffix }, i) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`rounded-2xl p-5 hover:border-primary-500/30 transition-colors backdrop-blur ${
            darkMode 
              ? 'bg-slate-800/80 border border-slate-700/50' 
              : 'bg-white border border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{label}</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {typeof data[key] === 'number'
                  ? data[key].toLocaleString('fa-IR') + (suffix || '')
                  : '-'}
              </p>
            </div>
            <div className={`p-3 rounded-xl bg-gradient-to-br ${color}`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
