import { useEffect, useRef } from 'react';
import { contractApi } from '../api/contractApi';
import type { ContractStatus } from '../types/wizard';

const TERMINAL_STATUSES: ContractStatus[] = [
  'FINISH' as unknown as ContractStatus,
  'REVOKED',
  'COMPLETED',
  'PDF_GENERATED',
];

export function useContractStatusPolling(
  contractId: string | null,
  onStatusChange: (status: ContractStatus) => void,
  intervalMs = 30_000
) {
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  useEffect(() => {
    if (!contractId) return;

    let stopped = false;

    const poll = async () => {
      if (stopped) return;
      try {
        const res = await contractApi.getStatus(contractId);
        const status = res.data.status as ContractStatus;
        onStatusChangeRef.current(status);
        if (TERMINAL_STATUSES.includes(status)) {
          stopped = true;
        }
      } catch {
        // silent fail — polling devam eder
      }
    };

    poll();
    const id = setInterval(() => { if (!stopped) poll(); }, intervalMs);

    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [contractId, intervalMs]);
}
