import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../i18n';
import { backend } from '../api';
import { useProgressStore } from '../stores/progressStore';

interface TasksListProps {
  className?: string;
  onTaskSelect?: (taskId: string) => void;
}

const STATUS_ORDER = ['all', 'running', 'pending', 'completed', 'failed', 'cancelled'] as const;

export function TasksList({ className = '', onTaskSelect }: TasksListProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_ORDER)[number]>('all');
  const [newTaskGoal, setNewTaskGoal] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const progressStore = useProgressStore();

  const loadTasks = async () => {
    try {
      const data = await backend.getTasks();
      setTasks(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = task.goal.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      running: tasks.filter((task) => task.status === 'running').length,
      pending: tasks.filter((task) => task.status === 'pending').length,
      completed: tasks.filter((task) => task.status === 'completed').length,
    };
  }, [tasks]);

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
    const current =
      typeof task.currentStep === 'number' ? task.currentStep : task.status === 'completed' ? total : 0;
    return Math.max(0, Math.min(100, Math.round((current / total) * 100)));
  };

  const handleStart = async (taskId: string, goal: string) => {
    try {
      progressStore.show(goal, 0, 3);
      await backend.runTask(taskId);
      await loadTasks();
      progressStore.setProgress({ progress: 33, currentStep: 1 });
      setTimeout(() => progressStore.hide(), 2000);
    } catch (e) {
      console.error(e);
      progressStore.hide();
    }
  };

  const handleCreateTask = async () => {
    const goal = newTaskGoal.trim();
    if (!goal) return;
    try {
      setCreating(true);
      const created = await backend.createTask(goal);
      setTasks((prev) => [created, ...prev]);
      setNewTaskGoal('');
      onTaskSelect?.(created.id);
    } catch (error) {
      console.error(error);
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
          <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground mb-3">{t('queue')}</p>
          <h1 className="text-[22px] font-semibold text-foreground">{t('tasks')}</h1>
          <p className="text-[13px] text-muted-foreground mt-3 max-w-2xl">
            {t('reviewActiveWork')}
          </p>
        </div>

        <div className="surface-card p-4 w-full xl:w-[520px]">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-semibold text-foreground">{t('createTask')}</p>
              <span className="text-[12px] text-muted-foreground">{t('highLeverage')}</span>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={newTaskGoal}
                onChange={(e) => setNewTaskGoal(e.target.value)}
                placeholder={t('describeIntendedOutcome')}
                className="input flex-1"
              />
              <button className="btn-primary whitespace-nowrap" disabled={creating || !newTaskGoal.trim()} onClick={handleCreateTask}>
                {creating ? t('loading') : t('newTask')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: `${t('total')} ${t('tasks')}`, value: stats.total },
          { label: t('running'), value: stats.running },
          { label: t('pending'), value: stats.pending },
          { label: t('completed'), value: stats.completed },
        ].map((item) => (
          <div key={item.label} className="surface-card p-4">
            <p className="text-[12px] text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-[22px] font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

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
            <div
              key={task.id}
              className="surface-card p-5 transition-colors hover:border-primary/20"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-medium ${getStatusColor(task.status)}`}>
                      {t(task.status)}
                    </span>
                    <span className="text-[12px] text-muted-foreground">#{task.id}</span>
                    <span className="text-[12px] text-muted-foreground">{(task.agentMode || 'multi_agent').replace('_', ' ')}</span>
                    <span className="text-[12px] text-muted-foreground">{(task.language || 'en').toUpperCase()}</span>
                  </div>
                  <button
                    onClick={() => onTaskSelect?.(task.id)}
                    className="text-left w-full"
                  >
                    <h3 className="text-[16px] font-semibold text-foreground truncate hover:text-primary transition-colors">
                      {task.goal}
                    </h3>
                  </button>
                  <div className="mt-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_180px] gap-4 items-center">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[12px] text-muted-foreground">{t('executionProgress')}</span>
                        <span className="text-[12px] font-medium text-foreground">
                          {task.currentStep ?? 0}/{task.totalSteps || 1} {t('steps')}
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${getProgressPercentage(task)}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-start lg:justify-end gap-2 text-[12px] text-muted-foreground">
                      <span>{t('created')} {new Date(task.createdAt || 0).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 xl:justify-end xl:max-w-[300px]">
                  <button className="btn-secondary text-[13px]" onClick={() => onTaskSelect?.(task.id)}>
                    {t('view')}
                  </button>
                  {task.status === 'pending' && (
                    <button className="btn-primary text-[13px]" onClick={() => handleStart(task.id, task.goal)}>
                      {t('start')}
                    </button>
                  )}
                  {task.status === 'running' && (
                    <button className="btn-secondary text-[13px]" onClick={() => handlePause(task.id)}>
                      {t('pause')}
                    </button>
                  )}
                  {task.status === 'paused' && (
                    <button className="btn-primary text-[13px]" onClick={() => handleResume(task.id)}>
                      {t('resume')}
                    </button>
                  )}
                  {(task.status === 'pending' || task.status === 'running' || task.status === 'paused') && (
                    <button className="btn-secondary text-[13px] text-destructive hover:bg-destructive/10" onClick={() => handleCancel(task.id)}>
                      {t('cancel')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
