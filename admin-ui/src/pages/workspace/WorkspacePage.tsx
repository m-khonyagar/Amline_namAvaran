import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { formatShamsiDate, formatShamsiDateTime } from '../../lib/persianDateTime';
import { parseGoogleShareUrl } from '../../lib/googleWorkspaceEmbed';
import type { TeamPresenceRow, WorkspaceFileRow, WorkspaceTask, WorkspaceTaskStatus } from '../../types/workspaceOrg';

const TASK_STATUS_LABEL: Record<WorkspaceTaskStatus, string> = {
  TODO: 'انجام نشده',
  DOING: 'در حال انجام',
  DONE: 'انجام شده',
  BLOCKED: 'مسدود',
};

const PRESENCE_LABEL: Record<TeamPresenceRow['status'], string> = {
  online: 'آنلاین',
  away: 'بیرون',
  busy: 'مشغول',
  offline: 'آفلاین',
};

const COLS: WorkspaceTaskStatus[] = ['TODO', 'DOING', 'DONE', 'BLOCKED'];

export default function WorkspacePage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('workspace:write');
  const [tab, setTab] = useState<'tasks' | 'team' | 'files'>('tasks');
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [fileTitle, setFileTitle] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [preview, setPreview] = useState<WorkspaceFileRow | null>(null);

  const { data: taskData } = useQuery({
    queryKey: ['workspace-tasks'],
    queryFn: async () => {
      const res = await apiClient.get<{ items: WorkspaceTask[] }>('/admin/workspace/tasks');
      return res.data.items;
    },
  });

  const { data: presenceData } = useQuery({
    queryKey: ['workspace-presence'],
    queryFn: async () => {
      const res = await apiClient.get<{ items: TeamPresenceRow[] }>('/admin/workspace/presence');
      return res.data.items;
    },
  });

  const { data: fileData } = useQuery({
    queryKey: ['workspace-files'],
    queryFn: async () => {
      const res = await apiClient.get<{ items: WorkspaceFileRow[] }>('/admin/workspace/files');
      return res.data.items;
    },
  });

  const createTask = useMutation({
    mutationFn: async () => {
      await apiClient.post('/admin/workspace/tasks', {
        title: newTitle,
        assignee_name: newAssignee || undefined,
      });
    },
    onSuccess: () => {
      toast.success('تسک اضافه شد');
      setNewTitle('');
      setNewAssignee('');
      qc.invalidateQueries({ queryKey: ['workspace-tasks'] });
    },
    onError: () => toast.error('خطا در ثبت تسک'),
  });

  const patchTask = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: WorkspaceTaskStatus }) => {
      await apiClient.patch(`/admin/workspace/tasks/${id}`, { status });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace-tasks'] }),
  });

  const addFile = useMutation({
    mutationFn: async () => {
      const parsed = parseGoogleShareUrl(fileUrl);
      const body: {
        title: string;
        kind: WorkspaceFileRow['kind'];
        url: string | null;
        embed_url: string | null;
      } = {
        title: fileTitle,
        kind: 'upload',
        url: fileUrl.trim() || null,
        embed_url: null,
      };
      if (parsed) {
        body.kind = parsed.kind === 'document' ? 'gdoc' : 'gsheet';
        body.url = fileUrl.trim();
        body.embed_url = parsed.embedUrl;
      }
      await apiClient.post('/admin/workspace/files', body);
    },
    onSuccess: () => {
      toast.success('مورد افزوده شد');
      setFileTitle('');
      setFileUrl('');
      qc.invalidateQueries({ queryKey: ['workspace-files'] });
    },
    onError: () => toast.error('خطا در ثبت'),
  });

  const deleteFile = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/admin/workspace/files/${id}`);
    },
    onSuccess: () => {
      toast.success('حذف شد');
      setPreview(null);
      qc.invalidateQueries({ queryKey: ['workspace-files'] });
    },
  });

  const byStatus = useMemo(() => {
    const m: Record<WorkspaceTaskStatus, WorkspaceTask[]> = {
      TODO: [],
      DOING: [],
      DONE: [],
      BLOCKED: [],
    };
    for (const t of taskData ?? []) {
      m[t.status].push(t);
    }
    return m;
  }, [taskData]);

  return (
    <div dir="rtl" className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">فضای کاری سازمانی</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-600 dark:text-slate-400">
          الهام از ابزارهایی مثل تسکیپ (تسک، کانبان، مهلت) و میزیتو (حضور تیم، اشتراک فایل و همکاری). اتصال
          Google Docs/Sheet با لینک اشتراک‌گذاری؛ برای نمایش در قاب، دسترسی «بازدیدکننده با لینک» را باز کنید.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2 dark:border-slate-700">
        {(
          [
            ['tasks', 'تسک و کانبان'],
            ['team', 'حضور تیم'],
            ['files', 'فایل و گوگل'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === k
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'tasks' && (
        <div className="space-y-6">
          {canWrite ? (
            <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <input
                placeholder="عنوان تسک…"
                className="input min-w-[200px] flex-1"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <input
                placeholder="مسئول (نام)"
                className="input w-40"
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
              />
              <button
                type="button"
                disabled={createTask.isPending}
                onClick={() => createTask.mutate()}
                className="btn btn-primary"
              >
                افزودن
              </button>
            </div>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-3">
            {COLS.map((col) => (
              <div key={col} className="rounded-xl border border-gray-200 bg-gray-50/80 dark:border-slate-700 dark:bg-slate-900/50">
                <div className="border-b border-gray-200 px-3 py-2 text-sm font-semibold dark:border-slate-700">
                  {TASK_STATUS_LABEL[col]}
                </div>
                <div className="space-y-2 p-2">
                  {byStatus[col].map((t) => (
                    <div
                      key={t.id}
                      className="rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-sm dark:border-slate-600 dark:bg-slate-900"
                    >
                      <p className="font-medium">{t.title}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{t.assignee_name}</p>
                      {t.due_at ? (
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                          سررسید: {formatShamsiDateTime(t.due_at)}
                        </p>
                      ) : null}
                      {canWrite ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {COLS.filter((c) => c !== t.status).map((s) => (
                            <button
                              key={s}
                              type="button"
                              className="rounded bg-slate-200 px-2 py-0.5 text-xs dark:bg-slate-700"
                              onClick={() => patchTask.mutate({ id: t.id, status: s })}
                            >
                              ← {TASK_STATUS_LABEL[s]}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'team' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(presenceData ?? []).map((p) => (
            <div
              key={p.user_id}
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="font-medium">{p.full_name}</div>
              <div className="mt-1 text-sm text-gray-600 dark:text-slate-400">{PRESENCE_LABEL[p.status]}</div>
              <div className="mt-2 text-xs text-gray-500">
                آخرین فعالیت: {formatShamsiDateTime(p.last_seen_at)}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'files' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {canWrite ? (
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-2 font-semibold">افزودن لینک یا فایل ابری</h3>
                <p className="mb-3 text-xs text-gray-500 dark:text-slate-400">
                  لینک Google Doc یا Google Sheet را جایگذاری کنید؛ سیستم پیش‌نمایش embed می‌سازد.
                </p>
                <input
                  className="input mb-2"
                  placeholder="عنوان"
                  value={fileTitle}
                  onChange={(e) => setFileTitle(e.target.value)}
                />
                <input
                  className="input mb-2 font-mono text-xs"
                  dir="ltr"
                  placeholder="https://docs.google.com/document/... یا sheets/..."
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                />
                <button
                  type="button"
                  disabled={addFile.isPending}
                  onClick={() => addFile.mutate()}
                  className="btn btn-primary"
                >
                  ثبت
                </button>
              </div>
            ) : null}
            <ul className="space-y-2">
              {(fileData ?? []).map((f) => {
                const embed = f.embed_url ?? (f.url ? parseGoogleShareUrl(f.url)?.embedUrl : null);
                return (
                  <li
                    key={f.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-900"
                  >
                    <div>
                      <div className="font-medium">{f.title}</div>
                      <div className="text-xs text-gray-500">
                        {f.kind === 'gdoc' ? 'Google Doc' : f.kind === 'gsheet' ? 'Google Sheet' : 'لینک'} ·{' '}
                        {formatShamsiDate(f.created_at)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {embed ? (
                        <button type="button" className="text-sm text-blue-600" onClick={() => setPreview({ ...f, embed_url: embed })}>
                          پیش‌نمایش
                        </button>
                      ) : null}
                      {f.url ? (
                        <a href={f.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600">
                          باز کردن
                        </a>
                      ) : null}
                      {canWrite ? (
                        <button
                          type="button"
                          className="text-sm text-red-600"
                          onClick={() => deleteFile.mutate(f.id)}
                        >
                          حذف
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="min-h-[420px] rounded-xl border border-gray-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
            {preview?.embed_url ? (
              <iframe
                title={preview.title}
                src={preview.embed_url}
                className="h-[min(70vh,560px)] w-full rounded-xl"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            ) : (
              <div className="flex h-64 items-center justify-center p-4 text-center text-sm text-gray-500">
                یک سند را برای پیش‌نمایش انتخاب کنید. اگر صفحه خالی ماند، اشتراک‌گذاری لینک در گوگل را برای
                «هر کس با لینک — Viewer» تنظیم کنید.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
