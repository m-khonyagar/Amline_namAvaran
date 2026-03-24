import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { backend, initBackend } from '../api';

export function AgentsView() {
  const { t } = useTranslation();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const runningAgents = agents.filter((agent) => agent.status === 'running').length;
  const assignedAgents = agents.filter((agent) => agent.currentTask).length;

  useEffect(() => {
    const loadAgents = async () => {
      try {
        setErrorMessage('');
        await initBackend();
        const data = await backend.getAgents();
        setAgents(data);
      } catch (error) {
        console.error(error);
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load agents right now.');
        setAgents([]);
      } finally {
        setLoading(false);
      }
    };

    void loadAgents();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="shell-section-label mb-3">{t('overview')}</p>
        <div className="hero-chip mb-3 text-[11px] font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span>Workflow roles</span>
        </div>
        <h2 className="text-[22px] font-semibold text-foreground">Workers</h2>
        <p className="text-[13px] text-muted-foreground mt-3">
          Monitor the local planning and execution roles that move each workflow forward.
        </p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total roles', value: agents.length, caption: 'Planner and execution surfaces' },
          { label: 'Running now', value: runningAgents, caption: 'Actively advancing a workflow' },
          { label: 'Assigned', value: assignedAgents, caption: 'Holding a current task' },
          { label: 'Idle', value: Math.max(agents.length - assignedAgents, 0), caption: 'Ready for the next handoff' },
        ].map((item) => (
          <div key={item.label} className="surface-card p-4">
            <p className="shell-section-label mb-2">{item.label}</p>
            <p className="text-[24px] font-semibold tracking-[-0.03em] text-foreground">{item.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">{item.caption}</p>
          </div>
        ))}
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
          {errorMessage}
        </div>
      )}
      {agents.length === 0 ? (
        <div className="surface-card p-10 text-center">
          <p className="text-[14px] font-medium text-foreground">No workflow roles are active right now.</p>
          <p className="text-[13px] text-muted-foreground mt-2">
            Start a task to see the planner and executor update here in real time.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <div key={agent.name} className="surface-card glass-frame p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="shell-section-label mb-2">Worker role</p>
                  <p className="text-[14px] font-semibold text-foreground">{agent.name}</p>
                  <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed">
                    {agent.currentTask || 'Standing by for the next workflow handoff.'}
                  </p>
                </div>
                <span className={`w-2.5 h-2.5 rounded-full mt-1 ${
                  agent.status === 'running' ? 'bg-primary animate-pulse' :
                  agent.status === 'idle' ? 'bg-muted-foreground' : 'bg-success'
                }`} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="surface-elevated p-3">
                  <p className="text-[12px] text-muted-foreground">{t('status')}</p>
                  <p className="mt-1 text-[13px] font-medium text-foreground capitalize">{t(agent.status)}</p>
                </div>
                <div className="surface-elevated p-3">
                  <p className="text-[12px] text-muted-foreground">{t('focus')}</p>
                  <p className="mt-1 text-[13px] font-medium text-foreground">{agent.currentTask ? t('assigned') : t('idle')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
