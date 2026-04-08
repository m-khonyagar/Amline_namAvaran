import { CookieNames, removeCookie } from '../lib/cookies';

type SessionHandler = () => void;

const handlers = new Set<SessionHandler>();

export function clearAuthCookies(): void {
  removeCookie(CookieNames.ACCESS_TOKEN);
  removeCookie(CookieNames.REFRESH_TOKEN);
  removeCookie(CookieNames.USER);
}

export function notifySessionExpired(): void {
  for (const h of handlers) {
    try {
      h();
    } catch {
      /* ignore */
    }
  }
}

export function registerSessionExpiredHandler(cb: SessionHandler): () => void {
  handlers.add(cb);
  return () => {
    handlers.delete(cb);
  };
}
