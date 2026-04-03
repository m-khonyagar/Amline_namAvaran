import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { loadLead, updateLeadRecord } from '../../features/crm/crmService'
import { logAudit } from '../../lib/auditLog'
import { ActivityTimeline } from '../../features/crm/components/ActivityTimeline'
import { LeadForm, type LeadFormValues } from '../../features/crm/components/LeadForm'
import type { Lead } from '../../features/crm/types'

const NEED_TYPE_LABELS: Record<string, string> = {
  RENT: 'اجاره', BUY: 'خرید', SELL: 'فروش',
}

const STATUS_LABELS: Record<string, string> = {
  NEW: 'جدید', CONTACTED: 'تماس گرفته', NEGOTIATING: 'در مذاکره',
  CONTRACTED: 'منعقد شده', LOST: 'از دست رفته',
}

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  CONTACTED: 'bg-yellow-100 text-yellow-700',
  NEGOTIATING: 'bg-orange-100 text-orange-700',
  CONTRACTED: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setLead(null)
      return
    }
    setLoading(true)
    void loadLead(id).then((l) => {
      setLead(l)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <div dir="rtl" className="flex justify-center p-10 text-gray-500">
        در حال بارگذاری…
      </div>
    )
  }

  if (!lead) {
    return (
      <div dir="rtl" className="p-6">
        <div className="rounded-lg bg-red-50 p-4 text-red-700">Lead یافت نشد</div>
      </div>
    )
  }

  const handleUpdate = (values: LeadFormValues) => {
    void (async () => {
      const updated = await updateLeadRecord(lead.id, {
        full_name: values.full_name,
        mobile: values.mobile,
        need_type: values.need_type,
        notes: values.notes,
        assigned_to: values.assigned_to,
        province_id: values.province_id || null,
        city_id: values.city_id || null,
      })
      if (updated) setLead(updated)
      void logAudit('crm.lead.update', 'lead', { lead_id: lead.id })
      toast.success('اطلاعات Lead به‌روز شد')
      setIsEditing(false)
      navigate(`/crm/${id}`, { replace: true })
    })()
  }

  return (
    <div dir="rtl" className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <button type="button" onClick={() => navigate('/crm')} className="text-sm text-gray-500 hover:text-gray-700">
          ← بازگشت
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{lead.full_name}</h1>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {STATUS_LABELS[lead.status] ?? lead.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {isEditing ? (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">ویرایش اطلاعات</h2>
              <LeadForm
                initialValues={lead}
                onSubmit={handleUpdate}
                onCancel={() => setIsEditing(false)}
              />
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">اطلاعات Lead</h2>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  ویرایش
                </button>
              </div>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">نام کامل</dt>
                  <dd className="text-sm font-medium">{lead.full_name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">موبایل</dt>
                  <dd className="font-mono text-sm">{lead.mobile}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">استان / شهر</dt>
                  <dd className="text-sm">
                    {[lead.province_name_fa, lead.city_name_fa].filter(Boolean).join('، ') || '—'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">نوع نیاز</dt>
                  <dd className="text-sm">{NEED_TYPE_LABELS[lead.need_type] ?? lead.need_type}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">تخصیص به</dt>
                  <dd className="text-sm">{lead.assigned_to ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">تاریخ ایجاد</dt>
                  <dd className="text-sm">{new Date(lead.created_at).toLocaleDateString('fa-IR')}</dd>
                </div>
                {lead.notes && (
                  <div>
                    <dt className="mb-1 text-sm text-gray-500">یادداشت</dt>
                    <dd className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{lead.notes}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        <div>
          <ActivityTimeline leadId={lead.id} />
        </div>
      </div>
    </div>
  )
}
