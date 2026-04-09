import axios from 'axios';
import { generateRequestId } from '@amline/ui-core';

const CONSULTANT_TOKEN_KEY = 'amline_consultant_access_token';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  withCredentials: true,
});

export function getConsultantToken(): string | null {
  try {
    return localStorage.getItem(CONSULTANT_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setConsultantToken(token: string | null) {
  try {
    if (!token) {
      localStorage.removeItem(CONSULTANT_TOKEN_KEY);
      return;
    }
    localStorage.setItem(CONSULTANT_TOKEN_KEY, token);
  } catch {
    // Storage can fail in privacy-restricted contexts.
  }
}

apiClient.interceptors.request.use((config) => {
  const hdr = config.headers;
  if (hdr) {
    const hasId =
      typeof hdr.get === 'function'
        ? hdr.get('X-Request-Id')
        : (hdr as Record<string, unknown>)['X-Request-Id'];
    if (!hasId && typeof hdr.set === 'function') {
      hdr.set('X-Request-Id', generateRequestId());
    }
  }
  const token = getConsultantToken();
  if (token) {
    config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (status === 401) {
      setConsultantToken(null);
    }
    return Promise.reject(error);
  }
);
