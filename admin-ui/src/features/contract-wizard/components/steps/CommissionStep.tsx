import { useCallback, useEffect, useState } from 'react';
import { apiClient, contractApi } from '../../api/contractApi';
import type { CommissionInvoiceResponse } from '../../types/api';
import type { StepProps } from '../../types/wizard';
import { StepErrorBanner } from '../StepErrorBanner';
import { ensureMappedError } from '../../../../lib/errorMapper';

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

export function CommissionStep({ contractId, onCommissionContinue }: StepProps) {
  const [invoice, setInvoice] = useState<CommissionInvoiceResponse | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [useWallet, setUseWallet] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [errorHint, setErrorHint] = useState<string | null>(null);

  const fetchInvoice = useCallback(async () => {
    const res = await apiClient.get<CommissionInvoiceResponse>(`/contracts/${contractId}/commission/invoice`);
    setInvoice(res.data);
  }, [contractId]);

  const fetchWallet = useCallback(async () => {
    try {
      const res = await apiClient.get<WalletSummary>('/financials/wallets');
      setWallet(res.data);
    } catch {
      setWallet(null);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setErrorDetails([]);
    setErrorHint(null);
    fetchInvoice()
      .catch((err: unknown) => {
        const m = ensureMappedError(err);
        setError(m.message);
        setErrorDetails(m.detailLines);
        setErrorHint(m.hint ?? null);
      })
      .finally(() => setIsLoading(false));
  }, [contractId, fetchInvoice]);

  useEffect(() => {
    void fetchWallet();
  }, [fetchWallet]);

  /** بعد از برگشت از درگاه آزمایشی (history.back) فاکتور را دوباره بخوان */
  useEffect(() => {
    function onPageShow() {
      if (!contractId) return;
      void fetchInvoice().catch(() => {});
      void fetchWallet();
    }
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [contractId, fetchInvoice, fetchWallet]);

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
      });
      const d = res.data;
      if (d.already_paid) {
        await fetchInvoice();
        await onCommissionContinue?.();
        return;
      }
      if (d.used_wallet) {
        await fetchInvoice();
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
      setErrorDetails(m.detailLines);
      setErrorHint(m.hint ?? null);
    } finally {
      setPaying(false);
    }
  }

  if (isLoading) {
    return (
      <div dir="rtl" className="flex justify-center py-10">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const creditRial = wallet?.credit ?? 0;
  const isPaid = Boolean(invoice?.commission_paid);

  return (
    <div dir="rtl" className="space-y-6">
      <h2 className="text-lg font-bold text-gray-800">کمیسیون</h2>
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

      {invoice && (
        <div className="space-y-4">
          {isPaid && (
            <div
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
              role="status"
            >
              <p className="font-bold">کمیسیون این قرارداد پرداخت شده است.</p>
              {invoice.commission_paid_at ? (
                <p className="mt-1 text-sm opacity-90">
                  زمان ثبت: {formatPaidAt(invoice.commission_paid_at)}
                </p>
              ) : null}
              {onCommissionContinue ? (
                <button
                  type="button"
                  onClick={() => void onCommissionContinue()}
                  className="mt-4 w-full rounded-lg bg-primary py-2.5 font-medium text-white"
                >
                  ادامهٔ ویزارد
                </button>
              ) : null}
            </div>
          )}

          <div className="space-y-3 rounded-xl bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">مبلغ کل کمیسیون</span>
              <span className="font-bold text-gray-800">{toToman(invoice.total_amount)} تومان</span>
            </div>
            <hr className="border-gray-200" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">سهم مالک</span>
              <span className="text-gray-700">{toToman(invoice.landlord_share)} تومان</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">سهم مستاجر</span>
              <span className="text-gray-700">{toToman(invoice.tenant_share)} تومان</span>
            </div>
          </div>

          {!isPaid && creditRial > 0 && (
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-900">
              <input
                type="checkbox"
                checked={useWallet}
                onChange={(e) => setUseWallet(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm text-gray-700 dark:text-slate-200">
                استفاده از موجودی کیف پول در این پرداخت
                <span className="mr-1 block text-xs text-gray-500">
                  موجودی: {toToman(creditRial)} تومان (سمت سرور نحوهٔ تسویه را تعیین می‌کند)
                </span>
              </span>
            </label>
          )}

          {!isPaid && (
            <button
              type="button"
              onClick={() => void handlePayment()}
              disabled={paying}
              className="w-full rounded-lg bg-primary py-2.5 font-medium text-white disabled:opacity-50"
            >
              {paying ? 'در حال پردازش…' : 'ادامهٔ پرداخت کمیسیون'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
