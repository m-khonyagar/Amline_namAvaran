import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { apiClient } from '../../lib/api'
import type { ContractResponse, Party } from '../../features/contract-wizard/types/api'
import type { ContractStatus } from '../../features/contract-wizard/types/wizard'
import { AddendumForm } from '../../features/contract-wizard/components/AddendumForm'
import { AddendumList } from '../../features/contract-wizard/components/AddendumList'
import { formatShamsiDate } from '../../lib/persianDateTime'

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

const LEGAL_REVIEW_LABELS: Record<string, string> = {
  NONE: 'بدون بررسی',
  AWAITING_STAFF: 'در انتظار بررسی حقوقی',
  APPROVED: 'تأیید حقوقی',
  REJECTED: 'رد حقوقی',
}

function partyRoleLabels(contractType: string) {
  if (contractType === 'BUYING_AND_SELLING') {
    return { LANDLORD: 'فروشنده', TENANT: 'خریدار' } as const
  }
  return { LANDLORD: 'موجر', TENANT: 'مستأجر' } as const
}

function flattenPartiesRecord(parties: Record<string, unknown>): Party[] {
  const landlords = parties.landlords
  const tenants = parties.tenants
  const a = Array.isArray(landlords) ? (landlords as Party[]) : []
  const b = Array.isArray(tenants) ? (tenants as Party[]) : []
  return [...a, ...b]
}

function toTomanRial(rial: unknown): string {
  const n = typeof rial === 'number' ? rial : Number(rial)
  if (!n || Number.isNaN(n)) return '—'
  return (n / 10).toLocaleString('fa-IR')
}

