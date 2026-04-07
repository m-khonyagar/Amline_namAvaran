import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import {
  getPlaneConfig,
  savePlaneConfig,
  isPlaneConfigured,
  fetchWorkspaces,
  fetchProjects,
  fetchStates,
  fetchIssues,
  fetchMembers,
  fetchCycles,
  createIssue,
  updateIssue,
  DEFAULT_PLANE_BASE_URL,
} from '../../lib/planeApi';
import {
  PLANE_PRIORITY_LABEL,
  PLANE_PRIORITY_COLOR,
  PLANE_STATE_GROUP_LABEL,
  PLANE_ROLE_LABEL,
  type PlaneConfig,
  type PlaneIssuePriority,
  type PlaneState,
  type PlaneMember,
  type PlaneCycle,
} from '../../types/plane';
import { formatShamsiDate } from '../../lib/persianDateTime';
import { cn } from '../../lib/cn';

type TabKey = 'projects' | 'issues' | 'cycles' | 'members' | 'settings';

const PRIORITY_OPTIONS: PlaneIssuePriority[] = ['urgent', 'high', 'medium', 'low', 'none'];

const STATE_GROUP_ORDER: PlaneState['group'][] = [
  'backlog',
  'unstarted',
  'started',
  'completed',
  'cancelled',
];

function ConnectionBanner({ configured }: { configured: boolean }) {
  if (configured) return null;
  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200">
      <strong>پیکربندی Plane.so کامل نیست.</strong> لطفاً از تب «تنظیمات» کلید API و نام workspace را
      وارد کنید.
    </div>
  );
}

