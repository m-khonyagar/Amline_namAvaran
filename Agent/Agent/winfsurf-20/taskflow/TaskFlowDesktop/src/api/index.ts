/**
 * Unified API - tries real backend first, falls back to mock when unavailable
 */

import realBackend, { realWebSocket } from './realBackend';
import mockBackend, { mockWebSocket } from './mockBackend';
import { API_BASE } from './config';

let useRealBackend: boolean | null = null;

export async function checkBackendHealth(): Promise<boolean> {
  if (useRealBackend !== null) return useRealBackend;
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
    useRealBackend = res.ok;
  } catch {
    useRealBackend = false;
  }
  return useRealBackend;
}

export function isUsingRealBackend(): boolean {
  return useRealBackend === true;
}

export function resetBackendCheck() {
  useRealBackend = null;
}

async function getBackend() {
  await checkBackendHealth();
  return useRealBackend ? realBackend : mockBackend;
}

export const backend = {
  getTasks: async () => (await getBackend()).getTasks(),
  getTask: async (id: string) => (await getBackend()).getTask(id),
  getMemory: async () => (await getBackend()).getMemory(),
  getAgents: async () => (await getBackend()).getAgents(),
  createTask: async (goal: string, lang?: string) => (await getBackend()).createTask(goal, lang),
  runTask: async (id: string) => {
    const b = await getBackend();
    return (b as any).runTask ? (b as any).runTask(id) : Promise.resolve({ ok: true });
  },
  pauseTask: async (id: string) => {
    const b = await getBackend();
    return (b as any).pauseTask ? (b as any).pauseTask(id) : Promise.resolve({ ok: true });
  },
  resumeTask: async (id: string) => {
    const b = await getBackend();
    return (b as any).resumeTask ? (b as any).resumeTask(id) : Promise.resolve({ ok: true });
  },
  cancelTask: async (id: string) => {
    const b = await getBackend();
    return (b as any).cancelTask ? (b as any).cancelTask(id) : Promise.resolve({ ok: true });
  },
  getArtifacts: async () => {
    const b = await getBackend();
    return (b as any).getArtifacts ? (b as any).getArtifacts() : [];
  },
};

export const webSocket = {
  connect: () => {
    // Connect both - we'll use the one matching backend when data arrives
    realWebSocket.connect();
    mockWebSocket.connect();
  },
  disconnect: () => {
    realWebSocket.disconnect();
    mockWebSocket.disconnect();
  },
  on: (event: string, cb: (data: any) => void) => {
    realWebSocket.on(event, cb);
    mockWebSocket.on(event, cb);
  },
  off: (event: string) => {
    realWebSocket.off(event);
    mockWebSocket.off(event);
  },
};

export async function initBackend() {
  await checkBackendHealth();
}
