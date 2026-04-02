import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { Lead, LeadStatus } from '../types'
import { bulkSaveLeadStatus, loadLeads, saveLeadStatus, createLeadRecord } from '../crmService'
import { logAudit } from '../../../lib/auditLog'
import { LeadCard } from './LeadCard'
import { LeadForm } from './LeadForm'
import { EmptyState } from '../../../components/patterns/EmptyState'

const COLUMNS: { status: LeadStatus; label: string; color: string }[] = [
  { status: 'NEW', label: 'جدید', color: 'bg-blue-50 border-blue-200' },
  { status: 'CONTACTED', label: 'تماس گرفته', color: 'bg-yellow-50 border-yellow-200' },
  { status: 'NEGOTIATING', label: 'در مذاکره', color: 'bg-orange-50 border-orange-200' },
  { status: 'CONTRACTED', label: 'منعقد شده', color: 'bg-green-50 border-green-200' },
  { status: 'LOST', label: 'از دست رفته', color: 'bg-red-50 border-red-200' },
]

export function KanbanBoard() {
  const navigate = useNavigate()
  const [leads, setLeads] = useState<Lead[]>([])
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [showNewLeadForm, setShowNewLeadForm] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkTarget, setBulkTarget] = useState<LeadStatus>('NEW')

  const refresh = () => {
    void loadLeads().then(setLeads)
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleDragStart = (_e: DragEvent, id: string) => {
    setDraggingId(id)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStatus: LeadStatus) => {
    e.preventDefault()
    if (!draggingId) return
    void (async () => {
      const updated = await saveLeadStatus(draggingId, targetStatus)
      if (updated) {
        void logAudit('crm.lead.status_change', 'lead', {
          lead_id: draggingId,
          status: targetStatus,
        })
        refresh()
        toast.success('وضعیت Lead به‌روز شد')
      }
      setDraggingId(null)
    })()
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const applyBulkMove = () => {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    if (!window.confirm(`وضعیت ${ids.length} Lead به «${COLUMNS.find((c) => c.status === bulkTarget)?.label ?? bulkTarget}» تغییر کند؟`))
      return
    void (async () => {
      const n = await bulkSaveLeadStatus(ids, bulkTarget)
      void logAudit('crm.lead.bulk_status', 'lead', { count: n, status: bulkTarget, ids })
      toast.success(n ? `${n} مورد به‌روز شد` : 'به‌روزرسانی انجام نشد')
      setSelectedIds(new Set())
      setBulkMode(false)
      refresh()
    })()
  }

  const handleCreateLead = (values: {
    full_name: string
    mobile: string
    need_type: 'RENT' | 'BUY' | 'SELL'
    notes: string
    assigned_to: string | null
  }) => {
    void (async () => {
      await createLeadRecord(values)
      void logAudit('crm.lead.create', 'lead', { full_name: values.full_name })
      refresh()
      setShowNewLeadForm(false)
      toast.success('Lead جدید ایجاد شد')
    })()
  }

  return (
    <div dir="rtl" className="overflow-x-auto">
      {showNewLeadForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">افزودن Lead جدید</h2>
            <LeadForm
              onSubmit={handleCreateLead}
              onCancel={() => setShowNewLeadForm(false)}
            />
          </div>
        </div>
      )}

      {leads.length === 0 && !showNewLeadForm ? (
        <div className="mb-6">
          <EmptyState
            title="هنوز Leadای ثبت نشده"
            description="برای شروع فروش، اولین Lead را اضافه کنید."
            action={
              <button
                type="button"
                onClick={() => setShowNewLeadForm(true)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                افزودن Lead
              </button>
            }
          />
        </div>
      ) : null}

      {leads.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => {
              setBulkMode((v) => {
                if (v) setSelectedIds(new Set())
                return !v
              })
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600"
          >
            {bulkMode ? 'خروج از حالت گروهی' : 'عملیات گروهی روی Leadها'}
          </button>
          {bulkMode ? (
            <>
              <span className="text-sm text-gray-600 dark:text-slate-400">{selectedIds.size} انتخاب‌شده</span>
              <select
                aria-label="وضعیت مقصد برای انتقال گروهی"
                value={bulkTarget}
                onChange={(e) => setBulkTarget(e.target.value as LeadStatus)}
                className="rounded-lg border border-gray-300 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              >
                {COLUMNS.map((c) => (
                  <option key={c.status} value={c.status}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={selectedIds.size === 0}
                onClick={applyBulkMove}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40 hover:bg-blue-700"
              >
                اعمال انتقال
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-gray-600 underline dark:text-slate-400"
              >
                لغو انتخاب
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="flex gap-4 pb-4" style={{ minWidth: '900px' }}>
        {COLUMNS.map((col) => {
          const colLeads = leads.filter((l) => l.status === col.status)
          return (
            <div
              key={col.status}
              className={`flex-1 rounded-xl border-2 ${col.color} p-3`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.status)}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800">{col.label}</h3>
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {colLeads.length}
                </span>
              </div>
              {col.status === 'NEW' && (
                <button
                  type="button"
                  onClick={() => setShowNewLeadForm(true)}
                  className="mb-3 w-full rounded-lg border border-dashed border-blue-300 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
                >
                  + افزودن Lead
                </button>
              )}
              <div className="space-y-2">
                {colLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    draggable
                    onDragStart={handleDragStart}
                    onView={(lid) => navigate(`/crm/${lid}`)}
                    selectMode={bulkMode}
                    selected={selectedIds.has(lead.id)}
                    onToggleSelect={toggleSelect}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
