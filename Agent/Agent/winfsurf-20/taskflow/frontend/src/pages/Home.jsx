import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'

export default function Home() {
  const nav = useNavigate()
  const [goal, setGoal] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function onCreate() {
    setErr('')
    const g = goal.trim()
    if (!g) return
    setBusy(true)
    try {
      const res = await api.post('/tasks', { goal: g })
      const id = res.data.id
      nav(`/tasks/${id}`)
    } catch (e) {
      setErr(e?.response?.data?.detail || String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="text-sm font-semibold text-zinc-200">Goal</div>
        <textarea
          className="mt-2 h-32 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-700"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="مثلاً: Create a Python script that fetches weather data and saves to CSV"
        />
        {err ? <div className="mt-2 text-sm text-red-300">{err}</div> : null}
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            onClick={onCreate}
            disabled={busy}
            className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-white disabled:opacity-60"
          >
            {busy ? 'Creating…' : 'Create task'}
          </button>
        </div>
      </div>

      <div className="text-sm text-zinc-400">
        نکته: اگر API key نداشته باشید، backend به صورت خودکار از حالت Stub برای Plan/Run استفاده می‌کند.
      </div>
    </div>
  )
}
