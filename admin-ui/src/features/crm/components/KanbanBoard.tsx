import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { Lead, LeadStatus } from '../types'
import { loadLeads, saveLeadStatus, createLeadRecord } from '../crmService'
import { logAudit } from '../../../lib/auditLog'
import { LeadCard } from './LeadCard'
import { LeadForm, type LeadFormValues } from './LeadForm'

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

  const handleCreateLead = (values: LeadFormValues) => {
    void (async () => {
      await createLeadRecord({
        full_name: values.full_name,
        mobile: values.mobile,
        need_type: values.need_type,
        notes: values.notes,
        assigned_to: values.assigned_to,
        province_id: values.province_id || null,
        city_id: values.city_id || null,
      })
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
