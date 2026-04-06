import { mapAxiosLikeError } from './errorMapper';
import { CookieNames, getCookie } from './cookies';

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Authorization')) {
    const t = getCookie(CookieNames.ACCESS_TOKEN);
    if (t) {
      headers.set('Authorization', t.startsWith('Bearer ') ? t : `Bearer ${t}`);
    }
  }
  const res = await fetch(input, {
    ...init,
    headers,
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
