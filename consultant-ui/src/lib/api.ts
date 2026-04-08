import axios from 'axios';

const CONSULTANT_TOKEN_KEY = 'amline_consultant_access_token';

export function getConsultantToken(): string | null {
  try {
    return localStorage.getItem(CONSULTANT_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setConsultantToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(CONSULTANT_TOKEN_KEY, token);
    else localStorage.removeItem(CONSULTANT_TOKEN_KEY);
  } catch {
    /* ignore storage errors */
  }
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = getConsultantToken();
  if (token) {
    const normalized = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    config.headers.Authorization = normalized;
  }
  return config;
});
