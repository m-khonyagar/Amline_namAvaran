/**
 * Real backend API client - connects to TaskFlow Python backend
 * Compatible interface with mockBackend for drop-in replacement
 */

import { API_BASE, getWsUrl } from './config';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}

// Map backend status to UI status
function mapStatus(s: string): string {
  const map: Record<string, string> = {
    queued: 'pending',
    planning: 'pending',
    ready: 'pending',
    running: 'running',
    paused: 'running',
    succeeded: 'completed',
    failed: 'failed',
  };
  return map[s] || s;
}

const realBackend = {
  getTasks: async () => {
    const list = await apiFetch<Array<{ id: string; goal: string; status: string; created_at: string; updated_at: string }>>('/tasks');
    return list.map((t) => ({
      id: t.id,
      goal: t.goal,
      status: mapStatus(t.status),
      agentMode: 'multi_agent',
      language: 'en',
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      currentStep: t.status === 'succeeded' ? 1 : 0,
      totalSteps: 1,
    }));
  },

  getTask: async (taskId: string) => {
    const [taskRes, eventsRes, artifactsRes] = await Promise.all([
      apiFetch<{ id: string; goal: string; status: string; steps: Array<{ id: string; idx: number; title: string; description: string; status: string }> }>(`/tasks/${taskId}`),
      apiFetch<Array<{ ts: string; level: string; message: string; payload_json?: string }>>(`/tasks/${taskId}/events`).catch(() => []),
      apiFetch<Array<{ id: string; path: string; kind: string; created_at: string }>>(`/tasks/${taskId}/artifacts`).catch(() => []),
    ]);

    const steps = taskRes.steps || [];
    const completedSteps = steps.filter((s) => s.status === 'succeeded').length;

    return {
      id: taskRes.id,
      goal: taskRes.goal,
      status: mapStatus(taskRes.status),
      agentMode: 'multi_agent',
      language: 'en',
      createdAt: '',
      updatedAt: '',
      currentStep: completedSteps,
      totalSteps: Math.max(steps.length, 1),
      plan: steps.map((s) => s.title),
      steps: steps.map((s) => ({
        id: s.id,
        title: s.title,
        status: mapStatus(s.status),
        agent: 'Agent',
        startTime: '',
        endTime: '',
        output: s.description,
      })),
      artifacts: artifactsRes.map((a) => ({
        id: a.id,
        name: a.path.split(/[/\\]/).pop() || a.path,
        type: a.kind || 'file',
        path: a.path,
        size: 0,
        createdAt: a.created_at,
      })),
      logs: eventsRes.map((e) => ({
        timestamp: e.ts,
        level: e.level,
        agent: 'System',
        message: e.message,
      })),
    };
  },

  getMemory: async () => {
    try {
      const list = await apiFetch<Array<{
        id: string;
        task_id: string;
        type: string;
        title: string;
        content: string;
        tags: string[];
        createdAt: string;
        relevance: number;
      }>>('/memory/list?limit=50');
      return list.map((m) => ({
        id: m.id,
        type: m.type || 'task_summary',
        title: m.title,
        content: m.content,
        tags: m.tags,
        createdAt: m.createdAt,
        taskId: m.task_id,
        relevance: m.relevance || 0.9,
      }));
    } catch {
      return [];
    }
  },

  getAgents: async () => {
    // Backend doesn't have agents endpoint - return placeholder
    return [
      { name: 'PlannerAgent', status: 'idle', currentTask: 'Available', startTime: null, endTime: null, stepsCompleted: 0, totalSteps: 0 },
      { name: 'CoderAgent', status: 'idle', currentTask: 'Available', startTime: null, endTime: null, stepsCompleted: 0, totalSteps: 0 },
      { name: 'BrowserAgent', status: 'idle', currentTask: 'Available', startTime: null, endTime: null, stepsCompleted: 0, totalSteps: 0 },
      { name: 'ExternalWorkerAgent', status: 'idle', currentTask: 'Available', startTime: null, endTime: null, stepsCompleted: 0, totalSteps: 0 },
    ];
  },

  createTask: async (goal: string, language: string = 'en') => {
    const { id } = await apiFetch<{ id: string }>('/tasks', {
      method: 'POST',
      body: JSON.stringify({ goal }),
    });
    return {
      id,
      goal,
      status: 'pending',
      agentMode: 'single_agent',
      language,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentStep: 0,
      totalSteps: 3,
      plan: ['Initial planning', 'Execution', 'Review'],
      steps: [],
      artifacts: [],
      logs: [{ timestamp: new Date().toISOString(), level: 'info', agent: 'System', message: `Task created: ${goal}` }],
    };
  },

  runTask: async (taskId: string) => {
    await apiFetch(`/tasks/${taskId}/run`, { method: 'POST' });
    return { ok: true };
  },

  pauseTask: async (taskId: string) => {
    await apiFetch(`/tasks/${taskId}/pause`, { method: 'POST' });
    return { ok: true };
  },

  resumeTask: async (taskId: string) => {
    await apiFetch(`/tasks/${taskId}/resume`, { method: 'POST' });
    return { ok: true };
  },

  cancelTask: async (taskId: string) => {
    await apiFetch(`/tasks/${taskId}/cancel`, { method: 'POST' });
    return { ok: true };
  },

  generatePlan: async (taskId: string) => {
    return apiFetch(`/tasks/${taskId}/plan`, { method: 'POST' });
  },

  getArtifacts: async () => {
    try {
      const list = await apiFetch<Array<{ id: string; task_id: string; path: string; kind: string; created_at: string }>>('/artifacts?limit=50');
      return list.map((a) => ({
        id: a.id,
        name: a.path.split(/[/\\]/).pop() || a.path,
        type: a.kind || 'file',
        path: a.path,
        size: 0,
        content: '',
        language: 'text',
        createdAt: a.created_at,
        taskId: a.task_id,
      }));
    } catch {
      return [];
    }
  },
};

// WebSocket for real-time updates
class RealWebSocket {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, (data: any) => void>();
  private taskIds: Set<string> = new Set();

  connect() {
    // Connect when first task is subscribed
    console.log('RealWebSocket: ready (connect per task)');
  }

  subscribeTask(taskId: string) {
    this.taskIds.add(taskId);
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      const url = getWsUrl(`/ws/tasks/${taskId}`);
      this.ws = new WebSocket(url);
      this.ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          const cb = this.listeners.get('message');
          if (cb) cb(msg);
        } catch {}
      };
    }
  }

  on(event: string, callback: (data: any) => void) {
    this.listeners.set(event, callback);
  }

  off(event: string) {
    this.listeners.delete(event);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.taskIds.clear();
  }
}

export const realWebSocket = new RealWebSocket();
export default realBackend;
