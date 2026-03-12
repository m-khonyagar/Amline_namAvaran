import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, API_BASE, wsUrlForTask } from '../api/client.js'

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

function Badge({ children }) {
  return <span className="rounded-lg bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200">{children}</span>
}

export default function TaskView() {
  const { taskId } = useParams()
  const [task, setTask] = useState(null)
  const [events, setEvents] = useState([])
  const [artifacts, setArtifacts] = useState([])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const wsRef = useRef(null)

  const wsUrl = useMemo(() => wsUrlForTask(taskId), [taskId])

  async function refreshAll() {
    const t = await api.get(`/tasks/${taskId}`)
    setTask(t.data)
    const ev = await api.get(`/tasks/${taskId}/events`)
    setEvents(ev.data)
    const a = await api.get(`/tasks/${taskId}/artifacts`)
    setArtifacts(a.data)
  }

  useEffect(() => {
    let alive = true
    setErr('')
    ;(async () => {
      try {
        await refreshAll()
      } catch (e) {
        if (!alive) return
        setErr(e?.response?.data?.detail || String(e))
      }
    })()
    return () => {
      alive = false
    }
  }, [taskId])

  useEffect(() => {
    let reconnectAttempts = 0
    const maxReconnectAttempts = 5
    let reconnectTimeout = null

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws
        
        ws.onopen = () => {
          console.log('WebSocket connected')
          reconnectAttempts = 0
        }

        ws.onmessage = (m) => {
          try {
            const msg = JSON.parse(m.data)
            
            // Handle task control events
            if (msg.type === 'task_paused') {
              console.log('Task paused event received')
              refreshAll() // Refresh to show paused status
            } else if (msg.type === 'task_resumed') {
              console.log('Task resumed event received')
              refreshAll() // Refresh to show running status
            } else if (msg.type === 'task_cancelled') {
              console.log('Task cancelled event received')
              refreshAll() // Refresh to show cancelled status
            }
            
            // Handle existing event types
            if (msg.type === 'event') {
              setEvents((prev) => {
                // Avoid duplicate events
                if (prev.some(e => e.id === msg.id)) return prev
                return [...prev, {
                  id: msg.id || `${msg.ts}-${Math.random()}`,
                  ts: msg.ts,
                  level: msg.level,
                  message: msg.message,
                  payload_json: msg.payload ? JSON.stringify(msg.payload) : null,
                  step_id: msg.step_id || null
                }]
              })
            }
            if (msg.type === 'progress') {
              // no-op MVP; could show bar later
            }
            // After any message, refresh artifacts (cheap enough for MVP)
            api.get(`/tasks/${taskId}/artifacts`).then((a) => setArtifacts(a.data)).catch(() => {})
            api.get(`/tasks/${taskId}`).then((t) => setTask(t.data)).catch(() => {})
          } catch {
            // ignore
          }
        }

        ws.onerror = (error) => {
          console.error('WebSocket error:', error)
        }

        ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason)
          
          // Attempt reconnection if not explicitly closed
          if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000)
            
            reconnectTimeout = setTimeout(() => {
              console.log(`Attempting WebSocket reconnection (${reconnectAttempts}/${maxReconnectAttempts})`)
              connectWebSocket()
            }, delay)
          }
        }
      } catch (error) {
        console.error('WebSocket connection error:', error)
      }
    }

    connectWebSocket()

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted')
      }
    }
  }, [wsUrl, taskId])

  async function onPause() {
    setErr('')
    setBusy(true)
    try {
      await api.post(`/tasks/${taskId}/pause`)
      await refreshAll()
    } catch (e) {
      setErr(e?.response?.data?.detail || String(e))
    } finally {
      setBusy(false)
    }
  }

  async function onResume() {
    setErr('')
    setBusy(true)
    try {
      await api.post(`/tasks/${taskId}/resume`)
      await refreshAll()
    } catch (e) {
      setErr(e?.response?.data?.detail || String(e))
    } finally {
      setBusy(false)
    }
  }

  async function onPlan() {
    setErr('')
    setBusy(true)
    try {
      await api.post(`/tasks/${taskId}/plan`)
      await refreshAll()
    } catch (e) {
      setErr(e?.response?.data?.detail || String(e))
    } finally {
      setBusy(false)
    }
  }

  async function onCancel() {
    setErr('')
    setBusy(true)
    try {
      await api.post(`/tasks/${taskId}/cancel`)
      await refreshAll()
    } catch (e) {
      setErr(e?.response?.data?.detail || String(e))
    } finally {
      setBusy(false)
    }
  }

  async function onRun() {
    setErr('')
    setBusy(true)
    try {
      await api.post(`/tasks/${taskId}/run`)
      // events will stream via WS
    } catch (e) {
      setErr(e?.response?.data?.detail || String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-zinc-200">Task</div>
            <div className="mt-1 text-sm text-zinc-100">{task?.goal || '…'}</div>
            <div className="mt-1 text-xs text-zinc-500">{taskId}</div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={task?.status} />
          </div>
        </div>

        {err ? <div className="mt-3 text-sm text-red-300">{err}</div> : null}

        {/* Progress Section */}
        {task?.steps && task.steps.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-zinc-400">Progress</div>
              <div className="text-xs text-zinc-400">
                {task.steps.filter(s => s.status === 'succeeded').length} / {task.steps.length}
              </div>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(task.steps.filter(s => s.status === 'succeeded').length / task.steps.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="mt-3 flex items-center gap-2">
          {task?.status === 'queued' && (
            <button
              className="shrink-0 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-white disabled:opacity-50"
              onClick={onPlan}
              disabled={busy || !task}
            >
              Generate Plan
            </button>
          )}
          
          {task?.status === 'ready' && (
            <button
              className="shrink-0 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
              onClick={onRun}
              disabled={busy}
            >
              Run
            </button>
          )}
          
          {task?.status === 'running' && (
            <>
              <button
                className="shrink-0 rounded-lg bg-yellow-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-yellow-700 disabled:opacity-50"
                onClick={onPause}
                disabled={busy}
              >
                Pause
              </button>
              <button
                className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                onClick={onCancel}
                disabled={busy}
              >
                Cancel
              </button>
            </>
          )}
          
          {task?.status === 'paused' && (
            <>
              <button
                className="shrink-0 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
                onClick={onResume}
                disabled={busy}
              >
                Resume
              </button>
              <button
                className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                onClick={onCancel}
                disabled={busy}
              >
                Cancel
              </button>
            </>
          )}
          
          {['failed', 'succeeded'].includes(task?.status) && (
            <button
              className="shrink-0 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-white disabled:opacity-50"
              onClick={onRetry}
              disabled={busy}
            >
              Retry
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={onPlan}
            disabled={busy}
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-900 disabled:opacity-60"
          >
            Generate plan
          </button>
          <button
            onClick={onRun}
            disabled={busy || !task?.steps || task.steps.length === 0}
            className="rounded-xl bg-zinc-100 px-3 py-2 text-sm font-bold text-zinc-950 hover:bg-white disabled:opacity-60"
          >
            {task?.status === 'running' ? 'Running...' : 'Run'}
          </button>
          {task?.status === 'running' && (
            <button
              onClick={onCancel}
              disabled={busy}
              className="rounded-xl border border-red-700 bg-red-950 px-3 py-2 text-sm font-semibold text-red-100 hover:bg-red-900 disabled:opacity-60"
            >
              Cancel
            </button>
          )}
          {task?.status === 'failed' && (
            <button
              onClick={onRun}
              disabled={busy}
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-900 disabled:opacity-60"
            >
              Retry
            </button>
          )}
          <a
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
            href={`${API_BASE}/docs`}
            target="_blank"
            rel="noreferrer"
          >
            API docs
          </a>
        </div>

        {/* Status Messages */}
        {!task?.steps || task.steps.length === 0 ? (
          <div className="mt-3 text-xs text-zinc-400">
            Generate a plan first before running the task.
          </div>
        ) : null}
      </div>

      {/* Three Column Layout */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Events Timeline */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 lg:col-span-2">
          <div className="text-sm font-semibold text-zinc-200">Events Timeline</div>
          <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
            {events.map((e, index) => (
              <div key={e.id} className="relative">
                {/* Timeline Line */}
                {index < events.length - 1 && (
                  <div className="absolute left-4 top-8 w-0.5 h-full bg-zinc-700" />
                )}
                
                {/* Event Item */}
                <div className="flex gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    e.level === 'error' ? 'bg-red-500' : 
                    e.message.includes('started') ? 'bg-blue-500' :
                    e.message.includes('finished') ? 'bg-green-500' : 
                    'bg-zinc-500'
                  }`} />
                  <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${
                          e.level === 'error' ? 'text-red-300' : 'text-zinc-300'
                        }`}>{e.level.toUpperCase()}</span>
                        {e.step_id && <span className="text-xs text-zinc-500">Step</span>}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {new Date(e.ts).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-zinc-100">{e.message}</div>
                    {e.payload_json && (
                      <details className="mt-2">
                        <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-300">
                          Details
                        </summary>
                        <pre className="mt-2 overflow-auto rounded-lg bg-zinc-950 p-2 text-xs text-zinc-300">
                          {e.payload_json}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {events.length === 0 ? <div className="text-sm text-zinc-500">No events yet.</div> : null}
          </div>
        </div>

        {/* Live Log Panel */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-sm font-semibold text-zinc-200">Live Logs</div>
          <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
            {events
              .filter(e => e.level === 'error' || e.message.includes('Executing') || e.message.includes('output'))
              .slice(-10)
              .map((e) => (
                <div key={e.id} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-medium ${
                      e.level === 'error' ? 'text-red-300' : 'text-zinc-300'
                    }`}>
                      {e.level === 'error' ? 'ERROR' : 'OUTPUT'}
                    </span>
                    <div className="text-[11px] text-zinc-500">
                      {new Date(e.ts).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-zinc-100 font-mono break-all">
                    {e.message}
                  </div>
                  {e.payload_json && (
                    <pre className="mt-1 overflow-auto rounded bg-zinc-950 p-1 text-xs text-zinc-300">
                      {JSON.parse(e.payload_json)?.output || ''}
                    </pre>
                  )}
                </div>
              ))}
            {events.filter(e => e.level === 'error' || e.message.includes('Executing')).length === 0 ? (
              <div className="text-sm text-zinc-500">No logs yet.</div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Artifacts Panel */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="text-sm font-semibold text-zinc-200">Artifacts ({artifacts.length})</div>
        <div className="mt-3 grid gap-2">
          {artifacts.map((a) => {
            const filename = a.path.split('\\').pop() || a.path.split('/').pop()
            const extension = filename.split('.').pop()?.toLowerCase()
            const isText = ['txt', 'py', 'js', 'md', 'json', 'csv'].includes(extension)
            const isImage = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(extension)
            
            return (
              <div key={a.id} className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-zinc-100 truncate">{filename}</div>
                    <span className="text-xs text-zinc-500">.{extension}</span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {a.kind} • {isText ? 'Previewable' : isImage ? 'Image' : 'Binary'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isImage && (
                    <button
                      className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
                      onClick={() => {
                        const img = new Image()
                        img.onload = () => {
                          const w = window.open('', '_blank')
                          w.document.write(`<html><head><title>${filename}</title></head><body style="margin:0;padding:20px;background:#111"><img src="${API_BASE}/artifacts/${a.id}/download" style="max-width:100%;height:auto;" /></body></html>`)
                        }
                        img.src = `${API_BASE}/artifacts/${a.id}/download`
                      }}
                    >
                      Preview
                    </button>
                  )}
                  {isText && (
                    <button
                      className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
                      onClick={() => window.open(`${API_BASE}/artifacts/${a.id}/download`, '_blank')}
                    >
                      Preview
                    </button>
                  )}
                  <a
                    className="shrink-0 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-white"
                    href={`${API_BASE}/artifacts/${a.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download
                  </a>
                </div>
              </div>
            )
          })}
          {artifacts.length === 0 ? <div className="text-sm text-zinc-500">No artifacts yet.</div> : null}
        </div>
      </div>
    </div>
  )
}
