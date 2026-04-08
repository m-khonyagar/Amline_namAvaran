import { useState } from 'react';
import { apiV1 } from '../../../lib/apiPaths';
import { apiClient } from '../api/contractApi';

interface RevokeContractButtonProps {
  contractId: string;
  onRevoked: () => void;
}

export function RevokeContractButton({ contractId, onRevoked }: RevokeContractButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke() {
    setIsLoading(true);
    setError(null);
    try {
      await apiClient.post(apiV1(`contracts/${contractId}/revoke`));
      setShowDialog(false);
      onRevoked();
    } catch {
      setError('خطا در فسخ قرارداد. دوباره تلاش کنید.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowDialog(true)}
        className="text-sm text-red-600 border border-red-300 rounded-lg px-4 py-2 hover:bg-red-50 transition-colors"
      >
        فسخ قرارداد
      </button>

      {showDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="revoke-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDialog(false); }}
        >
          <div dir="rtl" className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 id="revoke-dialog-title" className="text-base font-bold text-gray-800">
              فسخ قرارداد
            </h3>
            <p className="text-sm text-gray-600">
              آیا مطمئن هستید؟ این عمل قابل بازگشت نیست.
            </p>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded p-2">{error}</p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDialog(false)}
                disabled={isLoading}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={isLoading}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? 'در حال فسخ...' : 'بله، فسخ شود'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
