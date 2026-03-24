import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../i18n';
import { backend } from '../api';
import { useProgressStore } from '../stores/progressStore';

interface TasksListProps {
  className?: string;
  onTaskSelect?: (taskId: string) => void;
  onOpenFiles?: () => void;
}

const STATUS_ORDER = ['all', 'running', 'pending', 'completed', 'failed', 'cancelled'] as const;
const QUICK_START_PROMPTS = [
  'Summarize the latest task outputs and create a short status note',
  'Review the workspace and list the next practical implementation steps',
  'Generate a simple release checklist for the current project',
] as const;

export function TasksList({ className = '', onTaskSelect, onOpenFiles }: TasksListProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_ORDER)[number]>('all');
  const [newTaskGoal, setNewTaskGoal] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const progressStore = useProgressStore();

  const loadTasks = async () => {
    try {
      const data = await backend.getTasks();
      setTasks(data);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load tasks right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTasks();
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = task.goal.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter, tasks]);

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      running: tasks.filter((task) => task.status === 'running').length,
      pending: tasks.filter((task) => task.status === 'pending').length,
      completed: tasks.filter((task) => task.status === 'completed').length,
    };
  }, [tasks]);
  const lastCompletedTask = tasks.find((task) => task.status === 'completed');
  const activeTask = tasks.find((task) => task.status === 'running' || task.status === 'paused' || task.status === 'pending');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success/12 text-success border-success/20';
      case 'running':
        return 'bg-primary/12 text-primary border-primary/20';
      case 'failed':
        return 'bg-destructive/12 text-destructive border-destructive/20';
      case 'cancelled':
        return 'bg-secondary text-secondary-foreground border-border';
      case 'pending':
      default:
        return 'bg-warning/12 text-warning border-warning/20';
    }
  };

  const getProgressPercentage = (task: any) => {
    const total = task.totalSteps || 1;
    const current = typeof task.currentStep === 'number' ? task.currentStep : task.status === 'completed' ? total : 0;
    return Math.max(0, Math.min(100, Math.round((current / total) * 100)));
  };

  const handleStart = async (taskId: string, goal: string) => {
    try {
      setErrorMessage('');
      progressStore.show(goal, 0, 3);
      await backend.runTask(taskId);
      await loadTasks();
      progressStore.setProgress({ progress: 33, currentStep: 1 });
      setTimeout(() => progressStore.hide(), 2000);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start this task right now.');
      progressStore.hide();
    }
  };

  const handleCreateTask = async (autoRun: boolean) => {
    const goal = newTaskGoal.trim();
    if (!goal) return;

    try {
      setErrorMessage('');
      setCreating(true);
      const created = await backend.createTask(goal);

      if (autoRun) {
        progressStore.show(goal, 0, 3);
        await backend.runTask(created.id);
        progressStore.setProgress({ progress: 33, currentStep: 1 });
      }

      await loadTasks();
      setNewTaskGoal('');
      onTaskSelect?.(created.id);

      if (autoRun) {
        setTimeout(() => progressStore.hide(), 2000);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create task right now.');
      progressStore.hide();
    } finally {
      setCreating(false);
    }
  };

  const handlePause = async (taskId: string) => {
    await backend.pauseTask(taskId);
    await loadTasks();
  };

  const handleResume = async (taskId: string) => {
    await backend.resumeTask(taskId);
    await loadTasks();
  };

  const handleCancel = async (taskId: string) => {
    await backend.cancelTask(taskId);
    await loadTasks();
  };

  const isEmptyWorkspace = tasks.length === 0 && !searchQuery.trim() && statusFilter === 'all';

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="shell-section-label mb-3">{t('queue')}</p>
          <div className="hero-chip mb-3 text-[11px] font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span>Outcome first, workflow second</span>
          </div>
          <h1 className="text-[22px] font-semibold text-foreground">{t('tasks')}</h1>
          <p className="text-[13px] text-muted-foreground mt-3 max-w-2xl">
            Write a concrete outcome, run the local workflow, then open the result. Keep the request short and specific for the best first pass.
          </p>
        </div>

        <div className="surface-card p-4 w-full xl:w-[720px] glass-frame">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-semibold text-foreground">Start a new workflow</p>
              <span className="text-[12px] text-muted-foreground">One clear result at a time</span>
            </div>
            <div className="flex flex-col lg:flex-row gap-3">
              <input
                type="text"
                value={newTaskGoal}
                onChange={(e) => setNewTaskGoal(e.target.value)}
                placeholder="Example: Create a short release checklist for this workspace"
                className="input flex-1"
              />
              <button
                className="btn-secondary whitespace-nowrap"
                disabled={creating || !newTaskGoal.trim()}
                onClick={() => void handleCreateTask(false)}
              >
                {creating ? t('loading') : 'Create only'}
              </button>
              <button
                className="btn-primary whitespace-nowrap"
                disabled={creating || !newTaskGoal.trim()}
                onClick={() => void handleCreateTask(true)}
              >
                {creating ? t('loading') : 'Create and run'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_START_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setNewTaskGoal(prompt)}
                  className="h-8 px-3 rounded-full border border-border bg-secondary text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
            {errorMessage && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                {errorMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      {isEmptyWorkspace && (
        <div className="surface-card glass-frame p-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] xl:items-start">
            <div className="max-w-2xl">
              <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground mb-3">First run</p>
              <h2 className="text-[20px] font-semibold text-foreground">Start with one clear outcome.</h2>
              <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">
                Write the result you want, create the task, then use "Run now" to start immediately. When the workflow finishes, generated files will appear in Files.
              </p>
              <div className="grid gap-3 md:grid-cols-3 mt-5">
                {[
                  { title: 'Be concrete', copy: 'Ask for one deliverable, not a full project.' },
                  { title: 'Name the format', copy: 'Say whether you want notes, a checklist, or a file.' },
                  { title: 'Add context', copy: 'Mention the workspace or goal so the workflow stays grounded.' },
                ].map((item) => (
                  <div key={item.title} className="surface-elevated p-4">
                    <p className="text-[13px] font-semibold text-foreground">{item.title}</p>
                    <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed">{item.copy}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="surface-elevated p-4">
              <p className="shell-section-label mb-3">Starter prompts</p>
              <div className="space-y-2">
                {QUICK_START_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-3 text-left text-[12px] text-foreground hover:bg-accent transition-colors"
                    onClick={() => setNewTaskGoal(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <button className="btn-primary text-[13px] flex-1" onClick={() => setNewTaskGoal(QUICK_START_PROMPTS[0])}>
                  Use example
                </button>
                <button className="btn-secondary text-[13px] flex-1" onClick={onOpenFiles}>
                  Open Files
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: `${t('total')} ${t('tasks')}`, value: stats.total, caption: 'All local workflow requests' },
          { label: t('running'), value: stats.running, caption: 'Live or currently executing' },
          { label: t('pending'), value: stats.pending, caption: 'Ready to start or queued' },
          { label: t('completed'), value: stats.completed, caption: 'Delivered with output' },
        ].map((item) => (
          <div key={item.label} className="surface-card p-4">
            <p className="shell-section-label mb-2">{item.label}</p>
            <p className="mt-2 text-[22px] font-semibold text-foreground">{item.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">{item.caption}</p>
          </div>
        ))}
      </div>

      {activeTask && (
        <div className="surface-card glass-frame p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="shell-section-label mb-2">Live focus</p>
              <p className="text-[15px] font-semibold text-foreground truncate">{activeTask.goal}</p>
              <p className="text-[12px] text-muted-foreground mt-1.5">
                {activeTask.status === 'running'
                  ? 'This workflow is actively executing now.'
                  : activeTask.status === 'paused'
                    ? 'This workflow is paused and can be resumed.'
                    : 'This workflow is queued and ready to start.'}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary text-[13px]" onClick={() => onTaskSelect?.(activeTask.id)}>
                Open task
              </button>
              {activeTask.status === 'pending' && (
                <button className="btn-primary text-[13px]" onClick={() => void handleStart(activeTask.id, activeTask.goal)}>
                  {t('start')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="surface-card p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <input
              type="text"
              placeholder={`${t('search')} tasks`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input flex-1"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_ORDER.map((status) => {
              const active = statusFilter === status;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`h-9 px-3 rounded-lg border text-[12px] font-medium transition-colors ${
                    active
                      ? 'border-primary/25 bg-primary/12 text-primary'
                      : 'border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {status === 'all' ? t('all') : t(status)}
                </button>
              );
            })}
            <button className="btn-secondary text-[12px]" onClick={() => void loadTasks()}>
              {t('refresh')}
            </button>
          </div>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="surface-card p-10 text-center">
          <p className="text-[14px] font-medium text-foreground">{t('noTasksFound')}</p>
          <p className="text-[13px] text-muted-foreground mt-2">{t('tryDifferentFilter')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div key={task.id} className="surface-card p-5 transition-colors hover:border-primary/20">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-medium ${getStatusColor(task.status)}`}>
                      {t(task.status)}
                    </span>
                    <span className="text-[12px] text-muted-foreground">#{task.id}</span>
                    <span className="text-[12px] text-muted-foreground">Guided workflow</span>
                    <span className="text-[12px] text-muted-foreground">{(task.language || 'en').toUpperCase()}</span>
                  </div>
                  <button onClick={() => onTaskSelect?.(task.id)} className="text-left w-full">
                    <h3 className="text-[16px] font-semibold text-foreground truncate hover:text-primary transition-colors">{task.goal}</h3>
                  </button>
                  <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed">
                    {task.status === 'completed'
                      ? 'This workflow finished and should have visible output in Files.'
                      : task.status === 'failed'
                        ? 'This workflow needs review before another attempt.'
                        : 'This workflow can be inspected in detail to view steps, logs, and generated artifacts.'}
                  </p>
                  <div className="mt-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_180px] gap-4 items-center">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[12px] text-muted-foreground">{t('executionProgress')}</span>
                        <span className="text-[12px] font-medium text-foreground">
                          {task.currentStep ?? 0}/{task.totalSteps || 1} {t('steps')}
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${getProgressPercentage(task)}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-start lg:justify-end gap-2 text-[12px] text-muted-foreground">
                      <span>{t('created')} {new Date(task.createdAt || 0).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 xl:justify-end xl:max-w-[320px]">
                  <button className="btn-secondary text-[13px]" onClick={() => onTaskSelect?.(task.id)}>
                    {t('view')}
                  </button>
                  {task.status === 'pending' && (
                    <button className="btn-primary text-[13px]" onClick={() => void handleStart(task.id, task.goal)}>
                      {t('start')}
                    </button>
                  )}
                  {task.status === 'running' && (
                    <button className="btn-secondary text-[13px]" onClick={() => void handlePause(task.id)}>
                      {t('pause')}
                    </button>
                  )}
                  {task.status === 'paused' && (
                    <button className="btn-primary text-[13px]" onClick={() => void handleResume(task.id)}>
                      {t('resume')}
                    </button>
                  )}
                  {(task.status === 'pending' || task.status === 'running' || task.status === 'paused') && (
                    <button className="btn-secondary text-[13px] text-destructive hover:bg-destructive/10" onClick={() => void handleCancel(task.id)}>
                      {t('cancel')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {lastCompletedTask && (
        <div className="surface-card p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-2">Latest successful run</p>
              <p className="text-[14px] font-semibold text-foreground truncate">{lastCompletedTask.goal}</p>
              <p className="text-[12px] text-muted-foreground mt-1">
                Open the task detail to review the workflow or jump to Files to collect the output.
              </p>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary text-[13px]" onClick={() => onTaskSelect?.(lastCompletedTask.id)}>
                Open task
              </button>
              <button className="btn-primary text-[13px]" onClick={onOpenFiles}>
                Open output
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
