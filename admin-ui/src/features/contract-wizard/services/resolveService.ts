import { contractApi } from '../api/contractApi';
import type { ResolveInfoResponse } from '../types/api';

type ResolveType = 'BANK_IBAN' | 'BANK_CARD' | 'POSTAL_CODE' | 'ORGANIZATION_CODE';

const resolveCache = new Map<string, ResolveInfoResponse>();

/**
 * ResolveService با debounce 800ms و in-memory cache.
 * Property 9: N ورودی در کمتر از 800ms → فقط ۱ درخواست API
 */
export function createResolveService() {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return function resolve(
    type: ResolveType,
    text: string,
    onResult: (res: ResolveInfoResponse | null, error?: string) => void
  ): void {
    if (timer) clearTimeout(timer);

    const cacheKey = `${type}:${text}`;
    if (resolveCache.has(cacheKey)) {
      onResult(resolveCache.get(cacheKey)!);
      return;
    }

    timer = setTimeout(async () => {
      try {
        const res = await contractApi.resolveInfo(type, text);
        resolveCache.set(cacheKey, res.data);
        onResult(res.data);
      } catch {
        onResult(null, 'اطلاعات تأیید نشد');
      }
    }, 800);
  };
}

export const resolveService = createResolveService();
