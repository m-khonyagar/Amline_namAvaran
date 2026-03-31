import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { Lead, LeadStatus } from '../types'
import { getLeads, updateLeadStatus, createLead } from '../crmStorage'
import { LeadCard } from './LeadCard'
import { LeadForm } from './LeadForm'

const COLUMNS: { status: LeadStatus; label: string; color: string }[] = [
  { status: 'NEW', label: 'جدید', color: 'bg-blue-50 border-blue-200' },
  { status: 'CONTACTED', label: 'تماس گرفته', color: 'bg-yellow-50 border-yellow-200' },
  { status: 'NEGOTIATING', label: 'در مذاکره', color: 'bg-orange-50 border-orange-200' },
  { status: 'CONTRACTED', label: 'منعقد شده', color: 'bg-green-50 border-green-200' },
  { status: 'LOST', label: 'از دست رفته', color: 'bg-red-50 border-red-200' },
]

export function KanbanBoard() {
  const navigate = useNavigate()
  const [leads, setLeads] = useState<Lead[]>(() => getLeads())
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [showNewLeadForm, setShowNewLeadForm] = useState(false)

  const refresh = () => setLeads(getLeads())

  const handleDragStart = (_e: DragEvent, id: string) => {
    setDraggingId(id)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStatus: LeadStatus) => {
    e.preventDefault()
    if (!draggingId) return
    const updated = updateLeadStatus(draggingId, targetStatus)
    if (updated) {
      refresh()
      toast.success('وضعیت Lead به‌روز شد')
    }
    setDraggingId(null)
  }

  const handleCreateLead = (values: {
    full_name: string
    mobile: string
    need_type: 'RENT' | 'BUY' | 'SELL'
    notes: string
    assigned_to: string | null
  }) => {
    createLead({ ...values, status: 'NEW', contract_id: null })
    refresh()
    setShowNewLeadForm(false)
    toast.success('Lead جدید ایجاد شد')
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
                <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-500 shadow-sm">
                  {colLeads.length}
                </span>
              </div>

              <div className="space-y-2">
                {colLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onView={(id) => navigate(`/crm/${id}`)}
                    draggable
                    onDragStart={handleDragStart}
                  />
                ))}
              </div>

              {col.status === 'NEW' && (
                <button
                  onClick={() => setShowNewLeadForm(true)}
                  className="mt-3 w-full rounded-lg border-2 border-dashed border-blue-300 py-2 text-sm text-blue-500 hover:border-blue-400 hover:bg-blue-50"
                >
                  + افزودن Lead
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
