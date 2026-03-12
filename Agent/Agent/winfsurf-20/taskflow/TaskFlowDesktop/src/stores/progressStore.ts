/**
 * Progress store - for live progress display across components
 * Uses Zustand (already in project)
 */

import { create } from 'zustand';

interface ProgressState {
  visible: boolean;
  currentTask: string;
  progress: number;
  currentStep: number;
  totalSteps: number;
  etaSeconds: number | null;
  status: string;
  setProgress: (p: Partial<{
    visible: boolean;
    currentTask: string;
    progress: number;
    currentStep: number;
    totalSteps: number;
    etaSeconds: number | null;
    status: string;
  }>) => void;
  show: (task: string, step: number, total: number) => void;
  hide: () => void;
}

export const useProgressStore = create<ProgressState>((set) => ({
  visible: false,
  currentTask: '',
  progress: 0,
  currentStep: 0,
  totalSteps: 1,
  etaSeconds: null,
  status: 'running',
  setProgress: (p) => set((s) => ({ ...s, ...p })),
  show: (task, step, total) => set({
    visible: true,
    currentTask: task,
    currentStep: step,
    totalSteps: total,
    progress: total > 0 ? (step / total) * 100 : 0,
    etaSeconds: null,
    status: 'running',
  }),
  hide: () => set({ visible: false }),
}));
