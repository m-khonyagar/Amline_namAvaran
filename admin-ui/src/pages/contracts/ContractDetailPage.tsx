import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { apiClient } from '../../lib/api'
import { apiV1 } from '../../lib/apiPaths'
import type { ContractResponse, Party } from '../../features/contract-wizard/types/api'
import type { ContractStatus } from '../../features/contract-wizard/types/wizard'
import { AddendumForm } from '../../features/contract-wizard/components/AddendumForm'
import { AddendumList } from '../../features/contract-wizard/components/AddendumList'

const STATUS_LABELS: Record<string, string> = {
  ADMIN_STARTED: 'شروع شده توسط ادمین',
  DRAFT: 'پیش‌نویس',
  ONE_PARTY_SIGNED: 'یک طرف امضا کرده',
  FULLY_SIGNED: 'همه امضا کرده‌اند',
  LANDLORDS_FULLY_SIGNED: 'موجر امضا کرده',
  TENANTS_FULLY_SIGNED: 'مستأجر امضا کرده',
  ACTIVE: 'فعال',
  PENDING_COMMISSION: 'در انتظار کمیسیون',
  EDIT_REQUESTED: 'درخواست ویرایش',
  PARTY_REJECTED: 'رد شده توسط طرف',
  PENDING_ADMIN_APPROVAL: 'در انتظار تأیید ادمین',
  ADMIN_REJECTED: 'رد شده توسط ادمین',
  COMPLETED: 'تکمیل شده',
  REVOKED: 'فسخ شده',
  PDF_GENERATED: 'PDF تولید شده',
  PDF_GENERATING_FAILED: 'خطا در تولید PDF',
}

const TYPE_LABELS: Record<string, string> = {
  PROPERTY_RENT: 'رهن و اجاره',
  BUYING_AND_SELLING: 'خرید و فروش',
}

const PARTY_TYPE_LABELS: Record<string, string> = {
  LANDLORD: 'موجر',
  TENANT: 'مستأجر',
}

