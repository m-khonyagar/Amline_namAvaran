'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, RefreshCw, ExternalLink, Moon, Sun } from 'lucide-react'
import { fetchGSC, summarizeForAI, type GSCData } from '@/lib/gsc'
import { KPICards } from '@/components/KPICards'
import { ClicksChart } from '@/components/ClicksChart'
import { DevicePie } from '@/components/DevicePie'
import { TopTable } from '@/components/TopTable'
import { AIChat } from '@/components/AIChat'

export default function Home() {
  const [data, setData] = useState<GSCData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(true)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const d = await fetchGSC()
      setData(d)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (loading && !data) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className={`w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin`} />
          <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>در حال بارگذاری داده‌ها...</p>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className={`max-w-md rounded-2xl p-6 text-center ${darkMode ? 'bg-slate-800/80 border border-red-500/30' : 'bg-white border border-red-200'}`}>
          <p className="text-red-500 mb-4">{error}</p>
          <p className={darkMode ? 'text-slate-400 text-sm mb-4' : 'text-slate-600 text-sm mb-4'}>ابتدا اسکریپت gsc_export_all.py را اجرا کنید.</p>
          <button
            onClick={load}
            className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors"
          >
            تلاش مجدد
          </button>
        </div>
      </div>
    )
  }

  const sa = data!.searchAnalytics || {}
  const byDate = sa.by_date || []
  const byQuery = sa.by_query || []
  const byPage = sa.by_page || []
  const byDevice = sa.by_device || []
  const byCountry = sa.by_country || []

  const totalClicks = byDate.reduce((s, r) => s + (r.clicks || 0), 0)
  const totalImp = byDate.reduce((s, r) => s + (r.impressions || 0), 0)
  const avgCtr = byDate.length ? byDate.reduce((s, r) => s + (r.ctr || 0), 0) / byDate.length : 0
  const avgPos = byDate.length ? byDate.reduce((s, r) => s + (r.position || 0), 0) / byDate.length : 0

  const chartData = byDate.map((r) => ({
    date: r.date || '',
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
  }))

  const deviceData = byDevice.map((r) => ({
    name: String(r.device || 'نامشخص'),
    value: r.clicks || 0,
  }))

  const queryRows = byQuery.map((r) => ({ label: r.query || '', clicks: r.clicks || 0 }))
  const pageRows = byPage.map((r) => ({
    label: (r.page || '').replace('https://amline.ir', ''),
    clicks: r.clicks || 0,
  }))
  const countryRows = byCountry.map((r) => ({ label: r.country || '', clicks: r.clicks || 0 }))

  const gscSummary = summarizeForAI(data!)

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur ${darkMode ? 'border-slate-700/50 bg-slate-950/90' : 'border-slate-200 bg-white/90'}`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary-dark">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Agent Windsurf Amline - داشبورد سئو</h1>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {data!.meta?.startDate} تا {data!.meta?.endDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl transition-colors ${darkMode ? 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={load}
              disabled={loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 ${darkMode ? 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              بروزرسانی
            </button>
            <a
              href="https://docs.google.com/spreadsheets/d/1qFynl6JMLbT55ucqXe2zQ7w710JCpkhlxHYvZDC8oEA/edit"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              گوگل شیت
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Left: Dashboard */}
          <div className="lg:col-span-2 space-y-6">
            <KPICards
              data={{
                clicks: totalClicks,
                impressions: totalImp,
                ctr: Math.round(avgCtr * 100) / 100,
                position: Math.round(avgPos * 100) / 100,
              }}
              darkMode={darkMode}
            />
            <ClicksChart data={chartData} darkMode={darkMode} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TopTable title="کلمات کلیدی برتر" data={queryRows} darkMode={darkMode} />
              <TopTable title="صفحات برتر" data={pageRows} darkMode={darkMode} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DevicePie data={deviceData} darkMode={darkMode} />
              <TopTable title="کشورهای برتر" data={countryRows} maxRows={8} darkMode={darkMode} />
            </div>
          </div>

          {/* Right: AI Chat */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 h-[calc(100vh-8rem)]">
              <AIChat gscContext={gscSummary} darkMode={darkMode} />
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
