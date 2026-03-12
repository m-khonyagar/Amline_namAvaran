import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { backend, webSocket, initBackend } from '../api';

interface DashboardProps {
  className?: string;
}

export function Dashboard({ className = '' }: DashboardProps) {
  const { t } = useTranslation();
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [activeAgents, setActiveAgents] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await initBackend();
        const [tasks, agents] = await Promise.all([
          backend.getTasks(),
          backend.getAgents(),
        ]);
        setRecentTasks(tasks.slice(0, 3));
        setActiveAgents(agents);
        const health = {
          backend: 'healthy',
          agents: agents.some((a: any) => a.status === 'running') ? 'active' : 'healthy',
          externalTools: agents.some((a: any) => a.name === 'ExternalWorkerAgent') ? 'available' : 'partial',
          memory: 'good',
        };
        setSystemHealth(health);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    webSocket.connect();
    webSocket.on('message', (data: any) => {
      if (data.type === 'heartbeat' && data.agents) {
        setActiveAgents(data.agents);
      }
    });
    return () => webSocket.disconnect();
  }, []);

  /* Spec Section 7: Running=Blue, Completed=Green, Waiting=Yellow, Error=Red, Paused=Purple */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success text-success-foreground';
      case 'running': return 'bg-primary text-primary-foreground';
      case 'failed': return 'bg-destructive text-destructive-foreground';
      case 'paused': return 'bg-paused text-paused-foreground';
      case 'cancelled': return 'bg-secondary text-secondary-foreground';
      case 'pending':
      case 'waiting': return 'bg-warning text-warning-foreground';
      case 'idle': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'good':
      case 'available': return 'bg-success text-success-foreground';
      case 'active': return 'bg-warning text-warning-foreground';
      case 'partial': return 'bg-warning text-warning-foreground';
      case 'unhealthy': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const runningTasks = recentTasks.filter((task) => task.status === 'running' || task.status === 'pending');
  const recentProjects = recentTasks.slice(0, 4);

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-5 ${className}`}>
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2.5">{t('overview')}</p>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-semibold text-foreground leading-tight">{t('dashboard')}</h1>
            <p className="text-[13px] text-muted-foreground mt-2.5 leading-relaxed max-w-2xl">
              {t('trackActiveWork')}
            </p>
          </div>
          <div className="hidden xl:grid grid-cols-3 gap-2.5 shrink-0">
            <div className="surface-elevated px-3.5 py-2.5 min-w-[100px]">
              <p className="text-[11px] text-muted-foreground">Agents</p>
              <p className="text-[20px] font-semibold text-foreground mt-1.5 leading-none">{activeAgents.length}</p>
            </div>
            <div className="surface-elevated px-3.5 py-2.5 min-w-[100px]">
              <p className="text-[11px] text-muted-foreground">Running</p>
              <p className="text-[20px] font-semibold text-foreground mt-1.5 leading-none">{runningTasks.length}</p>
            </div>
            <div className="surface-elevated px-3.5 py-2.5 min-w-[100px]">
              <p className="text-[11px] text-muted-foreground">Health</p>
              <p className="text-[20px] font-semibold text-foreground mt-1.5 leading-none">{Object.keys(systemHealth).length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="surface-card p-4">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-[14px] font-semibold text-foreground">{t('recentTasks')}</h3>
            <span className="text-[11px] text-muted-foreground">{recentTasks.length} {t('total')}</span>
          </div>
          <div className="space-y-2">
            {(recentTasks.length > 0 ? recentTasks : []).map(task => (
              <div key={task.id} className="surface-elevated p-3.5 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-foreground truncate leading-snug">{task.goal}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-2 py-0.5 text-[11px] rounded-full shrink-0 ${getStatusColor(task.status)}`}>
                  {t(task.status)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-[14px] font-semibold text-foreground">{t('activeAgents')}</h3>
            <span className="text-[11px] text-muted-foreground">{t('liveOrchestration')}</span>
          </div>
          <div className="space-y-2">
            {activeAgents.map(agent => (
              <div key={agent.name} className="surface-elevated p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-foreground leading-snug">{agent.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-1">{agent.currentTask || 'Idle'}</p>
                </div>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  agent.status === 'running' ? 'bg-primary animate-pulse' :
                  agent.status === 'idle' ? 'bg-muted-foreground' :
                  'bg-success'
                }`}></span>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-[14px] font-semibold text-foreground">{t('systemHealth')}</h3>
            <span className="text-[11px] text-muted-foreground">{t('observed')}</span>
          </div>
          <div className="space-y-2">
            {Object.entries(systemHealth).map(([key, value]) => (
              <div key={key} className="surface-elevated p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground capitalize leading-snug">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Monitored service</p>
                </div>
                <span className={`px-2 py-0.5 text-[11px] rounded-full shrink-0 ${getHealthColor(value as string)}`}>
                  {value as string}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-[14px] font-semibold text-foreground">{t('quickActions')}</h3>
            <span className="text-[11px] text-muted-foreground">{t('highLeverage')}</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button className="surface-elevated p-3.5 text-left hover:border-primary/30 transition-colors">
              <p className="text-[13px] font-medium text-foreground leading-snug">{t('createTaskAction')}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{t('startNewWorkflow')}</p>
            </button>
            <button className="surface-elevated p-3.5 text-left hover:border-primary/30 transition-colors">
              <p className="text-[13px] font-medium text-foreground leading-snug">{t('reviewAgents')}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{t('inspectOrchestration')}</p>
            </button>
            {recentProjects.slice(0, 1).map((task) => (
              <button key={task.id} className="surface-elevated p-3.5 text-left hover:border-primary/30 transition-colors">
                <p className="text-[13px] font-medium text-foreground truncate leading-snug">Open {task.goal}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Resume recent workspace</p>
              </button>
            ))}
            <button className="surface-elevated p-3.5 text-left hover:border-primary/30 transition-colors">
              <p className="text-[13px] font-medium text-foreground leading-snug">{t('systemCheck')}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{t('refreshServices')}</p>
            </button>
          </div>
        </div>

        {recentProjects.length > 0 && (
          <div className="surface-card p-4 xl:col-span-2">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-[14px] font-semibold text-foreground">{t('recentProjects')}</h3>
              <span className="text-[11px] text-muted-foreground">{t('workspaceReady')}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {recentProjects.map((task) => (
                <div key={task.id} className="surface-elevated p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-foreground truncate leading-snug">{task.goal}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{t('lastUpdated')} {new Date(task.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="btn-secondary text-[11px] h-7 px-2.5 shrink-0">{t('open')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
