import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../i18n';
import { backend } from '../api';

interface TaskDetailProps {
  taskId?: string;
  className?: string;
}

export function TaskDetail({ taskId = '1', className = '' }: TaskDetailProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadTask = async () => {
    if (!taskId || taskId === 'new') {
      setTask(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await backend.getTask(taskId);
      setTask(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const defaultTask = {
    id: taskId,
    goal: 'Create a Python web application with Flask',
    status: 'running',
    agentMode: 'multi_agent',
    language: 'en',
    createdAt: '2026-03-11T10:00:00Z',
    updatedAt: '2026-03-11T11:15:00Z',
    currentStep: 3,
    totalSteps: 5,
    plan: [
      'Analyze requirements and create project structure',
      'Set up Flask application with basic routes',
      'Implement database models and migrations',
      'Create API endpoints and business logic',
      'Add frontend templates and styling',
    ],
    steps: [
      { id: '1', title: 'Analyze requirements', status: 'completed', agent: 'PlannerAgent', startTime: '2026-03-11T10:00:00Z', endTime: '2026-03-11T10:05:00Z', output: 'Requirements analysis completed. Project structure defined.' },
      { id: '2', title: 'Set up Flask application', status: 'completed', agent: 'CoderAgent', startTime: '2026-03-11T10:05:00Z', endTime: '2026-03-11T10:20:00Z', output: 'Flask app.py created with basic routes.' },
      { id: '3', title: 'Implement database models', status: 'running', agent: 'CoderAgent', startTime: '2026-03-11T10:20:00Z', endTime: null, output: 'Creating SQLAlchemy models...' },
      { id: '4', title: 'Create API endpoints', status: 'pending', agent: 'CoderAgent', startTime: null, endTime: null, output: null },
      { id: '5', title: 'Add frontend templates', status: 'pending', agent: 'CoderAgent', startTime: null, endTime: null, output: null },
    ],
    artifacts: [
      { id: '1', name: 'app.py', type: 'code', path: '/workspace/flask_app/app.py', size: 2048, createdAt: '2026-03-11T10:20:00Z' },
      { id: '2', name: 'requirements.txt', type: 'text', path: '/workspace/flask_app/requirements.txt', size: 256, createdAt: '2026-03-11T10:15:00Z' },
    ],
    logs: [
      { timestamp: '2026-03-11T10:00:00Z', level: 'info', agent: 'PlannerAgent', message: 'Task started: Create a Python web application with Flask' },
      { timestamp: '2026-03-11T10:05:00Z', level: 'info', agent: 'PlannerAgent', message: 'Requirements analysis completed. Moving to CoderAgent.' },
      { timestamp: '2026-03-11T10:20:00Z', level: 'info', agent: 'CoderAgent', message: 'Flask application setup completed. Starting database implementation.' },
      { timestamp: '2026-03-11T11:15:00Z', level: 'info', agent: 'CoderAgent', message: 'Creating SQLAlchemy models for User and Post entities.' },
    ],
  };

  const taskData = task || defaultTask;

  const progressPercentage = useMemo(() => {
    if (!taskData.totalSteps) return 0;
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

  if (loading || !taskData) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Execution Workspace</p>
          <h1 className="text-[22px] font-semibold text-foreground">Task Detail</h1>
          <p className="text-[13px] text-muted-foreground mt-3 max-w-3xl">{taskData.goal}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-medium ${statusStyles(taskData.status)}`}>
            {t(taskData.status)}
          </span>
          {taskData.status === 'pending' && (
            <button className="btn-primary text-[13px]" onClick={async () => { await backend.runTask(taskData.id); await loadTask(); }}>
              {t('start')}
            </button>
          )}
          {taskData.status === 'running' && (
            <button className="btn-secondary text-[13px]" onClick={async () => { await backend.pauseTask(taskData.id); await loadTask(); }}>
              {t('pause')}
            </button>
          )}
          {taskData.status === 'paused' && (
            <button className="btn-primary text-[13px]" onClick={async () => { await backend.resumeTask(taskData.id); await loadTask(); }}>
              {t('resume')}
            </button>
          )}
          {(taskData.status === 'pending' || taskData.status === 'running' || taskData.status === 'paused') && (
            <button className="btn-secondary text-[13px] text-destructive hover:bg-destructive/10" onClick={async () => { await backend.cancelTask(taskData.id); await loadTask(); }}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="surface-card p-5">
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
                  {taskData.currentStep}/{taskData.totalSteps} {t('steps')} • {progressPercentage}%
                </span>
              </div>
              <div className="h-3 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progressPercentage}%` }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
            {[
              { label: t('mode') || 'Mode', value: (taskData.agentMode || 'multi_agent').replace('_', ' ') },
              { label: t('language'), value: (taskData.language || 'en').toUpperCase() },
              { label: t('step'), value: currentStep?.title || t('noTasksFound') },
              { label: t('updatedAt'), value: taskData.updatedAt ? new Date(taskData.updatedAt).toLocaleString() : 'N/A' },
            ].map((item) => (
              <div key={item.label} className="surface-elevated p-4">
                <p className="text-[12px] text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-[13px] font-medium text-foreground">{item.value}</p>
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
            </div>

            <div className="space-y-4">
              <div className="surface-card p-5">
                <h3 className="text-[14px] font-semibold text-foreground mb-4">{t('currentExecution')}</h3>
                <div className="space-y-3">
                  <div className="surface-elevated p-4">
                    <p className="text-[12px] text-muted-foreground">{t('step')}</p>
                    <p className="mt-2 text-[13px] font-medium text-foreground">{currentStep?.title || t('noTasksFound')}</p>
                  </div>
                  <div className="surface-elevated p-4">
                    <p className="text-[12px] text-muted-foreground">{t('agent')}</p>
                    <p className="mt-2 text-[13px] font-medium text-foreground">{currentStep?.agent || t('system')}</p>
                  </div>
                  <div className="surface-elevated p-4">
                    <p className="text-[12px] text-muted-foreground">{t('output')}</p>
                    <p className="mt-2 text-[13px] leading-6 text-foreground">{currentStep?.output || t('loading')}</p>
                  </div>
                </div>
              </div>

              <div className="surface-card p-5">
                <h3 className="text-[14px] font-semibold text-foreground mb-4">{t('recentSignals')}</h3>
                <div className="space-y-3">
                  {(taskData.logs || []).slice(-3).reverse().map((log: any, index: number) => (
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
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-[12px] font-semibold ${
                      step.status === 'completed'
                        ? 'bg-success/12 text-success'
                        : step.status === 'running'
                        ? 'bg-primary/12 text-primary'
                        : 'bg-secondary text-muted-foreground'
                    }`}>
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
                          <p className="text-[13px] text-foreground leading-6">{step.output}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-[12px] text-muted-foreground flex flex-col gap-1 lg:text-right">
                    <span>{step.startTime ? `${t('startedWorkflow')} ${new Date(step.startTime).toLocaleString()}` : t('noTasksFound')}</span>
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
                  <span className={`text-[12px] font-medium px-2 py-1 rounded-md ${
                    log.level === 'error'
                      ? 'bg-destructive text-destructive-foreground'
                      : log.level === 'warning'
                      ? 'bg-warning text-warning-foreground'
                      : 'bg-info text-info-foreground'
                  }`}>
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
            {taskData.artifacts.map((artifact: any) => (
              <div key={artifact.id} className="surface-card p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-11 w-11 rounded-xl bg-primary/12 text-primary flex items-center justify-center text-[18px]">
                      {artifact.type === 'code' ? '⌘' : '·'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-foreground">{artifact.name}</p>
                      <p className="text-[12px] text-muted-foreground mt-1 truncate">{artifact.path}</p>
                      <p className="text-[12px] text-muted-foreground mt-1">
                        {artifact.size} bytes • {artifact.createdAt ? new Date(artifact.createdAt).toLocaleString() : 'Unknown date'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-secondary text-[13px]">{t('view')}</button>
                    <button className="btn-secondary text-[13px]">{t('export')}</button>
                  </div>
                </div>
              </div>
            ))}
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
