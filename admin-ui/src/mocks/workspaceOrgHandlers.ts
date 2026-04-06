import { http, HttpResponse } from 'msw';
import type { TeamPresenceRow, WorkspaceFileRow, WorkspaceTask } from '../types/workspaceOrg';

const tasks: WorkspaceTask[] = [
  {
    id: 'wt-1',
    title: 'پیگیری قراردادهای در انتظار تأیید ادمین',
    assignee_name: 'کاربر آزمایشی',
    status: 'DOING',
    due_at: new Date(Date.now() + 86400000 * 2).toISOString(),
    created_at: new Date().toISOString(),
    priority: 'high',
  },
  {
    id: 'wt-2',
    title: 'به‌روزرسانی لیست لیدهای CRM',
    assignee_name: 'پشتیبانی',
    status: 'TODO',
    due_at: null,
    created_at: new Date().toISOString(),
    priority: 'medium',
  },
];

const presence: TeamPresenceRow[] = [
  {
    user_id: 'mock-001',
    full_name: 'کاربر آزمایشی',
    status: 'online',
    last_seen_at: new Date().toISOString(),
  },
  {
    user_id: 'user-002',
    full_name: 'کارشناس حقوقی',
    status: 'busy',
    last_seen_at: new Date().toISOString(),
  },
  {
    user_id: 'guest-1',
    full_name: 'مهمان پروژه',
    status: 'away',
    last_seen_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

const files: WorkspaceFileRow[] = [
  {
    id: 'wf-1',
    title: 'نمونه — سند گوگل را از تب «فایل و گوگل» اضافه کنید',
    kind: 'upload',
    url: null,
    embed_url: null,
    created_at: new Date().toISOString(),
    created_by: 'سیستم',
  },
];

export function workspaceOrgHandlers() {
  return [
    http.get('*/admin/workspace/tasks', () =>
      HttpResponse.json({ items: [...tasks], total: tasks.length })
    ),
    http.post('*/admin/workspace/tasks', async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as {
        title?: string;
        assignee_name?: string;
        due_at?: string | null;
        priority?: WorkspaceTask['priority'];
      };
      if (!body.title?.trim()) {
        return HttpResponse.json({ detail: 'title_required' }, { status: 422 });
      }
      const row: WorkspaceTask = {
        id: `wt-${Date.now()}`,
        title: body.title.trim(),
        assignee_name: body.assignee_name?.trim() || 'تعیین‌نشده',
        status: 'TODO',
        due_at: body.due_at ?? null,
        created_at: new Date().toISOString(),
        priority: body.priority ?? 'medium',
      };
      tasks.unshift(row);
      return HttpResponse.json(row, { status: 201 });
    }),
    http.patch('*/admin/workspace/tasks/:taskId', async ({ params, request }) => {
      const id = params.taskId as string;
      const body = (await request.json().catch(() => ({}))) as Partial<
        Pick<WorkspaceTask, 'status' | 'title' | 'assignee_name' | 'due_at' | 'priority'>
      >;
      const t = tasks.find((x) => x.id === id);
      if (!t) return HttpResponse.json({ detail: 'not_found' }, { status: 404 });
      Object.assign(t, body);
      return HttpResponse.json(t);
    }),
    http.get('*/admin/workspace/presence', () =>
      HttpResponse.json({ items: [...presence], total: presence.length })
    ),
    http.get('*/admin/workspace/files', () =>
      HttpResponse.json({ items: [...files], total: files.length })
    ),
    http.post('*/admin/workspace/files', async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as {
        title?: string;
        kind?: WorkspaceFileRow['kind'];
        url?: string | null;
        embed_url?: string | null;
        created_by?: string;
      };
      if (!body.title?.trim()) {
        return HttpResponse.json({ detail: 'title_required' }, { status: 422 });
      }
      const row: WorkspaceFileRow = {
        id: `wf-${Date.now()}`,
        title: body.title.trim(),
        kind: body.kind ?? 'upload',
        url: body.url ?? null,
        embed_url: body.embed_url ?? null,
        created_at: new Date().toISOString(),
        created_by: body.created_by?.trim() || 'شما',
      };
      files.unshift(row);
      return HttpResponse.json(row, { status: 201 });
    }),
    http.delete('*/admin/workspace/files/:fileId', ({ params }) => {
      const id = params.fileId as string;
      const idx = files.findIndex((f) => f.id === id);
      if (idx < 0) return HttpResponse.json({ detail: 'not_found' }, { status: 404 });
      files.splice(idx, 1);
      return HttpResponse.json({ ok: true });
    }),
  ];
}
