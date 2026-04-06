import { mapAxiosLikeError } from './errorMapper';

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    credentials: init?.credentials ?? 'include',
  });
  let data: unknown = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) {
    throw mapAxiosLikeError({ response: { status: res.status, data } });
  }
  return data as T;
}