function StatusBadge({ status }: { status: ContractStatus }) {
  const colorClass =
    status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
    status === 'PENDING_ADMIN_APPROVAL' ? 'bg-yellow-100 text-yellow-700' :
    status === 'ADMIN_REJECTED' || status === 'REVOKED' ? 'bg-red-100 text-red-700' :
    status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
    'bg-gray-100 text-gray-600'
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
      const res = await apiClient.get<ContractResponse>(`/contracts/${id}`)
      return res.data
    },
    enabled: !!id,
  })

  const approveMutation = useMutation({
    mutationFn: () => apiClient.post(`/admin/contracts/${id}/approve`),
    onSuccess: () => {
      toast.success('قرارداد تأیید شد')
      queryClient.invalidateQueries({ queryKey: ['contract', id] })
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
    onError: () => toast.error('خطا در تأیید قرارداد'),
  })

  const rejectMutation = useMutation({
    mutationFn: () => apiClient.post(`/admin/contracts/${id}/reject`),
    onSuccess: () => {
      toast.success('قرارداد رد شد')
      queryClient.invalidateQueries({ queryKey: ['contract', id] })
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
    onError: () => toast.error('خطا در رد قرارداد'),
  })

  const revokeMutation = useMutation({
    mutationFn: () => apiClient.post(`/admin/contracts/${id}/revoke`),
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
        <div className="rounded-lg bg-red-50 p-4 text-red-700">خطا در دریافت اطلاعات قرارداد</div>
      </div>
    )
  }

  const allParties = flattenPartiesRecord(contract.parties)
  const roleLabels = partyRoleLabels(contract.type)
  const p = contract.parties
  const salePrice = p.sale_price
  const rentAmt = p.rent_amount
  const depAmt = p.deposit_amount

  return (
    <div dir="rtl" className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/contracts')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← بازگشت
        </button>
        <h1 className="text-2xl font-bold text-gray-900">جزئیات قرارداد</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">اطلاعات کلی</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">شناسه قرارداد</dt>
                <dd className="mt-1 font-mono text-sm">{contract.id}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">نوع قرارداد</dt>
                <dd className="mt-1 font-medium">{TYPE_LABELS[contract.type] ?? contract.type}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">وضعیت</dt>
                <dd className="mt-1"><StatusBadge status={contract.status} /></dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">تاریخ ایجاد</dt>
                <dd className="mt-1 text-sm">
                  {formatShamsiDate(contract.created_at)}
                </dd>
              </div>
              {contract.step && (
                <div>
                  <dt className="text-sm text-gray-500">مرحله جاری</dt>
                  <dd className="mt-1 text-sm">{contract.step}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-gray-500">کد رهگیری</dt>
                <dd className="mt-1 font-mono text-sm">{contract.tracking_code ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">وضعیت بررسی حقوقی</dt>
                <dd className="mt-1 text-sm">
                  {LEGAL_REVIEW_LABELS[contract.legal_review_status ?? 'NONE'] ??
                    contract.legal_review_status ??
                    '—'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Parties */}
          {allParties.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">طرفین قرارداد</h2>
              <div className="space-y-3">
                {allParties.map((party) => (
                  <div key={party.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <div>
                      <span className="text-sm font-medium">
                        {roleLabels[party.party_type as keyof typeof roleLabels] ?? party.party_type}
                      </span>
                      <span className="mr-2 text-xs text-gray-500">({party.person_type})</span>
                    </div>
                    <div className="text-xs text-gray-400">شناسه: {party.id}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(contract.type === 'BUYING_AND_SELLING' && salePrice != null && Number(salePrice) > 0) ||
          (contract.type === 'PROPERTY_RENT' &&
            ((rentAmt != null && Number(rentAmt) > 0) || (depAmt != null && Number(depAmt) > 0))) ? (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">خلاصهٔ مالی ثبت‌شده</h2>
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                {contract.type === 'BUYING_AND_SELLING' && salePrice != null && Number(salePrice) > 0 ? (
                  <div>
                    <dt className="text-gray-500">قیمت فروش (ریال)</dt>
                    <dd className="mt-1 font-medium">{Number(salePrice).toLocaleString('fa-IR')}</dd>
                    <dd className="text-xs text-gray-500">معادل {toTomanRial(salePrice)} تومان</dd>
                  </div>
                ) : null}
                {contract.type === 'PROPERTY_RENT' && rentAmt != null && Number(rentAmt) > 0 ? (
                  <div>
                    <dt className="text-gray-500">اجاره ماهانه (ریال)</dt>
                    <dd className="mt-1 font-medium">{Number(rentAmt).toLocaleString('fa-IR')}</dd>
                  </div>
                ) : null}
                {contract.type === 'PROPERTY_RENT' && depAmt != null && Number(depAmt) > 0 ? (
                  <div>
                    <dt className="text-gray-500">ودیعه (ریال)</dt>
                    <dd className="mt-1 font-medium">{Number(depAmt).toLocaleString('fa-IR')}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}

          {/* Addendum */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">متمم‌های قرارداد</h2>
              <button
                type="button"
                onClick={() => setShowAddendumForm((s) => !s)}
                className="rounded-lg border border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5"
              >
                {showAddendumForm ? 'بستن فرم' : 'ثبت متمم جدید'}
              </button>
            </div>

            {showAddendumForm && (
              <div className="mb-5 rounded-lg border border-gray-100 bg-gray-50 p-4">
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
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">عملیات</h2>
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
                <p className="text-sm text-gray-400 text-center">عملیاتی در دسترس نیست</p>
              )}
            </div>
          </div>

          {/* Signature Status */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">وضعیت امضا</h2>
            <div className="space-y-2">
              {(['ONE_PARTY_SIGNED', 'FULLY_SIGNED', 'LANDLORDS_FULLY_SIGNED', 'TENANTS_FULLY_SIGNED'] as ContractStatus[]).map((s) => (
                <div key={s} className="flex items-center gap-2 text-sm">
                  <span className={`h-2 w-2 rounded-full ${contract.status === s ? 'bg-green-500' : 'bg-gray-200'}`} />
                  <span className={contract.status === s ? 'font-medium text-gray-800' : 'text-gray-400'}>
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
