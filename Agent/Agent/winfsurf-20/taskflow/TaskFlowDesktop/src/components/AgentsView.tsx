import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { backend, initBackend } from '../api';

export function AgentsView() {
  const { t } = useTranslation();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initBackend().then(() => {
      backend.getAgents().then(setAgents).catch(console.error).finally(() => setLoading(false));
    });
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
        <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground mb-3">{t('overview')}</p>
        <h2 className="text-[22px] font-semibold text-foreground">{t('agents')}</h2>
        <p className="text-[13px] text-muted-foreground mt-3">{t('monitorAgents')}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => (
          <div key={agent.name} className="surface-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[14px] font-semibold text-foreground">{agent.name}</p>
                <p className="text-[12px] text-muted-foreground mt-1">{agent.currentTask || t('idle')}</p>
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
    </div>
  );
}
