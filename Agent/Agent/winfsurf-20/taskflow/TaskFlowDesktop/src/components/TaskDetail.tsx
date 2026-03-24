import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../i18n';
import { backend } from '../api';
import { MarkdownContent } from './MarkdownContent';

interface TaskDetailProps {
  taskId?: string;
  className?: string;
}

const ACTIVE_STATUSES = new Set(['pending', 'running', 'paused']);

export function TaskDetail({ taskId, className = '' }: TaskDetailProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadTask = async (silent = false) => {
    if (!taskId || taskId === 'new') {
      setTask(null);
      setErrorMessage('');
      setLoading(false);
      return;
    }

    try {
      if (!silent) {
        setLoading(true);
      }
      setErrorMessage('');
      const data = await backend.getTask(taskId);
      setTask(data);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load task details right now.');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadTask();
  }, [taskId]);

  useEffect(() => {
    if (!task || !ACTIVE_STATUSES.has(task.status)) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadTask(true);
    }, 2500);

    return () => window.clearInterval(interval);
  }, [task?.id, task?.status]);

  const taskData = task;
  const completedSteps = taskData?.steps?.filter((step: any) => step.status === 'completed').length || 0;
  const artifactCount = taskData?.artifacts?.length || 0;
  const logCount = taskData?.logs?.length || 0;

  const progressPercentage = useMemo(() => {
    if (!taskData?.totalSteps) return 0;
    return Math.max(0, Math.min(100, Math.round(((taskData.currentStep || 0) / taskData.totalSteps) * 100)));
  }, [taskData]);

  const statusStyles = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success/12 text-success border-success/20';
      case 'running':
        return 'bg-primary/12 text-primary border-primary/20';
      case 'failed':
        return 'bg-destructive/12 text-destructive border-destructive/20';
      case 'cancelled':
        return 'bg-secondary text-secondary-foreground border-border';
      case 'paused':
        return 'bg-paused/12 text-paused border-paused/20';
      default:
        return 'bg-warning/12 text-warning border-warning/20';
    }
  };

  const tabButtonClass = (tabId: string) =>
    `h-9 px-3 rounded-lg border text-[12px] font-medium transition-colors ${
      activeTab === tabId
        ? 'border-primary/25 bg-primary/12 text-primary'
        : 'border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent'
    }`;

  const runAction = async (action: () => Promise<unknown>) => {
    try {
      setErrorMessage('');
      await action();
      await loadTask(true);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update this task right now.');
    }
  };

  const handleOpenArtifact = (artifact: any) => {
    const target = artifact.downloadUrl || artifact.path;
    window.open(target, '_blank', 'noopener,noreferrer');
  };

  const handleCopyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (!taskData) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="surface-card p-10 text-center">
          <p className="text-[14px] font-medium text-foreground">Task not available</p>
          <p className="text-[13px] text-muted-foreground mt-2">
            Select a task from the queue to inspect its steps, logs, and artifacts.
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: t('overview') },
    { id: 'steps', label: t('steps') },
    { id: 'logs', label: t('logs') },
    { id: 'artifacts', label: t('artifacts') },
    { id: 'collaboration', label: t('collaboration') },
  ];

  const currentStep = taskData.steps?.[(taskData.currentStep || 1) - 1];
  const taskHealthLabel =
    taskData.status === 'completed'
      ? 'Output ready'
      : taskData.status === 'failed'
        ? 'Needs review'
        : taskData.status === 'running'
          ? 'Actively progressing'
          : taskData.status === 'paused'
            ? 'Paused safely'
            : 'Waiting to start';

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="shell-section-label mb-3">Execution workspace</p>
          <div className="hero-chip mb-3 text-[11px] font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span>Live task inspection</span>
          </div>
          <h1 className="text-[22px] font-semibold text-foreground">Task Detail</h1>
          <p className="text-[13px] text-muted-foreground mt-3 max-w-3xl">{taskData.goal}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="shell-meta-chip">{taskHealthLabel}</span>
          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-medium ${statusStyles(taskData.status)}`}>
            {t(taskData.status)}
          </span>
          <button className="btn-secondary text-[13px]" onClick={() => void loadTask(true)}>
            {t('refresh')}
          </button>
          {taskData.status === 'pending' && (
            <button className="btn-primary text-[13px]" onClick={() => void runAction(() => backend.runTask(taskData.id))}>
              {t('start')}
            </button>
          )}
          {taskData.status === 'running' && (
            <button className="btn-secondary text-[13px]" onClick={() => void runAction(() => backend.pauseTask(taskData.id))}>
              {t('pause')}
            </button>
          )}
          {taskData.status === 'paused' && (
            <button className="btn-primary text-[13px]" onClick={() => void runAction(() => backend.resumeTask(taskData.id))}>
              {t('resume')}
            </button>
          )}
          {(taskData.status === 'pending' || taskData.status === 'running' || taskData.status === 'paused') && (
            <button
              className="btn-secondary text-[13px] text-destructive hover:bg-destructive/10"
              onClick={() => void runAction(() => backend.cancelTask(taskData.id))}
            >
              {t('cancel')}
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: 'Completed steps', value: completedSteps, caption: `of ${taskData.totalSteps || 1}` },
          { label: 'Artifacts', value: artifactCount, caption: 'Visible outputs' },
          { label: 'Signals', value: logCount, caption: 'Observed events' },
          { label: 'Current focus', value: currentStep?.idx || 0, caption: currentStep?.title || 'Waiting' },
        ].map((item) => (
          <div key={item.label} className="surface-card p-4">
            <p className="shell-section-label mb-2">{item.label}</p>
            <p className="text-[24px] font-semibold tracking-[-0.03em] text-foreground">{item.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{item.caption}</p>
          </div>
        ))}
      </div>

      <div className="surface-card glass-frame p-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-semibold text-foreground">{t('goal')}</p>
              <span className="text-[12px] text-muted-foreground">#{taskData.id}</span>
            </div>
            <p className="text-[13px] leading-6 text-foreground">{taskData.goal}</p>

            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] text-muted-foreground">{t('executionProgress')}</span>
                <span className="text-[12px] font-medium text-foreground">
                  {completedSteps}/{taskData.totalSteps} {t('steps')} | {progressPercentage}%
                </span>
              </div>
              <div className="surface-elevated p-3 rounded-2xl">
                <div className="h-3 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-300 shadow-[0_0_24px_hsl(var(--primary)/0.28)]" style={{ width: `${progressPercentage}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-border bg-secondary/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                    {(taskData.agentMode || 'multi_agent').replace('_', ' ')}
                  </span>
                  <span className="rounded-full border border-border bg-secondary/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                    {(taskData.language || 'en').toUpperCase()}
                  </span>
                  <span className="rounded-full border border-border bg-secondary/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                    {taskData.workspacePath || 'Workspace pending'}
                  </span>
                </div>
              </div>
            </div>

            {taskData.summary && (
              <div className="surface-elevated p-4 mt-5">
                <p className="shell-section-label mb-2">Summary</p>
                <MarkdownContent content={taskData.summary} className="text-[13px] leading-6" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
            {[
              { label: t('mode') || 'Mode', value: (taskData.agentMode || 'multi_agent').replace('_', ' ') },
              { label: t('language'), value: (taskData.language || 'en').toUpperCase() },
              { label: t('step'), value: currentStep?.title || 'Waiting for execution' },
              { label: t('updatedAt'), value: taskData.updatedAt ? new Date(taskData.updatedAt).toLocaleString() : 'N/A' },
              { label: t('createdAt'), value: taskData.createdAt ? new Date(taskData.createdAt).toLocaleString() : 'N/A' },
              { label: t('workspace'), value: taskData.workspacePath || 'N/A' },
            ].map((item) => (
              <div key={item.label} className="surface-elevated p-4">
                <p className="text-[12px] text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-[13px] font-medium text-foreground break-all">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={tabButtonClass(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[420px]">
        {activeTab === 'overview' && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="surface-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-semibold text-foreground">{t('plan')}</h3>
                <span className="text-[12px] text-muted-foreground">{taskData.plan.length} items</span>
              </div>
              <div className="space-y-3">
                {taskData.plan.map((item: string, index: number) => (
                  <div key={index} className="surface-elevated p-4 flex items-start gap-3">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/12 text-primary flex items-center justify-center text-[12px] font-semibold">
                      {index + 1}
                    </span>
                    <span className="text-[13px] leading-6 text-foreground">{item}</span>
                  </div>
                ))}
              </div>
              {artifactCount > 0 && (
                <div className="surface-elevated p-4 mt-4">
                  <p className="shell-section-label mb-2">Delivery signal</p>
                  <p className="text-[13px] text-foreground leading-6">
                    This workflow has already produced {artifactCount} output file{artifactCount === 1 ? '' : 's'}. Open the Artifacts tab to inspect or export them.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="surface-card p-5">
                <h3 className="text-[14px] font-semibold text-foreground mb-4">{t('currentExecution')}</h3>
                <div className="space-y-3">
                  <div className="surface-elevated p-4">
                    <p className="text-[12px] text-muted-foreground">{t('step')}</p>
                    <p className="mt-2 text-[13px] font-medium text-foreground">{currentStep?.title || 'Waiting for execution'}</p>
                  </div>
                  <div className="surface-elevated p-4">
                    <p className="text-[12px] text-muted-foreground">{t('agent')}</p>
                    <p className="mt-2 text-[13px] font-medium text-foreground">{currentStep?.agent || t('system')}</p>
                  </div>
                  <div className="surface-elevated p-4">
                    <p className="text-[12px] text-muted-foreground">{t('output')}</p>
                    <div className="mt-2">
                      <MarkdownContent content={currentStep?.output || t('loading')} className="text-[13px] leading-6" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="surface-card p-5">
                <h3 className="text-[14px] font-semibold text-foreground mb-4">{t('recentSignals')}</h3>
                <div className="space-y-3">
                  {(taskData.logs || []).slice(-4).reverse().map((log: any, index: number) => (
                    <div key={index} className="surface-elevated p-4">
                      <p className="text-[12px] text-muted-foreground">{log.agent}</p>
                      <p className="mt-2 text-[13px] text-foreground leading-6">{log.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'steps' && (
          <div className="space-y-3">
            {taskData.steps.map((step: any, index: number) => (
              <div key={step.id} className="surface-card p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center text-[12px] font-semibold ${
                        step.status === 'completed'
                          ? 'bg-success/12 text-success'
                          : step.status === 'running'
                            ? 'bg-primary/12 text-primary'
                            : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-[14px] font-semibold text-foreground">{step.title}</h4>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-medium ${statusStyles(step.status)}`}>
                          {t(step.status)}
                        </span>
                      </div>
                      <p className="text-[12px] text-muted-foreground mt-2">{step.agent}</p>
                      {step.output && (
                        <div className="surface-elevated p-4 mt-4">
                          <MarkdownContent content={step.output} className="text-[13px] leading-6" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-[12px] text-muted-foreground flex flex-col gap-1 lg:text-right">
                    <span>{step.startTime ? `${t('started')} ${new Date(step.startTime).toLocaleString()}` : 'Not started yet'}</span>
                    {step.endTime && <span>{t('ended')} {new Date(step.endTime).toLocaleString()}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="surface-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold text-foreground">{t('logs')}</h3>
              <span className="text-[12px] text-muted-foreground">{t('executionStream')}</span>
            </div>
            <div className="space-y-2 max-h-[520px] overflow-y-auto shell-scroll">
              {taskData.logs.map((log: any, index: number) => (
                <div key={index} className="surface-elevated p-4 flex items-start gap-3">
                  <span className="text-[12px] text-muted-foreground font-mono min-w-[70px]">
                    {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '--:--'}
                  </span>
                  <span
                    className={`text-[12px] font-medium px-2 py-1 rounded-md ${
                      log.level === 'error'
                        ? 'bg-destructive text-destructive-foreground'
                        : log.level === 'warning'
                          ? 'bg-warning text-warning-foreground'
                          : 'bg-info text-info-foreground'
                    }`}
                  >
                    {log.level.toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-foreground">{log.message}</p>
                    <p className="text-[12px] text-muted-foreground mt-1">{log.agent}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'artifacts' && (
          <div className="grid gap-3">
            {taskData.artifacts.length > 0 ? (
              taskData.artifacts.map((artifact: any) => (
                <div key={artifact.id} className="surface-card p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-foreground">{artifact.name}</p>
                      <p className="text-[12px] text-muted-foreground mt-1 break-all">{artifact.path}</p>
                      <p className="text-[12px] text-muted-foreground mt-1">
                        {artifact.size} bytes | {artifact.createdAt ? new Date(artifact.createdAt).toLocaleString() : 'Unknown date'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-secondary text-[13px]" onClick={() => handleOpenArtifact(artifact)}>
                        {t('open')}
                      </button>
                      <button className="btn-secondary text-[13px]" onClick={() => void handleCopyPath(artifact.path)}>
                        {t('copyPath')}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="surface-card p-10 text-center">
                <p className="text-[14px] font-medium text-foreground">{t('noArtifactsFound')}</p>
                <p className="text-[13px] text-muted-foreground mt-2">Artifacts will appear here as soon as the task produces output.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'collaboration' && (
          <div className="surface-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold text-foreground">{t('collaboration')}</h3>
              <span className="text-[12px] text-muted-foreground">{t('agentHandoffs')}</span>
            </div>
            <div className="space-y-3">
              {taskData.steps.map((step: any, index: number) => (
                <div key={step.id} className="surface-elevated p-4 flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{step.agent}</p>
                    <p className="text-[12px] text-muted-foreground mt-1">
                      {index === 0 ? t('startedWorkflow') : `${t('tookOverAfterStep')} ${index}`}
                    </p>
                    <p className="text-[13px] text-foreground mt-3">{step.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
