/**
 * Live progress overlay - shows task progress and ETA
 * Uses open-source pattern: minimal, no external deps
 */

import React from 'react';

interface ProgressOverlayProps {
  visible: boolean;
  currentTask?: string;
  progress: number; // 0-100
  currentStep?: number;
  totalSteps?: number;
  etaSeconds?: number;
}

export function ProgressOverlay({
  visible,
  currentTask = '',
  progress = 0,
  currentStep = 0,
  totalSteps = 1,
  etaSeconds,
}: ProgressOverlayProps) {
  if (!visible) return null;

  const etaStr = etaSeconds != null
    ? etaSeconds < 60
      ? `~${etaSeconds}s`
      : `~${Math.ceil(etaSeconds / 60)}m`
    : '';

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="card p-4 shadow-lg border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">در حال اجرا</span>
          {etaStr && (
            <span className="text-xs text-muted-foreground">ETA: {etaStr}</span>
          )}
        </div>
        {currentTask && (
          <p className="text-xs text-muted-foreground truncate mb-2">{currentTask}</p>
        )}
        <div className="w-full bg-secondary rounded-full h-2 mb-1">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{progress.toFixed(0)}%</span>
          {totalSteps > 0 && (
            <span>مرحله {currentStep}/{totalSteps}</span>
          )}
        </div>
      </div>
    </div>
  );
}
