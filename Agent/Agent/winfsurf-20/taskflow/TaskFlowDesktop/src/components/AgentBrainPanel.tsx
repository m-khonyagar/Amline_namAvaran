import React from 'react';

interface AgentBrainPanelProps {
  goal?: string;
  steps?: string[];
  currentStep?: number;
  totalSteps?: number;
  status?: 'running' | 'completed' | 'waiting' | 'error' | 'paused' | 'idle';
  recentActions?: string[];
  className?: string;
}

const statusConfig = {
  running: { label: 'Running', color: 'status-running', bg: 'bg-primary/10' },
  completed: { label: 'Completed', color: 'status-completed', bg: 'bg-success/10' },
  waiting: { label: 'Waiting', color: 'status-waiting', bg: 'bg-warning/10' },
  error: { label: 'Error', color: 'status-error', bg: 'bg-destructive/10' },
  paused: { label: 'Paused', color: 'status-paused', bg: 'bg-[hsl(var(--paused))]/10' },
  idle: { label: 'Idle', color: 'text-muted-foreground', bg: 'bg-muted/10' },
};

export function AgentBrainPanel({
  goal = 'No active goal',
  steps = [],
  currentStep = 0,
  totalSteps = 0,
  status = 'idle',
  recentActions = [],
  className = '',
}: AgentBrainPanelProps) {
  const config = statusConfig[status] || statusConfig.idle;
  const progressPercent = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;

  return (
    <div className={`surface-panel flex flex-col overflow-hidden ${className}`} style={{ minWidth: 320 }}>
      <div className="px-4 py-4 border-b soft-divider">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-[16px] font-semibold text-foreground">Agent Brain</h3>
            <p className="text-[12px] text-muted-foreground mt-1">Live orchestration panel</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium ${config.bg} ${config.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status === 'running' ? 'bg-primary animate-pulse' : status === 'completed' ? 'bg-success' : status === 'error' ? 'bg-destructive' : status === 'waiting' ? 'bg-warning' : status === 'paused' ? 'bg-paused' : 'bg-muted-foreground'}`} />
            {config.label}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto shell-scroll p-4 space-y-4">
        <section className="surface-card p-4">
          <p className="text-[12px] text-muted-foreground mb-2">Goal</p>
          <p className="text-[13px] leading-6 text-foreground">{goal}</p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="surface-elevated p-4">
            <p className="text-[12px] text-muted-foreground">Execution status</p>
            <p className="mt-2 text-[16px] font-semibold text-foreground">{config.label}</p>
          </div>
          <div className="surface-elevated p-4">
            <p className="text-[12px] text-muted-foreground">Current step</p>
            <p className="mt-2 text-[16px] font-semibold text-foreground">{totalSteps > 0 ? `${currentStep}/${totalSteps}` : '0/0'}</p>
          </div>
        </section>

        <section className="surface-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] text-muted-foreground">Progress</p>
            <p className="text-[12px] text-foreground">{progressPercent}%</p>
          </div>
          <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
        </section>

        <section className="surface-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] text-muted-foreground">Steps list</p>
            <p className="text-[12px] text-muted-foreground">{steps.length} total</p>
          </div>
          {steps.length > 0 ? (
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 text-[13px] ${
                    i + 1 === currentStep ? 'text-primary font-medium' : i < currentStep ? 'text-success' : 'text-muted-foreground'
                  }`}
                >
                  {i < currentStep ? (
                    <span className="text-success">✓</span>
                  ) : i + 1 === currentStep ? (
                    <span className="w-4 h-4 rounded-full border-2 border-primary animate-pulse shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-border" />
                  )}
                  <span className="leading-5">{step}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground">No steps defined</p>
          )}
        </section>

        <section className="surface-card p-4">
          <p className="text-[12px] text-muted-foreground mb-3">Recent actions</p>
          <div className="space-y-2">
            {(recentActions.length > 0 ? recentActions : ['Waiting for next orchestration event']).slice(0, 5).map((action, index) => (
              <div key={`${action}-${index}`} className="flex items-start gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-2.5">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[12px] leading-5 text-foreground">{action}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
