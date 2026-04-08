import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { LeadActivity } from '../types'
import { loadActivities, addLeadActivityRecord } from '../crmService'
import { useAuth } from '../../../hooks/useAuth'
import { formatShamsiDate } from '../../../lib/persianDateTime'

interface ActivityTimelineProps {
  leadId: string
}

const TYPE_ICONS: Record<string, string> = {
  CALL: '📞',
  MESSAGE: '💬',
  NOTE: '📝',
  STATUS_CHANGE: '🔄',
}

const TYPE_LABELS: Record<string, string> = {
  CALL: 'تماس',
  MESSAGE: 'پیام',
  NOTE: 'یادداشت',
  STATUS_CHANGE: 'تغییر وضعیت',
}

interface NewActivityForm {
  type: LeadActivity['type']
  content: string
}

export function ActivityTimeline({ leadId }: ActivityTimelineProps) {
  const { user } = useAuth()
  const [activities, setActivities] = useState<LeadActivity[]>([])

  const refresh = useCallback(() => {
    void loadActivities(leadId).then((list) =>
      setActivities(
        [...list].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      )
    )
  }, [leadId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const { register, handleSubmit, reset } = useForm<NewActivityForm>({
    defaultValues: { type: 'NOTE', content: '' },
  })

  const onSubmit = (values: NewActivityForm) => {
    if (!values.content.trim()) return
    void (async () => {
      await addLeadActivityRecord({
        lead_id: leadId,
        type: values.type,
        content: values.content.trim(),
        created_by: user?.full_name ?? user?.mobile ?? 'ادمین',
      })
      refresh()
      reset()
      toast.success('فعالیت ثبت شد')
    })()
  }

  return (
    <div dir="rtl" className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">ثبت فعالیت جدید</h3>
        <div className="mb-3 flex gap-2">
          {(['NOTE', 'CALL', 'MESSAGE'] as const).map((t) => (
            <label key={t} className="flex cursor-pointer items-center gap-1.5">
              <input type="radio" value={t} {...register('type')} className="accent-blue-600" />
              <span className="text-sm">{TYPE_ICONS[t]} {TYPE_LABELS[t]}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <textarea
            {...register('content')}
            rows={2}
            placeholder="محتوای فعالیت..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="self-end rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            ثبت
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {activities.length === 0 && (
          <p className="text-center text-sm text-gray-400">فعالیتی ثبت نشده است</p>
        )}
        {activities.map((activity, idx) => (
          <div key={activity.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-base">
                {TYPE_ICONS[activity.type] ?? '📌'}
              </div>
              {idx < activities.length - 1 && (
                <div className="mt-1 h-full w-px bg-gray-200" />
              )}
            </div>
            <div className="flex-1 pb-3">
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">
                    {TYPE_LABELS[activity.type] ?? activity.type} — {activity.created_by}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatShamsiDate(activity.created_at)}
                  </span>
                </div>
                <p className="text-sm text-gray-800">{activity.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
