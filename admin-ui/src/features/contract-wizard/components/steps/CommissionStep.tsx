import { useEffect, useState } from 'react';
import { apiClient } from '../../api/contractApi';
import type { StepProps } from '../../types/wizard';
import { StepErrorBanner } from '../StepErrorBanner';

interface CommissionInvoice {
  total_amount: number;
  landlord_share: number;
  tenant_share: number;
  invoice_id: string;
}

function toToman(rial: number): string {
  if (!rial || isNaN(rial)) return '۰';
  return (rial / 10).toLocaleString('fa-IR');
}

export function CommissionStep({ contractId }: StepProps) {
  const [invoice, setInvoice] = useState<CommissionInvoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    apiClient
      .get<CommissionInvoice>(`/contracts/${contractId}/commission/invoice`)
      .then((res) => setInvoice(res.data))
      .catch(() => setError('خطا در دریافت اطلاعات کمیسیون'))
      .finally(() => setIsLoading(false));
  }, [contractId]);

  function handlePayment() {
    window.location.href = '/financials/bank/gateway';
  }

  if (isLoading) {
    return (
      <div dir="rtl" className="flex justify-center py-10">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6">
      <h2 className="text-lg font-bold text-gray-800">کمیسیون</h2>
      <StepErrorBanner message={error} onDismiss={() => setError(null)} />

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

          <button
            type="button"
            onClick={handlePayment}
            className="w-full bg-primary text-white rounded-lg py-2.5 font-medium"
          >
            پرداخت کمیسیون
          </button>
        </div>
      )}
    </div>
  );
}
