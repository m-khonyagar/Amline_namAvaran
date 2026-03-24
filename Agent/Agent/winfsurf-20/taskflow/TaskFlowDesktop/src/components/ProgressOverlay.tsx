import React from 'react';
import { useLanguageStore } from '../i18n';

interface ProgressOverlayProps {
  visible: boolean;
  currentTask?: string;
  progress: number;
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
  const { language } = useLanguageStore();

  if (!visible) return null;

  const etaStr =
    etaSeconds != null ? (etaSeconds < 60 ? `~${etaSeconds}s` : `~${Math.ceil(etaSeconds / 60)}m`) : '';
  const title = language === 'fa' ? 'در حال اجرا' : 'Execution in progress';
  const stepLabel = language === 'fa' ? 'مرحله' : 'Step';
  const etaLabel = language === 'fa' ? 'زمان تقریبی' : 'ETA';
  const liveLabel = language === 'fa' ? 'جریان زنده' : 'Live workflow';

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)]">
      <div className="surface-card glass-frame p-4 border border-border shadow-[0_18px_38px_hsl(220_34%_2%_/0.3)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-semibold text-foreground">{title}</span>
          </div>
          {etaStr && <span className="text-xs text-muted-foreground">{etaLabel}: {etaStr}</span>}
        </div>

        {currentTask && <p className="text-xs text-muted-foreground truncate mb-3">{currentTask}</p>}

        <div className="surface-elevated rounded-2xl p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{liveLabel}</span>
            <span className="text-[11px] font-semibold text-foreground">{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2.5 mb-2 overflow-hidden">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-300 shadow-[0_0_24px_hsl(var(--primary)/0.3)]"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{stepLabel}</span>
            <span>
              {currentStep}/{totalSteps}
            </span>
          </div>
        </div>

        <div className="w-full bg-secondary/50 rounded-full h-1 overflow-hidden">
          <div
            className="bg-primary/70 h-1 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
