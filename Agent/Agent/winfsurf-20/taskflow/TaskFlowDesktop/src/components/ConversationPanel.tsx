import React from 'react';
import { CommandCenter } from './CommandCenter';
import { ActivityTimeline } from './ActivityTimeline';
import { useTranslation } from '../i18n';

interface ConversationPanelProps {
  children: React.ReactNode;
  showCommandCenter?: boolean;
  showTimeline?: boolean;
  agentStatus?: 'running' | 'completed' | 'waiting' | 'error' | 'paused' | 'idle';
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  onApprove?: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function ConversationPanel({
  children,
  showCommandCenter = true,
  showTimeline = false,
  agentStatus = 'idle',
  onStart,
  onPause,
  onResume,
  onStop,
  onApprove,
  onEdit,
  onCancel,
  className = '',
}: ConversationPanelProps) {
  const { t } = useTranslation();
  const statusTone =
    agentStatus === 'running'
      ? 'text-primary bg-primary/10 border-primary/20'
      : agentStatus === 'completed'
      ? 'text-success bg-success/10 border-success/20'
      : agentStatus === 'waiting'
      ? 'text-warning bg-warning/10 border-warning/20'
      : agentStatus === 'error'
      ? 'text-destructive bg-destructive/10 border-destructive/20'
      : agentStatus === 'paused'
      ? 'text-paused bg-paused/10 border-paused/20'
      : 'text-muted-foreground bg-secondary/40 border-border';

  return (
    <div className={`flex flex-col flex-1 min-w-0 overflow-hidden ${className}`}>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {children}
      </div>
      {(showCommandCenter || showTimeline) && (
        <div className="border-t soft-divider p-3.5 grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
          {showCommandCenter && (
            <div className="surface-card p-3.5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2.5">{t('commandCenter')}</p>
              <CommandCenter
                status={agentStatus}
                onStart={onStart}
                onPause={onPause}
                onResume={onResume}
                onStop={onStop}
                onApprove={onApprove}
                onEdit={onEdit}
                onCancel={onCancel}
              />
            </div>
          )}
          {showTimeline && (
            <div className="surface-card p-3.5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2.5">{t('activityTimeline')}</p>
              <ActivityTimeline />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