function StatusBadge({ status }: { status: ContractStatus }) {
  const colorClass =
    status === 'ACTIVE'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
      : status === 'PENDING_ADMIN_APPROVAL'
        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
        : status === 'ADMIN_REJECTED' || status === 'REVOKED'
          ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200'
          : status === 'COMPLETED'
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200'
            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${colorClass}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showAddendumForm, setShowAddendumForm] = useState(false)

  const { data: contract, isLoading, isError } = useQuery<ContractResponse>({
    queryKey: ['contract', id],
    queryFn: async () => {
      const res = await apiClient.get<ContractResponse>(apiV1(`contracts/${id}`))
      return res.data
    },
    enabled: !!id,
  })

  const approveMutation = useMutation({
    mutationFn: () => apiClient.post(apiV1(`admin/contracts/${id}/approve`)),
    onSuccess: () => {
      toast.success('قرارداد تأیید شد')
      queryClient.invalidateQueries({ queryKey: ['contract', id] })
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
    onError: () => toast.error('خطا در تأیید قرارداد'),
  })

  const rejectMutation = useMutation({
    mutationFn: () => apiClient.post(apiV1(`admin/contracts/${id}/reject`)),
    onSuccess: () => {
      toast.success('قرارداد رد شد')
      queryClient.invalidateQueries({ queryKey: ['contract', id] })
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
    onError: () => toast.error('خطا در رد قرارداد'),
  })

  const revokeMutation = useMutation({
    mutationFn: () => apiClient.post(apiV1(`admin/contracts/${id}/revoke`)),
    onSuccess: () => {
      toast.success('قرارداد فسخ شد')
      queryClient.invalidateQueries({ queryKey: ['contract', id] })
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
    onError: () => toast.error('خطا در فسخ قرارداد'),
  })

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (isError || !contract) {
    return (
      <div dir="rtl" className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          خطا در دریافت اطلاعات قرارداد
        </div>
      </div>
    )
  }

  const allParties = (Object.values(contract.parties).flat() as Party[])

  return (
    <div dir="rtl" className="p-6 text-[var(--amline-fg)]">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/contracts')}
          className="text-sm text-[var(--amline-fg-muted)] hover:text-[var(--amline-fg)]"
        >
          ← بازگشت
        </button>
        <h1 className="text-2xl font-bold text-[var(--amline-fg)]">جزئیات قرارداد</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-[var(--amline-border)] bg-[var(--amline-surface)] p-6 shadow-sm dark:border-slate-600">
            <h2 className="mb-4 text-lg font-semibold text-[var(--amline-fg)]">اطلاعات کلی</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-[var(--amline-fg-muted)]">شناسه قرارداد</dt>
                <dd className="mt-1 font-mono text-sm text-[var(--amline-fg)]">{contract.id}</dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--amline-fg-muted)]">نوع قرارداد</dt>
                <dd className="mt-1 font-medium text-[var(--amline-fg)]">
                  {TYPE_LABELS[contract.type] ?? contract.type}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--amline-fg-muted)]">وضعیت</dt>
                <dd className="mt-1"><StatusBadge status={contract.status} /></dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--amline-fg-muted)]">تاریخ ایجاد</dt>
                <dd className="mt-1 text-sm text-[var(--amline-fg)]">
                  {new Date(contract.created_at).toLocaleDateString('fa-IR')}
                </dd>
              </div>
              {contract.step && (
                <div>
                  <dt className="text-sm text-[var(--amline-fg-muted)]">مرحله جاری</dt>
                  <dd className="mt-1 text-sm text-[var(--amline-fg)]">{contract.step}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Parties */}
          {allParties.length > 0 && (
            <div className="rounded-lg border border-[var(--amline-border)] bg-[var(--amline-surface)] p-6 shadow-sm dark:border-slate-600">
              <h2 className="mb-4 text-lg font-semibold text-[var(--amline-fg)]">طرفین قرارداد</h2>
              <div className="space-y-3">
                {allParties.map((party) => (
                  <div
                    key={party.id}
                    className="flex items-center justify-between rounded-lg bg-[var(--amline-surface-muted)] p-3 dark:bg-slate-800/60"
                  >
                    <div>
                      <span className="text-sm font-medium text-[var(--amline-fg)]">
                        {PARTY_TYPE_LABELS[party.party_type] ?? party.party_type}
                      </span>
                      <span className="mr-2 text-xs text-[var(--amline-fg-muted)]">({party.person_type})</span>
                    </div>
                    <div className="text-xs text-[var(--amline-fg-subtle)]">شناسه: {party.id}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Addendum */}
          <div className="rounded-lg border border-[var(--amline-border)] bg-[var(--amline-surface)] p-6 shadow-sm dark:border-slate-600">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--amline-fg)]">متمم‌های قرارداد</h2>
              <button
                type="button"
                onClick={() => setShowAddendumForm((s) => !s)}
                className="rounded-lg border border-[var(--amline-primary)] px-3 py-1.5 text-sm font-medium text-[var(--amline-primary)] hover:bg-[var(--amline-primary-muted)] dark:hover:bg-blue-950/40"
              >
                {showAddendumForm ? 'بستن فرم' : 'ثبت متمم جدید'}
              </button>
            </div>

            {showAddendumForm && (
              <div className="mb-5 rounded-lg border border-[var(--amline-border)] bg-[var(--amline-surface-muted)] p-4 dark:border-slate-600 dark:bg-slate-800/40">
                <AddendumForm
                  contractId={contract.id}
                  onSuccess={() => {
                    toast.success('متمم ثبت شد')
                    setShowAddendumForm(false)
                  }}
                  onCancel={() => setShowAddendumForm(false)}
                />
              </div>
            )}

            <AddendumList contractId={contract.id} />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--amline-border)] bg-[var(--amline-surface)] p-6 shadow-sm dark:border-slate-600">
            <h2 className="mb-4 text-lg font-semibold text-[var(--amline-fg)]">عملیات</h2>
            <div className="space-y-3">
              {contract.status === 'PENDING_ADMIN_APPROVAL' && (
                <>
                  <button
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending}
                    className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {approveMutation.isPending ? 'در حال تأیید...' : 'تأیید قرارداد'}
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate()}
                    disabled={rejectMutation.isPending}
                    className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {rejectMutation.isPending ? 'در حال رد...' : 'رد قرارداد'}
                  </button>
                </>
              )}
              {contract.status === 'ACTIVE' && (
                <button
                  onClick={() => {
                    if (confirm('آیا از فسخ این قرارداد مطمئن هستید؟')) {
                      revokeMutation.mutate()
                    }
                  }}
                  disabled={revokeMutation.isPending}
                  className="w-full rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                >
                  {revokeMutation.isPending ? 'در حال فسخ...' : 'فسخ قرارداد'}
                </button>
              )}
              {contract.status !== 'PENDING_ADMIN_APPROVAL' && contract.status !== 'ACTIVE' && (
                <p className="text-center text-sm text-[var(--amline-fg-subtle)]">عملیاتی در دسترس نیست</p>
              )}
            </div>
          </div>

          {/* Signature Status */}
          <div className="rounded-lg border border-[var(--amline-border)] bg-[var(--amline-surface)] p-6 shadow-sm dark:border-slate-600">
            <h2 className="mb-4 text-lg font-semibold text-[var(--amline-fg)]">وضعیت امضا</h2>
            <div className="space-y-2">
              {(['ONE_PARTY_SIGNED', 'FULLY_SIGNED', 'LANDLORDS_FULLY_SIGNED', 'TENANTS_FULLY_SIGNED'] as ContractStatus[]).map((s) => (
                <div key={s} className="flex items-center gap-2 text-sm">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      contract.status === s ? 'bg-emerald-500' : 'bg-[var(--amline-border)] dark:bg-slate-600'
                    }`}
                  />
                  <span
                    className={
                      contract.status === s
                        ? 'font-medium text-[var(--amline-fg)]'
                        : 'text-[var(--amline-fg-subtle)]'
                    }
                  >
                    {STATUS_LABELS[s]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
