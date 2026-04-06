import { useCallback, useEffect, useState } from 'react';
import { BadgePercent, X } from 'lucide-react';
import { apiClient, contractApi } from '../../api/contractApi';
import type { CommissionInvoiceResponse } from '../../types/api';
import type { StepProps } from '../../types/wizard';
import { StepErrorBanner } from '../StepErrorBanner';
import { ensureMappedError } from '../../../../lib/errorMapper';
import { WfInput } from '../wizardFigma/Primitives';
import '../wizardFigma/wizardFigma.css';

interface WalletSummary {
  id?: string;
  credit?: number;
  status?: string;
}

function toToman(rial: number): string {
  if (!rial || isNaN(rial)) return '۰';
  return (rial / 10).toLocaleString('fa-IR');
}

function formatPaidAt(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('fa-IR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

/** اگر API مبلغ پایه/مالیات ندهد، برای نمایش شبیه فیگما فرض ۱۰٪ مالیات روی جمع */
function splitCommissionForDisplay(inv: CommissionInvoiceResponse): {
  baseRial: number;
  vatRial: number;
  totalRial: number;
} {
  const total = inv.total_amount;
  if (inv.commission != null && inv.tax != null) {
    return { baseRial: inv.commission, vatRial: inv.tax, totalRial: total };
  }
  if (inv.commission_base_rial != null && inv.vat_amount_rial != null) {
    return { baseRial: inv.commission_base_rial, vatRial: inv.vat_amount_rial, totalRial: total };
  }
  const base = Math.round(total / 1.1);
  const vat = total - base;
  return { baseRial: base, vatRial: vat, totalRial: total };
}

export function CommissionStep({ contractId, onCommissionContinue }: StepProps) {
  const [invoice, setInvoice] = useState<CommissionInvoiceResponse | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [useWallet, setUseWallet] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [discountSheetOpen, setDiscountSheetOpen] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchInvoice = useCallback(
    async (discountCode: string | null) => {
      const q =
        discountCode?.trim() !== '' && discountCode != null
          ? `?discount_code=${encodeURIComponent(discountCode.trim())}`
          : '';
      const res = await apiClient.get<CommissionInvoiceResponse>(`/contracts/${contractId}/commission/invoice${q}`);
      setInvoice(res.data);
    },
    [contractId],
  );

  const fetchWallet = useCallback(async () => {
    try {
      const res = await apiClient.get<WalletSummary>('/financials/wallets');
      setWallet(res.data);
    } catch {
      setWallet(null);
    }
  }, []);

  useEffect(() => {
    setAppliedCode(null);
    setIsLoading(true);
    setError(null);
    setErrorDetails([]);
    setErrorHint(null);
    fetchInvoice(null)
      .catch((err: unknown) => {
        const m = ensureMappedError(err);
        setError(m.message);
        setErrorDetails(m.detailLines ?? []);
        setErrorHint(m.hint ?? null);
      })
      .finally(() => setIsLoading(false));
  }, [contractId, fetchInvoice]);

  useEffect(() => {
    void fetchWallet();
  }, [fetchWallet]);

  useEffect(() => {
    function onPageShow() {
      if (!contractId) return;
      void fetchInvoice(appliedCode).catch(() => {});
      void fetchWallet();
    }
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [contractId, appliedCode, fetchInvoice, fetchWallet]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  async function handlePayment() {
    setPaying(true);
    setError(null);
    setErrorDetails([]);
    setErrorHint(null);
    try {
      const credit = wallet?.credit ?? 0;
      const applyWallet = useWallet && credit > 0;
      const res = await contractApi.payCommission(contractId, {
        use_wallet_credit: applyWallet,
        use_all_wallet_credits: applyWallet,
        wallet_credits: applyWallet ? credit : undefined,
        discount_code: appliedCode?.trim() ? appliedCode.trim() : undefined,
      });
      const d = res.data;
      if (d.already_paid) {
        await fetchInvoice(appliedCode);
        await onCommissionContinue?.();
        return;
      }
      if (d.used_wallet) {
        await fetchInvoice(appliedCode);
        await fetchWallet();
        await onCommissionContinue?.();
        return;
      }
      const url =
        d.redirect_url ?? `/financials/bank/gateway?contract_id=${encodeURIComponent(contractId)}`;
      window.location.href = url;
    } catch (err: unknown) {
      const m = ensureMappedError(err);
      setError(m.message);
      setErrorDetails(m.detailLines ?? []);
      setErrorHint(m.hint ?? null);
    } finally {
      setPaying(false);
    }
  }

  async function applyDiscountFromSheet() {
    const code = discountInput.trim();
    if (!code) {
      setToast('کد را وارد کنید');
      return;
    }
    setError(null);
    setErrorDetails([]);
    setErrorHint(null);
    try {
      await fetchInvoice(code);
      setAppliedCode(code);
      setDiscountSheetOpen(false);
      setDiscountInput('');
      setToast('کد تخفیف اعمال شد');
    } catch {
      setToast('کد تخفیف نامعتبر است');
    }
  }

  function clearDiscount() {
    setAppliedCode(null);
    void fetchInvoice(null).catch(() => {});
  }

  if (isLoading) {
    return (
      <div dir="rtl" className="wizard-figma flex justify-center py-10">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--amline-accent)] border-t-transparent" />
      </div>
    );
  }

  const creditRial = wallet?.credit ?? 0;
  const isPaid = Boolean(invoice?.commission_paid);
  const split = invoice ? splitCommissionForDisplay(invoice) : null;
  const discountRial = invoice?.discount_amount ?? 0;
  const payableRial = invoice ? Math.max(0, invoice.total_amount) : 0;

  const canPayFromWallet = useWallet && creditRial >= payableRial && payableRial > 0;
  const primaryPayLabel = paying
    ? 'در حال پردازش…'
    : canPayFromWallet
      ? 'پرداخت از کیف پول'
      : 'مشاهده پیش‌فاکتور و پرداخت';

  return (
    <div dir="rtl" className="wizard-figma relative min-h-[60vh] pb-24" style={{ backgroundColor: 'var(--wf-page-tint)' }}>
      <div className="flex flex-col shadow-sm">
        <div className="flex min-h-14 flex-col items-center justify-center gap-1 border-b-2 border-[var(--wf-border)] bg-[var(--wf-surface)] px-4 py-3">
          <span
            className="rounded-lg px-3 py-0.5 text-center text-xs font-medium text-[var(--wf-title)]"
            style={{ background: 'var(--wf-tag-commission-bg)' }}
          >
            پیش‌فاکتور
          </span>
          <h2 className="wf-subtitle-m text-center font-medium text-[var(--wf-title)]">پرداخت کمیسیون</h2>
        </div>
      </div>

      <StepErrorBanner
        message={error}
        details={errorDetails}
        hint={errorHint}
        onDismiss={() => {
          setError(null);
          setErrorDetails([]);
          setErrorHint(null);
        }}
      />

      {toast ? (
        <div
          className="fixed left-1/2 top-20 z-[60] mx-auto w-[min(100%,327px)] -translate-x-1/2 rounded-xl border border-[var(--wf-border)] bg-[var(--wf-surface)] px-4 py-3 text-center text-sm text-[var(--wf-title)] shadow-lg"
          role="status"
        >
          {toast}
        </div>
      ) : null}

      {invoice && split && (
        <div className="mx-auto mt-6 flex w-full max-w-[375px] flex-col gap-4">
          {isPaid && (
            <div
              className="rounded-[var(--wf-card-radius)] border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
              role="status"
            >
              <p className="font-bold">کمیسیون این قرارداد ثبت و پرداخت شده است.</p>
              {invoice.commission_paid_at ? (
                <p className="mt-1 text-sm opacity-90">زمان ثبت: {formatPaidAt(invoice.commission_paid_at)}</p>
              ) : null}
              {onCommissionContinue ? (
                <button
                  type="button"
                  onClick={() => void onCommissionContinue()}
                  className="mt-4 h-10 w-full rounded-[10px] bg-[var(--amline-accent)] text-sm font-bold text-white"
                >
                  ادامهٔ ویزارد
                </button>
              ) : null}
            </div>
          )}

          {!isPaid && (
            <>
              <div
                className="flex items-center justify-end gap-2 text-xs font-medium"
                style={{ color: 'var(--wf-status-wait-pay)' }}
                role="status"
              >
                <span>در انتظار پرداخت</span>
                <span className="inline-block size-2 rounded-full border-2 border-dashed border-current" aria-hidden />
              </div>
              <div
                className="overflow-hidden rounded-[12px] border border-[var(--wf-border)] bg-[var(--wf-surface)] shadow-[0_0_4px_2px_rgba(0,0,0,0.06)]"
              >
                <div className="flex items-center justify-between border-b-2 border-[var(--wf-border)] p-4">
                  {appliedCode ? (
                    <button
                      type="button"
                      onClick={clearDiscount}
                      className="flex h-8 min-w-8 items-center justify-center rounded-lg text-[var(--amline-accent)] hover:bg-[var(--wf-light-surface)]"
                      aria-label="حذف کد تخفیف"
                    >
                      <X className="size-5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDiscountSheetOpen(true)}
                      className="h-8 min-w-[47px] rounded-lg border border-[var(--amline-accent)] px-2 text-xs font-bold text-[var(--amline-accent)]"
                    >
                      ثبت کد
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      {appliedCode ? (
                        <p className="text-sm font-medium text-[var(--wf-title)]">کد تخفیف {appliedCode}</p>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-[var(--wf-title)]">کد تخفیف دارید؟</p>
                          <p className="text-xs text-[#6e6d7a]">کد تخفیف خود را وارد کنید</p>
                        </>
                      )}
                    </div>
                    <BadgePercent className="size-6 shrink-0 text-[var(--wf-title)]" strokeWidth={1.5} />
                  </div>
                </div>

                <div className="flex flex-col gap-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-end gap-1">
                      <span className="text-sm text-[var(--wf-title)]">{toToman(split.baseRial)}</span>
                      <span className="text-xs text-[var(--wf-caption)]">تومان</span>
                    </div>
                    <span className="text-sm text-[var(--wf-title)]">محاسبه کمیسیون</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-end gap-1">
                      <span className="text-sm text-[var(--wf-title)]">{toToman(split.vatRial)}</span>
                      <span className="text-xs text-[var(--wf-caption)]">تومان</span>
                    </div>
                    <span className="text-sm text-[var(--wf-title)]">
                      ٪{invoice.vat_percent ?? 10} مالیات بر ارزش افزوده
                    </span>
                  </div>
                  {(invoice.tracking_code_fee ?? 0) > 0 ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-end gap-1">
                        <span className="text-sm text-[var(--wf-title)]">{toToman(invoice.tracking_code_fee!)}</span>
                        <span className="text-xs text-[var(--wf-caption)]">تومان</span>
                      </div>
                      <span className="text-sm text-[var(--wf-title)]">هزینه ارسال قرارداد</span>
                    </div>
                  ) : null}
                  {discountRial > 0 ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-end gap-1">
                        <span className="text-sm text-[var(--wf-title)]">{toToman(discountRial)}</span>
                        <span className="text-xs text-[var(--wf-caption)]">تومان</span>
                      </div>
                      <span className="text-sm text-[var(--wf-title)]">تخفیف</span>
                    </div>
                  ) : null}
                  <div className="h-px w-full bg-[var(--wf-border)]" />
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-end gap-1">
                      <span className="text-sm font-medium text-[var(--wf-title)]">{toToman(payableRial)}</span>
                      <span className="text-xs text-[var(--wf-caption)]">تومان</span>
                    </div>
                    <span className="text-sm font-medium text-[var(--wf-title)]">مبلغ قابل پرداخت:</span>
                  </div>
                </div>
                <p className="px-4 pb-3 text-center text-[11px] leading-relaxed text-[var(--wf-caption)]">
                  در پنجرهٔ پیش‌فاکتور می‌توانید کد تخفیف را اعمال کنید؛ سپس از کیف پول یا درگاه بانکی پرداخت را انجام دهید.
                </p>
              </div>

              {creditRial > 0 && (
                <label className="flex cursor-pointer items-start gap-3 rounded-[var(--wf-field-radius)] border border-[var(--wf-border)] bg-[var(--wf-surface)] p-3">
                  <input
                    type="checkbox"
                    checked={useWallet}
                    onChange={(e) => setUseWallet(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm text-[var(--wf-paragraph-2)]">
                    استفاده از موجودی کیف پول در این پرداخت
                    <span className="mr-1 block text-xs text-[var(--wf-caption)]">
                      موجودی: {toToman(creditRial)} تومان
                    </span>
                  </span>
                </label>
              )}
            </>
          )}
        </div>
      )}

      {!isPaid && invoice && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--wf-border)] bg-[var(--wf-surface)] px-6 py-3">
          <div className="mx-auto max-w-[375px]">
            <button
              type="button"
              onClick={() => void handlePayment()}
              disabled={paying}
              className="flex h-12 w-full items-center justify-center rounded-[12px] bg-[var(--wf-primary-teal)] text-sm font-bold text-white disabled:opacity-50"
            >
              {primaryPayLabel}
            </button>
          </div>
        </div>
      )}

      {discountSheetOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" role="presentation">
          <button
            type="button"
            className="min-h-0 flex-1 cursor-default border-0 bg-transparent p-0"
            aria-label="بستن"
            onClick={() => setDiscountSheetOpen(false)}
          />
          <div
            className="rounded-t-2xl bg-[var(--wf-surface)] shadow-[0_-4px_24px_rgba(0,0,0,0.12)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="commission-discount-title"
          >
            <div className="px-6 pb-3 pt-2">
              <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-[var(--wf-border)]" />
              <div className="mb-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDiscountSheetOpen(false)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-[var(--wf-light-surface)]"
                  aria-label="بستن"
                >
                  <X className="size-6" />
                </button>
                <h3 id="commission-discount-title" className="flex-1 text-right text-sm font-medium text-[var(--wf-title)]">
                  ثبت کد تخفیف
                </h3>
              </div>
              <WfInput
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder="کد را وارد کنید"
                className="mb-4"
                dir="ltr"
              />
            </div>
            <div className="border-t border-[var(--wf-border)] px-6 py-3">
              <button
                type="button"
                onClick={applyDiscountFromSheet}
                className="h-11 w-full rounded-[10px] bg-[var(--amline-accent)] text-sm font-bold text-white"
              >
                تأیید
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
