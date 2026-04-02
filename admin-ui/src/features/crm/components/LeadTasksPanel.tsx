import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export type LeadTask = { id: string; title: string; due?: string; done: boolean }

function storageKey(leadId: string) {
  return `amline-lead-tasks:${leadId}`
}

export function LeadTasksPanel({ leadId }: { leadId: string }) {
  const [tasks, setTasks] = useState<LeadTask[]>([])
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(leadId))
      setTasks(raw ? (JSON.parse(raw) as LeadTask[]) : [])
    } catch {
      setTasks([])
    }
  }, [leadId])

  const persist = (next: LeadTask[]) => {
    setTasks(next)
    try {
      localStorage.setItem(storageKey(leadId), JSON.stringify(next))
    } catch {
      toast.error('ذخیرهٔ وظایف ممکن نشد')
    }
  }

  const add = () => {
    const t = title.trim()
    if (!t) return
    persist([
      ...tasks,
      { id: crypto.randomUUID(), title: t, due: due || undefined, done: false },
    ])
    setTitle('')
    setDue('')
    toast.success('وظیفه اضافه شد')
  }

  const toggle = (id: string) => {
    persist(tasks.map((x) => (x.id === id ? { ...x, done: !x.done } : x)))
  }

  const remove = (id: string) => {
    persist(tasks.filter((x) => x.id !== id))
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-slate-100">وظایف و پیگیری</h2>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <input
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          placeholder="عنوان وظیفه"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="date"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          value={due}
          onChange={(e) => setDue(e.target.value)}
        />
        <button
          type="button"
          onClick={add}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          افزودن
        </button>
      </div>
      <ul className="space-y-2">
        {tasks.length === 0 ? (
          <li className="text-sm text-gray-500 dark:text-slate-400">وظیفه‌ای ثبت نشده.</li>
        ) : (
          tasks.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/80"
            >
              <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} aria-label="انجام شد" />
              <span className={`flex-1 text-sm ${t.done ? 'text-gray-400 line-through' : ''}`}>{t.title}</span>
              {t.due ? <span className="text-xs text-gray-500">{t.due}</span> : null}
              <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => remove(t.id)}>
                حذف
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