export default function PlanePage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('plane:write');
  const qc = useQueryClient();

  // ---- Config state ----
  const [cfg, setCfg] = useState<PlaneConfig>(() => getPlaneConfig());
  const [draftCfg, setDraftCfg] = useState<PlaneConfig>(() => getPlaneConfig());
  const configured = isPlaneConfigured(cfg);

  // ---- UI state ----
  const [tab, setTab] = useState<TabKey>('projects');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // ---- Issue creation state ----
  const [newIssueName, setNewIssueName] = useState('');
  const [newIssuePriority, setNewIssuePriority] = useState<PlaneIssuePriority>('medium');
  const [newIssueStateId, setNewIssueStateId] = useState<string>('');

  // ---- Queries ----
  const { data: projects, isLoading: loadingProjects, error: projectsError } = useQuery({
    queryKey: ['plane-projects', cfg.baseUrl, cfg.workspaceSlug],
    queryFn: () => fetchProjects(cfg),
    enabled: configured,
    retry: 1,
  });

  const selectedProject = projects?.find((p) => p.id === selectedProjectId) ?? projects?.[0] ?? null;
  const effectiveProjectId = selectedProjectId ?? selectedProject?.id ?? null;

  const { data: states } = useQuery({
    queryKey: ['plane-states', cfg.baseUrl, cfg.workspaceSlug, effectiveProjectId],
    queryFn: () => fetchStates(cfg, effectiveProjectId!),
    enabled: configured && !!effectiveProjectId,
  });

  const { data: issues, isLoading: loadingIssues } = useQuery({
    queryKey: ['plane-issues', cfg.baseUrl, cfg.workspaceSlug, effectiveProjectId],
    queryFn: () => fetchIssues(cfg, effectiveProjectId!),
    enabled: configured && !!effectiveProjectId && tab === 'issues',
  });

  const { data: members, isLoading: loadingMembers } = useQuery({
    queryKey: ['plane-members', cfg.baseUrl, cfg.workspaceSlug],
    queryFn: () => fetchMembers(cfg),
    enabled: configured && tab === 'members',
  });

  const { data: cycles, isLoading: loadingCycles } = useQuery({
    queryKey: ['plane-cycles', cfg.baseUrl, cfg.workspaceSlug, effectiveProjectId],
    queryFn: () => fetchCycles(cfg, effectiveProjectId!),
    enabled: configured && !!effectiveProjectId && tab === 'cycles',
  });

  // ---- Test connection query (manual trigger) ----
  const {
    refetch: testConnection,
    isFetching: testing,
    error: testError,
    data: workspaces,
  } = useQuery({
    queryKey: ['plane-workspaces-test', draftCfg.baseUrl, draftCfg.apiKey],
    queryFn: () => fetchWorkspaces(draftCfg),
    enabled: false,
    retry: 0,
  });

  // ---- Mutations ----
  const createIssueMutation = useMutation({
    mutationFn: () =>
      createIssue(cfg, effectiveProjectId!, {
        name: newIssueName,
        priority: newIssuePriority,
        state: newIssueStateId || undefined,
      }),
    onSuccess: () => {
      toast.success('تسک جدید اضافه شد');
      setNewIssueName('');
      qc.invalidateQueries({ queryKey: ['plane-issues'] });
    },
    onError: () => toast.error('خطا در ایجاد تسک'),
  });

  const updateIssueMutation = useMutation({
    mutationFn: (vars: { issueId: string; stateId: string }) =>
      updateIssue(cfg, effectiveProjectId!, vars.issueId, { state: vars.stateId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plane-issues'] }),
    onError: () => toast.error('خطا در بروزرسانی وضعیت'),
  });

  // ---- Derived: issues by state group ----
  const issuesByState = useMemo(() => {
    const m: Record<string, typeof issues> = {};
    for (const s of states ?? []) m[s.id] = [];
    for (const issue of issues ?? []) {
      if (!m[issue.state]) m[issue.state] = [];
      m[issue.state]!.push(issue);
    }
    return m;
  }, [issues, states]);

  // ---- Handlers ----
  function handleSaveConfig() {
    savePlaneConfig(draftCfg);
    setCfg({ ...draftCfg });
    qc.invalidateQueries({ queryKey: ['plane-projects'] });
    qc.invalidateQueries({ queryKey: ['plane-members'] });
    toast.success('تنظیمات Plane.so ذخیره شد');
  }

  // ---- Render helpers ----
  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'projects', label: 'پروژه‌ها', icon: '📁' },
    { key: 'issues', label: 'تسک‌ها (کانبان)', icon: '🗂️' },
    { key: 'cycles', label: 'اسپرینت‌ها', icon: '🔄' },
    { key: 'members', label: 'اعضا', icon: '👥' },
    { key: 'settings', label: 'تنظیمات', icon: '⚙️' },
  ];

  return (
    <div dir="rtl" className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-slate-100">
            <span>✈️</span>
            <span>مدیریت تسک — Plane.so</span>
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
            اتصال کامل به فضای کاری Plane برای مدیریت پروژه، تسک، اسپرینت و اعضای تیم
          </p>
        </div>
        {configured && (
          <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            متصل
          </span>
        )}
      </div>

      <ConnectionBanner configured={configured} />

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-0 dark:border-slate-700">
        {tabs.map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors',
              tab === key
                ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100'
            )}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ====== PROJECTS TAB ====== */}
      {tab === 'projects' && (
        <div>
          {loadingProjects && <LoadingSpinner label="در حال بارگذاری پروژه‌ها…" />}
          {projectsError && (
            <ErrorBox message="خطا در دریافت پروژه‌ها. مطمئن شوید پیکربندی Plane صحیح است و CORS مشکلی ندارد." />
          )}
          {!loadingProjects && !projectsError && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(projects ?? []).map((proj) => (
                <div
                  key={proj.id}
                  className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500"
                  onClick={() => {
                    setSelectedProjectId(proj.id);
                    setTab('issues');
                  }}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-2xl">{proj.emoji ?? '📋'}</span>
                    <div>
                      <h2 className="font-semibold text-gray-900 dark:text-slate-100">{proj.name}</h2>
                      <span className="text-xs text-gray-500 dark:text-slate-500">
                        {proj.identifier}
                      </span>
                    </div>
                  </div>
                  {proj.description && (
                    <p className="mb-3 text-sm text-gray-600 dark:text-slate-400 line-clamp-2">
                      {proj.description}
                    </p>
                  )}
                  <div className="flex gap-4 text-xs text-gray-500 dark:text-slate-500">
                    <span>🗂️ {proj.total_issues} تسک</span>
                    <span>👥 {proj.total_members} عضو</span>
                  </div>
                  <div className="mt-3 text-xs font-medium text-blue-600 opacity-0 transition group-hover:opacity-100 dark:text-blue-400">
                    مشاهده تسک‌ها ←
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loadingProjects && !projectsError && (projects ?? []).length === 0 && (
            <EmptyState label="هنوز پروژه‌ای در workspace شما وجود ندارد." />
          )}
        </div>
      )}

      {/* ====== ISSUES / KANBAN TAB ====== */}
      {tab === 'issues' && (
        <div className="space-y-5">
          {/* Project selector */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">پروژه:</label>
            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              value={effectiveProjectId ?? ''}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              {(projects ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.emoji ?? '📋'} {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* New issue form */}
          {canWrite && effectiveProjectId && (
            <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <input
                className="input min-w-[240px] flex-1"
                placeholder="عنوان تسک جدید…"
                value={newIssueName}
                onChange={(e) => setNewIssueName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newIssueName.trim()) createIssueMutation.mutate();
                }}
              />
              <select
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                value={newIssuePriority}
                onChange={(e) => setNewIssuePriority(e.target.value as PlaneIssuePriority)}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {PLANE_PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
              {states && states.length > 0 && (
                <select
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  value={newIssueStateId}
                  onChange={(e) => setNewIssueStateId(e.target.value)}
                >
                  <option value="">وضعیت اولیه</option>
                  {states.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                disabled={createIssueMutation.isPending || !newIssueName.trim()}
                onClick={() => createIssueMutation.mutate()}
                className="btn btn-primary"
              >
                + افزودن
              </button>
            </div>
          )}

          {loadingIssues && <LoadingSpinner label="در حال بارگذاری تسک‌ها…" />}

          {/* Kanban board */}
          {!loadingIssues && states && (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {[...states]
                .sort(
                  (a, b) =>
                    STATE_GROUP_ORDER.indexOf(a.group) - STATE_GROUP_ORDER.indexOf(b.group) ||
                    a.sequence - b.sequence
                )
                .map((state) => {
                  const col = issuesByState[state.id] ?? [];
                  return (
                    <div
                      key={state.id}
                      className="min-w-[260px] max-w-[300px] flex-shrink-0 rounded-xl border border-gray-200 bg-gray-50/80 dark:border-slate-700 dark:bg-slate-900/50"
                    >
                      <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2.5 dark:border-slate-700">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: state.color }}
                        />
                        <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                          {state.name}
                        </span>
                        <span className="mr-auto rounded-full bg-gray-200 px-2 py-0.5 text-xs dark:bg-slate-700 dark:text-slate-400">
                          {col.length}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-slate-600">
                          {PLANE_STATE_GROUP_LABEL[state.group]}
                        </span>
                      </div>
                      <div className="space-y-2 p-2">
                        {col.map((issue) => (
                          <div
                            key={issue.id}
                            className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-600 dark:bg-slate-900"
                          >
                            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                              {issue.name}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                              <span className={cn('font-medium', PLANE_PRIORITY_COLOR[issue.priority])}>
                                ● {PLANE_PRIORITY_LABEL[issue.priority]}
                              </span>
                              {issue.due_date && (
                                <span className="text-amber-600 dark:text-amber-400">
                                  📅 {formatShamsiDate(issue.due_date)}
                                </span>
                              )}
                            </div>
                            {/* Move to state buttons */}
                            {canWrite && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {states
                                  .filter((s) => s.id !== state.id)
                                  .slice(0, 3)
                                  .map((s) => (
                                    <button
                                      key={s.id}
                                      type="button"
                                      disabled={updateIssueMutation.isPending}
                                      className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                                      onClick={() =>
                                        updateIssueMutation.mutate({
                                          issueId: issue.id,
                                          stateId: s.id,
                                        })
                                      }
                                    >
                                      ← {s.name}
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>
                        ))}
                        {col.length === 0 && (
                          <p className="py-4 text-center text-xs text-gray-400 dark:text-slate-600">
                            خالی
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ====== CYCLES / SPRINTS TAB ====== */}
      {tab === 'cycles' && (
        <div className="space-y-4">
          {/* Project selector */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">پروژه:</label>
            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              value={effectiveProjectId ?? ''}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              {(projects ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.emoji ?? '📋'} {p.name}
                </option>
              ))}
            </select>
          </div>

          {loadingCycles && <LoadingSpinner label="در حال بارگذاری اسپرینت‌ها…" />}

          {!loadingCycles && (cycles ?? []).length === 0 && (
            <EmptyState label="اسپرینتی برای این پروژه تعریف نشده است." />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {(cycles ?? []).map((cycle) => {
              const total = cycle.total_issues || 1;
              const completedPct = Math.round((cycle.completed_issues / total) * 100);
              return (
                <div
                  key={cycle.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100">{cycle.name}</h3>
                    <CycleStatusBadge status={cycle.status} />
                  </div>
                  {cycle.description && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                      {cycle.description}
                    </p>
                  )}
                  <div className="mt-3 flex gap-4 text-xs text-gray-500 dark:text-slate-500">
                    {cycle.start_date && (
                      <span>شروع: {formatShamsiDate(cycle.start_date)}</span>
                    )}
                    {cycle.end_date && (
                      <span>پایان: {formatShamsiDate(cycle.end_date)}</span>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-slate-500">
                      <span>
                        {cycle.completed_issues}/{cycle.total_issues} تسک انجام‌شده
                      </span>
                      <span>{completedPct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                      <div
                        className="h-2 rounded-full bg-blue-500 transition-all"
                        style={{ width: `${completedPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-blue-50 py-1.5 dark:bg-blue-950/40">
                      <div className="font-bold text-blue-600 dark:text-blue-400">
                        {cycle.started_issues}
                      </div>
                      <div className="text-gray-500">فعال</div>
                    </div>
                    <div className="rounded-lg bg-amber-50 py-1.5 dark:bg-amber-950/40">
                      <div className="font-bold text-amber-600 dark:text-amber-400">
                        {cycle.unstarted_issues + cycle.backlog_issues}
                      </div>
                      <div className="text-gray-500">باقی‌مانده</div>
                    </div>
                    <div className="rounded-lg bg-red-50 py-1.5 dark:bg-red-950/40">
                      <div className="font-bold text-red-500 dark:text-red-400">
                        {cycle.cancelled_issues}
                      </div>
                      <div className="text-gray-500">لغو‌شده</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ====== MEMBERS TAB ====== */}
      {tab === 'members' && (
        <div>
          {loadingMembers && <LoadingSpinner label="در حال بارگذاری اعضا…" />}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(members ?? []).map((row) => {
              const m = row.member;
              const initials = getMemberInitials(m);
              return (
                <div
                  key={row.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-gray-900 dark:text-slate-100">
                      {m.display_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">{m.email}</div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {PLANE_ROLE_LABEL[row.role] ?? 'عضو'}
                  </span>
                </div>
              );
            })}
          </div>
          {!loadingMembers && (members ?? []).length === 0 && (
            <EmptyState label="عضوی در workspace پیدا نشد." />
          )}
        </div>
      )}

      {/* ====== SETTINGS TAB ====== */}
      {tab === 'settings' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-slate-100">
              اتصال به Plane.so
            </h2>
            <p className="mb-4 text-sm text-gray-500 dark:text-slate-400">
              برای دریافت API Key به{' '}
              <a
                href="https://app.plane.so/profile/api-tokens/"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline dark:text-blue-400"
              >
                پروفایل Plane
              </a>{' '}
              بروید. کلیدهای env (VITE_PLANE_API_KEY و VITE_PLANE_WORKSPACE_SLUG) اولویت دارند و
              قابل ویرایش از اینجا نیستند.
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  آدرس Plane (Base URL)
                </label>
                <input
                  dir="ltr"
                  className="input font-mono text-sm"
                  placeholder={DEFAULT_PLANE_BASE_URL}
                  value={draftCfg.baseUrl}
                  onChange={(e) => setDraftCfg((p) => ({ ...p, baseUrl: e.target.value }))}
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                  برای نسخهٔ self-hosted، آدرس سرور خود را وارد کنید.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  API Key
                </label>
                <input
                  dir="ltr"
                  type="password"
                  className="input font-mono text-sm"
                  placeholder="plane_api_…"
                  value={draftCfg.apiKey}
                  onChange={(e) => setDraftCfg((p) => ({ ...p, apiKey: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Workspace Slug
                </label>
                <input
                  dir="ltr"
                  className="input font-mono text-sm"
                  placeholder="my-workspace"
                  value={draftCfg.workspaceSlug}
                  onChange={(e) => setDraftCfg((p) => ({ ...p, workspaceSlug: e.target.value }))}
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveConfig}
                  disabled={!draftCfg.apiKey || !draftCfg.workspaceSlug}
                >
                  ذخیرهٔ تنظیمات
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm transition hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-800"
                  onClick={() => testConnection()}
                  disabled={testing || !draftCfg.apiKey}
                >
                  {testing ? 'در حال تست…' : '🔌 تست اتصال'}
                </button>
              </div>

              {testError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
                  ❌ اتصال ناموفق. لطفاً API Key و آدرس را بررسی کنید. اگر از مرورگر مستقیم API
                  می‌زنید، ممکن است CORS مانع شود.
                </div>
              )}

              {workspaces && !testError && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/50 dark:text-green-300">
                  ✅ اتصال موفق — workspace‌ها:{' '}
                  {workspaces.map((w) => w.name).join('، ')}
                </div>
              )}
            </div>
          </div>

          {/* Env vars hint */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm dark:border-blue-800 dark:bg-blue-950/40">
            <h3 className="mb-2 font-semibold text-blue-800 dark:text-blue-300">
              پیکربندی از طریق Environment Variables
            </h3>
            <pre
              dir="ltr"
              className="overflow-x-auto rounded-lg bg-white p-3 text-xs text-gray-700 dark:bg-slate-900 dark:text-slate-300"
            >
              {`VITE_FLAG_PLANE_INTEGRATION=true
VITE_PLANE_BASE_URL=https://api.plane.so
VITE_PLANE_API_KEY=plane_api_your_key_here
VITE_PLANE_WORKSPACE_SLUG=your-workspace-slug`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Sub-components ----

function LoadingSpinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-10 text-sm text-gray-500 dark:text-slate-400">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      {label}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-12 text-center text-sm text-gray-400 dark:text-slate-600">{label}</div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
      ❌ {message}
    </div>
  );
}

function getMemberInitials(member: PlaneMember['member']): string {
  const fromName = ((member.first_name?.[0] ?? '') + (member.last_name?.[0] ?? '')).toUpperCase();
  return fromName || member.display_name?.[0]?.toUpperCase() || '?';
}

function CycleStatusBadge({ status }: { status: PlaneCycle['status'] }) {
  const map: Record<PlaneCycle['status'], { label: string; class: string }> = {
    draft: {
      label: 'پیش‌نویس',
      class: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400',
    },
    started: {
      label: 'شروع‌شده',
      class: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
    },
    in_progress: {
      label: 'فعال',
      class: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300',
    },
    completed: {
      label: 'تکمیل‌شده',
      class: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300',
    },
  };
  const cfg = map[status];
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', cfg.class)}>
      {cfg.label}
    </span>
  );
}
