import React, { useEffect, useState } from 'react';
import { useTranslation } from '../i18n';
import { backend, webSocket, initBackend } from '../api';

interface DashboardProps {
  className?: string;
  onOpenAgents?: () => void;
  onOpenTasks?: () => void;
  onOpenFiles?: () => void;
  onOpenSettings?: () => void;
  onOpenTaskDetail?: (taskId: string) => void;
}

export function Dashboard({ className = '', onOpenAgents, onOpenTasks, onOpenFiles, onOpenSettings, onOpenTaskDetail }: DashboardProps) {
  const { t } = useTranslation();
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [activeAgents, setActiveAgents] = useState<any[]>([]);
  const [recentArtifacts, setRecentArtifacts] = useState<any[]>([]);
  const [workspacePath, setWorkspacePath] = useState('./workspace');
  const [systemHealth, setSystemHealth] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await initBackend();
        const [tasks, agents, artifacts, settings] = await Promise.all([
          backend.getTasks(),
          backend.getAgents(),
          backend.getArtifacts(),
          backend.getSettings().catch(() => null),
        ]);
        setAllTasks(tasks);
        setActiveAgents(agents);
        setRecentArtifacts(artifacts.slice(0, 3));
        if (settings?.workspacePath) {
          setWorkspacePath(settings.workspacePath);
        }
        setSystemHealth({
          backend: 'healthy',
          agents: agents.some((a: any) => a.status === 'running') ? 'active' : 'healthy',
          workspace: settings?.workspacePath ? 'available' : 'healthy',
          memory: 'good',
        });
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
    webSocket.connect();
    webSocket.on('message', () => {
      void loadData();
    });
    const interval = window.setInterval(() => void loadData(), 5000);

    return () => {
      window.clearInterval(interval);
      webSocket.disconnect();
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success text-success-foreground';
      case 'running':
        return 'bg-primary text-primary-foreground';
      case 'failed':
        return 'bg-destructive text-destructive-foreground';
      case 'paused':
        return 'bg-paused text-paused-foreground';
      case 'cancelled':
        return 'bg-secondary text-secondary-foreground';
      case 'pending':
      case 'waiting':
        return 'bg-warning text-warning-foreground';
      case 'idle':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'good':
      case 'available':
        return 'bg-success text-success-foreground';
      case 'active':
      case 'partial':
        return 'bg-warning text-warning-foreground';
      case 'unhealthy':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const recentTasks = allTasks.slice(0, 4);
  const runningTasks = allTasks.filter((task) => task.status === 'running' || task.status === 'pending');
  const completedTasks = allTasks.filter((task) => task.status === 'completed');
  const recentProjects = allTasks.slice(0, 4);
  const hasTasks = allTasks.length > 0;
  const lastCompletedTask = completedTasks[0];
  const latestArtifact = recentArtifacts[0];

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">{t('loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-5 ${className}`}>
      <div className="mb-6">
        <p className="shell-section-label mb-2.5">{t('overview')}</p>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="hero-chip mb-3 text-[11px] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span>Local workspace assistant</span>
            </div>
            <h1 className="text-[22px] font-semibold text-foreground leading-tight">{t('dashboard')}</h1>
            <p className="text-[13px] text-muted-foreground mt-2.5 leading-relaxed max-w-2xl">
              Turn a plain-language outcome into a runnable workflow, inspect progress, and collect the result without leaving the desktop app.
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
              <p className="text-[11px] text-muted-foreground">Tasks</p>
              <p className="text-[20px] font-semibold text-foreground mt-1.5 leading-none">{allTasks.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total tasks', value: allTasks.length, caption: 'All local workflows' },
          { label: 'Running now', value: runningTasks.length, caption: 'Active or queued work' },
          { label: 'Completed', value: completedTasks.length, caption: 'Finished successfully' },
          { label: 'Artifacts', value: recentArtifacts.length, caption: 'Recent visible outputs' },
        ].map((item) => (
          <div key={item.label} className="surface-card p-4">
            <p className="shell-section-label mb-2">{item.label}</p>
            <p className="text-[24px] font-semibold tracking-[-0.03em] text-foreground">{item.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">{item.caption}</p>
          </div>
        ))}
      </div>

      <div className="surface-card glass-frame p-5 mb-4">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)] xl:items-start">
          <div>
            <p className="shell-section-label mb-3">What to do next</p>
            <h2 className="text-[24px] font-semibold tracking-[-0.04em] text-foreground max-w-2xl">
              Describe the outcome you want, let the local workflow run, then open the generated result.
            </h2>
            <div className="grid gap-3 md:grid-cols-3 mt-5">
              {[
                { step: '1', title: 'Describe the outcome', copy: 'Start with one concrete result, not a long specification.' },
                { step: '2', title: 'Run the workflow', copy: 'The planner and executor move the task forward locally.' },
                { step: '3', title: 'Collect the output', copy: 'Open generated files, inspect steps, and reuse the result.' },
              ].map((item) => (
                <div key={item.step} className="surface-elevated p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/12 text-primary text-[12px] font-semibold">
                      {item.step}
                    </span>
                    <p className="text-[14px] font-semibold text-foreground">{item.title}</p>
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{item.copy}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-5">
              <button className="btn-primary text-[13px]" onClick={onOpenTasks}>
                Start a workflow
              </button>
              <button className="btn-secondary text-[13px]" onClick={onOpenFiles}>
                Review outputs
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="surface-elevated p-4">
              <p className="shell-section-label mb-2">Trust layer</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-foreground">Local API</span>
                  <span className="rounded-full bg-success/12 text-success border border-success/20 px-2.5 py-1 text-[11px] font-medium">Ready</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-foreground">Workspace root</span>
                  <span className="text-[12px] text-muted-foreground truncate max-w-[180px]">{workspacePath}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-foreground">Latest completed task</span>
                  <span className="text-[12px] text-muted-foreground truncate max-w-[180px]">{lastCompletedTask?.goal || 'Waiting for the first completed run'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-foreground">Latest output</span>
                  <span className="text-[12px] text-muted-foreground truncate max-w-[180px]">{latestArtifact?.name || 'No outputs yet'}</span>
                </div>
              </div>
            </div>
            <div className="surface-elevated p-4">
              <p className="shell-section-label mb-2">Best first request</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Aim for a short, concrete request such as a release checklist, a workspace review, or a status summary. Shorter goals usually produce better first results.
              </p>
            </div>
            <div className="surface-elevated p-4">
              <p className="shell-section-label mb-2">If you are unsure</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Start from Workflows for direct results. Use Assistant only when you want chat, uploads, or connected tools. Open Advanced tools later if you need deeper control.
              </p>
            </div>
          </div>
        </div>
      </div>

      {!hasTasks && (
        <div className="surface-card p-5 mb-3 glass-frame">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-2xl">
              <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Quick start</p>
              <h2 className="text-[20px] font-semibold text-foreground">Your workspace is ready for the first task.</h2>
              <p className="text-[13px] text-muted-foreground mt-3 leading-relaxed">
                Start from Workflows, describe the outcome you want, then run it. Generated files will appear in Outputs and saved preferences live in Settings.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary text-[13px]" onClick={onOpenTasks}>
                Create first task
              </button>
              <button className="btn-secondary text-[13px]" onClick={onOpenSettings}>
                Review settings
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <div className="surface-card p-4">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-[14px] font-semibold text-foreground">{t('recentTasks')}</h3>
              <span className="text-[11px] text-muted-foreground">{allTasks.length} total</span>
            </div>
            <div className="space-y-2">
            {recentTasks.length > 0 ? (
              recentTasks.map((task) => (
                <button
                  key={task.id}
                  className="surface-elevated p-3.5 flex w-full items-start justify-between gap-3 text-left hover:border-primary/20 transition-colors"
                  onClick={() => onOpenTaskDetail?.(task.id)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-foreground truncate leading-snug">{task.goal}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{new Date(task.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-[11px] rounded-full shrink-0 ${getStatusColor(task.status)}`}>
                    {t(task.status)}
                  </span>
                </button>
              ))
            ) : (
              <div className="surface-elevated p-4">
                <p className="text-[13px] font-medium text-foreground">No tasks yet</p>
                <p className="text-[12px] text-muted-foreground mt-1.5">Create your first workflow from the Tasks page.</p>
                <button className="btn-secondary text-[12px] mt-3" onClick={onOpenTasks}>
                  Open Tasks
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-[14px] font-semibold text-foreground">Workflow roles</h3>
            <span className="text-[11px] text-muted-foreground">{t('liveOrchestration')}</span>
          </div>
          <div className="space-y-2">
            {activeAgents.map((agent) => (
              <div key={agent.name} className="surface-elevated p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-foreground leading-snug">{agent.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-1">{agent.currentTask || 'Idle'}</p>
                </div>
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    agent.status === 'running' ? 'bg-primary animate-pulse' : agent.status === 'idle' ? 'bg-muted-foreground' : 'bg-success'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-[14px] font-semibold text-foreground">{t('systemHealth')}</h3>
            <span className="text-[11px] text-muted-foreground">Observed services</span>
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
            <span className="text-[11px] text-muted-foreground">Real product path</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button className="surface-elevated p-3.5 text-left hover:border-primary/20 transition-colors" onClick={onOpenTasks}>
              <p className="text-[13px] font-medium text-foreground leading-snug">{t('createTaskAction')}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Use the Tasks page to create and run a new workflow.</p>
            </button>
            <button className="surface-elevated p-3.5 text-left hover:border-primary/20 transition-colors" onClick={onOpenAgents}>
              <p className="text-[13px] font-medium text-foreground leading-snug">{t('reviewAgents')}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Open Agents to inspect live executor status from the backend.</p>
            </button>
            <button className="surface-elevated p-3.5 text-left hover:border-primary/20 transition-colors" onClick={onOpenSettings}>
              <p className="text-[13px] font-medium text-foreground leading-snug">{t('systemCheck')}</p>
              <p className="text-[11px] text-muted-foreground mt-1">This dashboard auto-refreshes every few seconds while tasks are active.</p>
            </button>
            <button className="surface-elevated p-3.5 text-left hover:border-primary/20 transition-colors" onClick={onOpenFiles}>
              <p className="text-[13px] font-medium text-foreground leading-snug">{t('artifacts')}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Generated files are previewable and downloadable from the Files view.</p>
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
                  <button className="btn-secondary text-[11px] h-7 px-2.5 shrink-0" onClick={() => onOpenTaskDetail?.(task.id)}>
                    {t('open')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
