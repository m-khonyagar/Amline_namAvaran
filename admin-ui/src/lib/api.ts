import axios from 'axios';
import { mapAxiosLikeError } from './errorMapper';
import { CookieNames, getCookie } from './cookies';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const tokenRaw = document.cookie
    .split('; ')
    .find((r) => r.startsWith('access_token='))
    ?.split('=')
    .slice(1)
    .join('=');
  let token = tokenRaw;
  if (tokenRaw) {
    try {
      token = decodeURIComponent(tokenRaw);
    } catch {
      token = tokenRaw;
    }
  }
  if (token) {
    const normalized = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    config.headers['Authorization'] = normalized;
  }
  const devPerms = import.meta.env.VITE_DEV_USER_PERMISSIONS;
  if (import.meta.env.DEV && devPerms) {
    config.headers['X-User-Permissions'] = String(devPerms);
  }
  const devUid = import.meta.env.VITE_DEV_USER_ID;
  if (import.meta.env.DEV && devUid) {
    config.headers['X-User-Id'] = String(devUid);
  } else {
    try {
      const rawUser = getCookie(CookieNames.USER);
      if (rawUser) {
        const user = JSON.parse(rawUser) as { id?: string };
        if (user?.id) config.headers['X-User-Id'] = user.id;
      }
    } catch {
      /* ignore */
    }
  }
  try {
    const agencyId = localStorage.getItem('amline_x_agency_id');
    if (agencyId && agencyId.trim()) {
      config.headers['X-Agency-Id'] = agencyId.trim();
    }
  } catch {
    /* ignore storage errors */
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(mapAxiosLikeError(err))
);
