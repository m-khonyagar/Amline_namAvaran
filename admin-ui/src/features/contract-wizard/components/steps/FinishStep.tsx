import { useEffect } from 'react';
import type { StepProps, ContractStatus } from '../../types/wizard';
import { localDraftStorage } from '../../storage/draftStorage';
import { useContractStatusPolling } from '../../hooks/useContractStatusPolling';
import { useWizard } from '../../engine/WizardContext';

export function FinishStep({ contractId }: StepProps) {
  const { state, dispatch } = useWizard();
  const contractStatus = state.contractStatus;

  // حذف draft پس از رسیدن به FINISH
  useEffect(() => {
    if (contractId) localDraftStorage.remove(contractId);
  }, [contractId]);

  useContractStatusPolling(contractId, (status: ContractStatus) => {
    dispatch({ type: 'SET_STATUS', payload: { status } });
  });

  return (
    <div dir="rtl" className="flex flex-col items-center gap-6 py-10 text-center">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-4xl">
        ✓
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">قرارداد با موفقیت ثبت شد</h2>
        <p className="text-sm text-gray-500">
          قرارداد در پنل تمام طرفین قابل مشاهده است.
        </p>
      </div>

      {contractStatus === 'PDF_GENERATED' && (
        <a
          href={`/api/contracts/${contractId}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-primary text-white rounded-lg px-6 py-2.5 font-medium"
        >
          دانلود PDF قرارداد
        </a>
      )}

      {contractStatus === 'PDF_GENERATING_FAILED' && (
        <div className="space-y-2">
          <p className="text-sm text-red-600">خطا در تولید PDF</p>
          <button
            type="button"
            className="text-sm text-primary underline"
            onClick={() => window.location.reload()}
          >
            تلاش مجدد
          </button>
        </div>
      )}

      {!contractStatus && (
        <p className="text-xs text-gray-400 animate-pulse">در حال تولید PDF...</p>
      )}
    </div>
  );
}
