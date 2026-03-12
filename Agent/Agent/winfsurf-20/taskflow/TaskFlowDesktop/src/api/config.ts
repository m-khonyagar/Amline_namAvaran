/**
 * API configuration - uses Vite env variables
 */
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8060';

export function getWsUrl(path: string): string {
  const base = API_BASE.replace('http://', 'ws://').replace('https://', 'wss://');
  return `${base}${path}`;
}
