import { useCallback, useState } from 'react';
import { ensureMappedError, type MappedApiError } from '@amline/ui-core'

export function useMappedStepError() {
  const [mapped, setMapped] = useState<MappedApiError | null>(null);

  const setFromError = useCallback((err: unknown) => {
    setMapped(ensureMappedError(err));
  }, []);

  const clear = useCallback(() => setMapped(null), []);

  return {
    error: mapped?.message ?? null,
    details: mapped?.detailLines ?? [],
    hint: mapped?.hint ?? null,
    errorKind: mapped?.type,
    setFromError,
    clear,
  };
}
