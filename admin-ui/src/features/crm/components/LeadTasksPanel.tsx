import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { loadTasks, createTask, updateTask, deleteTask } from '../crmService'
import type { LeadTask } from '../types'

export function LeadTasksPanel({ leadId }: { leadId: string }) {
  const [tasks, setTasks] = useState<LeadTask[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')

  useEffect(() => {
    setIsLoading(true)
    loadTasks(leadId)
      .then(setTasks)
      .catch(() => toast.error('بارگذاری وظایف ممکن نشد'))
      .finally(() => setIsLoading(false))
  }, [leadId])

  const add = async () => {
    const t = title.trim()
    if (!t) return
    setIsLoading(true)
    try {
      const task = await createTask(leadId, {
        lead_id: leadId,
        title: t,
        due_date: due || null,
        done: false,
      })
      setTasks((prev) => [...prev, task])
      setTitle('')
      setDue('')
      toast.success('وظیفه اضافه شد')
    } catch {
      toast.error('افزودن وظیفه ممکن نشد')
    } finally {
      setIsLoading(false)
    }
  }

  const toggle = async (task: LeadTask) => {
    setIsLoading(true)
    try {
      const updated = await updateTask(leadId, task.id, { done: !task.done })
      setTasks((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
    } catch {
      toast.error('به‌روزرسانی وظیفه ممکن نشد')
    } finally {
      setIsLoading(false)
    }
  }

  const remove = async (taskId: string) => {
    setIsLoading(true)
    try {
      await deleteTask(leadId, taskId)
      setTasks((prev) => prev.filter((x) => x.id !== taskId))
    } catch {
      toast.error('حذف وظیفه ممکن نشد')
    } finally {
      setIsLoading(false)
    }
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
          disabled={isLoading}
        />
        <input
          type="date"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={add}
          disabled={isLoading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          افزودن
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-4">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      )}

      {!isLoading && (
        <ul className="space-y-2">
          {tasks.length === 0 ? (
            <li className="text-sm text-gray-500 dark:text-slate-400">وظیفه‌ای ثبت نشده.</li>
          ) : (
            tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/80"
              >
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => toggle(t)}
                  aria-label="انجام شد"
                />
                <span className={`flex-1 text-sm ${t.done ? 'text-gray-400 line-through' : ''}`}>
                  {t.title}
                </span>
                {t.due_date ? (
                  <span className="text-xs text-gray-500">{t.due_date}</span>
                ) : null}
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline"
                  onClick={() => remove(t.id)}
                >
                  حذف
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
