import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'

function StatusBadge({ status }) {
  const colors = {
    queued: 'bg-gray-600',
    planning: 'bg-blue-600',
    ready: 'bg-yellow-600',
    running: 'bg-green-600',
    succeeded: 'bg-emerald-600',
    failed: 'bg-red-600'
  }
  return (
    <span className={`rounded-lg px-2 py-0.5 text-xs text-white ${colors[status] || 'bg-gray-600'}`}>
      {status || '...'}
    </span>
  )
}

export default function History() {
  const [tasks, setTasks] = useState([])
  const [filteredTasks, setFilteredTasks] = useState([])
  const [err, setErr] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await api.get('/tasks')
        if (!alive) return
        setTasks(res.data)
        setFilteredTasks(res.data)
      } catch (e) {
        if (!alive) return
        setErr(e?.response?.data?.detail || String(e))
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredTasks(tasks)
    } else {
      setFilteredTasks(tasks.filter(t => t.status === statusFilter))
    }
  }, [statusFilter, tasks])

  const statusCounts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-zinc-200">Tasks ({filteredTasks.length})</div>
        {err ? <div className="text-sm text-red-300">{err}</div> : null}
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
            statusFilter === 'all' 
              ? 'bg-zinc-100 text-zinc-950' 
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          All ({tasks.length})
        </button>
        {Object.entries(statusCounts).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === status 
                ? 'bg-zinc-100 text-zinc-950' 
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {status} ({count})
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="grid gap-2">
        {filteredTasks.map((t) => (
          <Link
            key={t.id}
            to={`/tasks/${t.id}`}
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:bg-zinc-900/70 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-sm text-zinc-100 font-medium">{t.goal}</div>
                <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
                  <span>ID: {t.id.slice(0, 8)}...</span>
                  <span>Created: {new Date(t.created_at).toLocaleDateString()}</span>
                  <span>Updated: {new Date(t.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
              <StatusBadge status={t.status} />
            </div>
          </Link>
        ))}
        {filteredTasks.length === 0 ? (
          <div className="text-sm text-zinc-500">
            {statusFilter === 'all' ? 'No tasks yet.' : `No tasks with status "${statusFilter}".`}
          </div>
        ) : null}
      </div>
    </div>
  )
}
