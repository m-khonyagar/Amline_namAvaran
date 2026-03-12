'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import { BASE_PATH } from '@/lib/config'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function AIChat({ gscContext, darkMode = true }: { gscContext: string; darkMode?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setMessages((m) => [...m, { role: 'user', content: text }])
    setLoading(true)

    try {
      const res = await fetch(`${BASE_PATH}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, gscContext }),
      })
      const data = await res.json()

      if (!res.ok) {
        setMessages((m) => [...m, { role: 'assistant', content: `خطا: ${data.error || res.statusText}` }])
        return
      }

      setMessages((m) => [...m, { role: 'assistant', content: data.reply || 'پاسخی دریافت نشد.' }])
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: `خطا در اتصال: ${String(e)}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`flex flex-col h-full rounded-2xl overflow-hidden backdrop-blur border ${darkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
      <div className={`p-4 border-b flex items-center gap-2 ${darkMode ? 'border-slate-700/50' : 'border-slate-200'}`}>
        <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-dark">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>دستیار هوشمند سئو</h3>
          <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>سوالات خود را درباره داده‌های GSC بپرسید</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
        {messages.length === 0 && (
          <div className={`text-center py-8 text-sm ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
            <p>سلام! من دستیار هوشمند داشبورد سئو هستم.</p>
            <p className="mt-2">مثال: «روند کلیک‌ها چطوره؟» یا «بهترین کلمه کلیدی کدومه؟»</p>
          </div>
        )}
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  msg.role === 'user' ? (darkMode ? 'bg-slate-600' : 'bg-slate-500') : 'bg-primary'
                }`}
              >
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-primary/30 text-white'
                    : darkMode ? 'bg-slate-700/50 text-slate-100' : 'bg-slate-100 text-slate-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className={darkMode ? 'bg-slate-700/50 rounded-2xl px-4 py-2' : 'bg-slate-100 rounded-2xl px-4 py-2'}>
              <p className={darkMode ? 'text-slate-400 text-sm' : 'text-slate-600 text-sm'}>در حال پردازش...</p>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className={`p-4 border-t ${darkMode ? 'border-slate-700/50' : 'border-slate-200'}`}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="سوال خود را بنویسید..."
            className={`flex-1 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
              darkMode 
                ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500' 
                : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400'
            }`}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="p-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
