/**
 * Shared Axios instance for admin-ui API calls.
 *
 * - Reads the access token from cookies and attaches it as Bearer.
 * - Maps errors through mapAxiosLikeError for consistent error handling.
 */
import axios from 'axios';
import { mapAxiosLikeError } from './errorMapper';

function resolveBaseUrl(): string {
  // Vite env (admin-ui uses Vite)
  const viteUrl = (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL;
  if (viteUrl) return viteUrl;
  return '';
}

export const apiClient = axios.create({
  baseURL: resolveBaseUrl(),
  withCredentials: true,
});

// ── Request interceptor: attach Bearer token from cookie ──────────────────
apiClient.interceptors.request.use((config) => {
  const token = document.cookie
    .split('; ')
    .find((r) => r.startsWith('access_token='))
    ?.split('=')[1];
  if (token) {
    config.headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: normalise errors ────────────────────────────────
apiClient.interceptors.response.use(
  (res) => res,
  (err: unknown) => Promise.reject(mapAxiosLikeError(err))
);
