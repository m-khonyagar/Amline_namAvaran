import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '../../lib/api'
import { parsePhonesFromSpreadsheet, parsePhonesFromText } from '../../features/users/parseBulkPhones'

type Props = {
  open: boolean
  onClose: () => void
}

export function BulkImportUsersModal({ open, onClose }: Props) {
  const qc = useQueryClient()
  const [paste, setPaste] = useState('')
  const [defaultRole, setDefaultRole] = useState('user')

  const bulkMutation = useMutation({
    mutationFn: async (mobiles: string[]) => {
      const res = await apiClient.post<{ created: number; skipped: number; total: number }>(
        '/admin/users/bulk-import',
        { mobiles, default_role: defaultRole }
      )
      return res.data
    },
    onSuccess: (data) => {
      toast.success(`${data.created} کاربر جدید · ${data.skipped} رد شده`)
      void qc.invalidateQueries({ queryKey: ['users'] })
      void qc.invalidateQueries({ queryKey: ['admin-analytics-users'] })
      setPaste('')
      onClose()
    },
    onError: () => toast.error('ورود دسته‌ای ناموفق بود'),
  })

  if (!open) return null

  const runImport = (mobiles: string[]) => {
    const uniq = [...new Set(mobiles.map((m) => m.replace(/\s/g, '')))].filter(Boolean)
    if (uniq.length === 0) {
      toast.error('شماره‌ای یافت نشد')
      return
    }
    bulkMutation.mutate(uniq)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal aria-labelledby="bulk-import-title">
      <button type="button" className="absolute inset-0 bg-slate-900/60" aria-label="بستن" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-600 dark:bg-slate-900">
        <h2 id="bulk-import-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
          ورود دسته‌ای کاربر (موبایل)
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          فایل Excel/CSV (ستون اول = موبایل) یا چسباندن لیست شماره‌ها. فرمت معتبر: ۰۹۱۲…
        </p>

        <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">
          نقش پیش‌فرض
          <select
            aria-label="نقش پیش‌فرض کاربران واردشده"
            value={defaultRole}
            onChange={(e) => setDefaultRole(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          >
            <option value="user">کاربر</option>
            <option value="realtor">مشاور</option>
            <option value="accountant">حسابدار</option>
          </select>
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">
          چسباندن شماره‌ها
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={5}
            placeholder="09121112233&#10;09123334455"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-800"
          />
        </label>
        <button
          type="button"
          disabled={bulkMutation.isPending}
          onClick={() => runImport(parsePhonesFromText(paste))}
          className="mt-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          ثبت از متن
        </button>

        <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            فایل Excel یا CSV
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="mt-2 block w-full text-sm text-slate-600 file:mr-0 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm dark:text-slate-400 dark:file:bg-slate-800"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (!f) return
                try {
                  const list = await parsePhonesFromSpreadsheet(f)
                  runImport(list)
                } catch {
                  toast.error('خواندن فایل ناموفق بود')
                }
              }}
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-slate-600"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  )
}
