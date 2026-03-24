/**
 * Unified API surface for the desktop app.
 * The product now requires the real backend and no longer falls back to mock data.
 */

import realBackend, { realWebSocket } from './realBackend';
import { API_BASE } from './config';

let backendHealthy: boolean | null = null;

async function wait(ms: number) {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForBackend(timeoutMs = 12000, intervalMs = 1000): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        backendHealthy = true;
        return true;
      }
    } catch {
      backendHealthy = false;
    }
    await wait(intervalMs);
  }
  return false;
}

async function requireBackend() {
  const healthy = await waitForBackend();
  if (!healthy) {
    throw new Error(
      `Backend is unavailable. Agent Windsurf waited for the local API at ${API_BASE} but it did not become healthy.`
    );
  }
  return realBackend;
}

export async function checkBackendHealth(): Promise<boolean> {
  if (backendHealthy !== null) return backendHealthy;
  return waitForBackend(2500, 500);
}

export function isUsingRealBackend(): boolean {
  return backendHealthy === true;
}

export function resetBackendCheck() {
  backendHealthy = null;
}

export const backend = {
  getTasks: async () => (await requireBackend()).getTasks(),
  getTask: async (id: string) => (await requireBackend()).getTask(id),
  getMemory: async () => (await requireBackend()).getMemory(),
  getAgents: async () => (await requireBackend()).getAgents(),
  getSettings: async () => (await requireBackend()).getSettings(),
  updateSettings: async (payload: Record<string, unknown>) => (await requireBackend()).updateSettings(payload),
  createTask: async (goal: string, lang?: string) => (await requireBackend()).createTask(goal, lang),
  runTask: async (id: string) => (await requireBackend()).runTask(id),
  pauseTask: async (id: string) => (await requireBackend()).pauseTask(id),
  resumeTask: async (id: string) => (await requireBackend()).resumeTask(id),
  cancelTask: async (id: string) => (await requireBackend()).cancelTask(id),
  getArtifacts: async () => (await requireBackend()).getArtifacts(),
};

export const webSocket = {
  connect: () => {
    void checkBackendHealth().then((healthy) => {
      if (healthy) {
        realWebSocket.connect();
      }
    });
  },
  disconnect: () => {
    realWebSocket.disconnect();
  },
  on: (event: string, cb: (data: any) => void) => {
    realWebSocket.on(event, cb);
  },
  off: (event: string) => {
    realWebSocket.off(event);
  },
};

export async function initBackend() {
  await requireBackend();
}
