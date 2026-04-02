import { useEffect, useState } from 'react';
import { apiClient, contractApi } from '../../api/contractApi';
import type { StepProps } from '../../types/wizard';
import { StepErrorBanner } from '../StepErrorBanner';
import { ensureMappedError } from '../../../../lib/errorMapper';

interface CommissionInvoice {
  total_amount: number;
  landlord_share: number;
  tenant_share: number;
  invoice_id: string;
}

interface WalletSummary {
  id?: string;
  credit?: number;
  status?: string;
}

function toToman(rial: number): string {
  if (!rial || isNaN(rial)) return '۰';
  return (rial / 10).toLocaleString('fa-IR');
}

export function CommissionStep({ contractId }: StepProps) {
  const [invoice, setInvoice] = useState<CommissionInvoice | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [useWallet, setUseWallet] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [errorHint, setErrorHint] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    apiClient
      .get<CommissionInvoice>(`/contracts/${contractId}/commission/invoice`)
      .then((res) => setInvoice(res.data))
      .catch((err: unknown) => {
        const m = ensureMappedError(err);
        setError(m.message);
        setErrorDetails(m.detailLines);
        setErrorHint(m.hint ?? null);
      })
      .finally(() => setIsLoading(false));
  }, [contractId]);

  useEffect(() => {
    apiClient
      .get<WalletSummary>('/financials/wallets')
      .then((res) => setWallet(res.data))
      .catch(() => setWallet(null));
  }, []);

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
      const url = res.data.redirect_url ?? '/financials/bank/gateway';
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
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">مبلغ کل کمیسیون</span>
              <span className="font-bold text-gray-800">{toToman(invoice.total_amount)} تومان</span>
            </div>
            <hr className="border-gray-200" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">سهم مالک</span>
              <span className="text-gray-700">{toToman(invoice.landlord_share)} تومان</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">سهم مستاجر</span>
              <span className="text-gray-700">{toToman(invoice.tenant_share)} تومان</span>
            </div>
          </div>

          {creditRial > 0 && (
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

          <button
            type="button"
            onClick={() => void handlePayment()}
            disabled={paying}
            className="w-full bg-primary text-white rounded-lg py-2.5 font-medium disabled:opacity-50"
          >
            {paying ? 'در حال انتقال…' : 'ادامهٔ پرداخت کمیسیون'}
          </button>
        </div>
      )}
    </div>
  );
}
