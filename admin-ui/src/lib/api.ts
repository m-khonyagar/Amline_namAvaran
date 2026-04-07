import axios from 'axios';
import { mapAxiosLikeError } from './errorMapper';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = document.cookie
    .split('; ')
    .find((r) => r.startsWith('access_token='))
    ?.split('=')[1];
  if (token) {
    const normalized = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    config.headers['Authorization'] = normalized;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(mapAxiosLikeError(err))
);
