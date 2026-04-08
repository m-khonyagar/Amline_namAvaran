import { http, HttpResponse } from 'msw';
import type {
  PlaneWorkspace,
  PlaneProject,
  PlaneState,
  PlaneIssue,
  PlaneMember,
  PlaneCycle,
} from '../types/plane';

// ---- داده‌های نمونه ----

const WORKSPACE_SLUG = 'amline';

const mockWorkspace: PlaneWorkspace = {
  id: 'ws-amline-1',
  name: 'اَملاین',
  slug: WORKSPACE_SLUG,
  logo: null,
  created_at: new Date('2024-01-01').toISOString(),
};

const mockProjects: PlaneProject[] = [
  {
    id: 'proj-1',
    name: 'پنل ادمین',
    identifier: 'ADMIN',
    description: 'توسعه و نگهداری پنل مدیریت',
    network: 2,
    is_member: true,
    total_members: 4,
    total_issues: 12,
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date().toISOString(),
    emoji: '🏠',
    icon_prop: null,
  },
  {
    id: 'proj-2',
    name: 'CRM و فروش',
    identifier: 'CRM',
    description: 'مدیریت ارتباط با مشتری و لیدها',
    network: 2,
    is_member: true,
    total_members: 3,
    total_issues: 8,
    created_at: new Date('2024-03-01').toISOString(),
    updated_at: new Date().toISOString(),
    emoji: '📊',
    icon_prop: null,
  },
  {
    id: 'proj-3',
    name: 'یکپارچه‌سازی',
    identifier: 'INT',
    description: 'ادغام سرویس‌های خارجی',
    network: 2,
    is_member: true,
    total_members: 2,
    total_issues: 5,
    created_at: new Date('2024-04-01').toISOString(),
    updated_at: new Date().toISOString(),
    emoji: '🔗',
    icon_prop: null,
  },
];

const statesByProject: Record<string, PlaneState[]> = {
  'proj-1': [
    { id: 's1-todo', name: 'انجام‌نشده', color: '#94a3b8', group: 'backlog', sequence: 10000 },
    { id: 's1-doing', name: 'در حال انجام', color: '#3b82f6', group: 'started', sequence: 20000 },
    { id: 's1-review', name: 'بررسی', color: '#f59e0b', group: 'started', sequence: 30000 },
    { id: 's1-done', name: 'انجام‌شده', color: '#22c55e', group: 'completed', sequence: 40000 },
  ],
  'proj-2': [
    { id: 's2-backlog', name: 'بک‌لاگ', color: '#94a3b8', group: 'backlog', sequence: 10000 },
    { id: 's2-doing', name: 'فعال', color: '#3b82f6', group: 'started', sequence: 20000 },
    { id: 's2-done', name: 'بسته‌شده', color: '#22c55e', group: 'completed', sequence: 30000 },
  ],
  'proj-3': [
    { id: 's3-todo', name: 'انجام‌نشده', color: '#94a3b8', group: 'backlog', sequence: 10000 },
    { id: 's3-doing', name: 'در حال انجام', color: '#3b82f6', group: 'started', sequence: 20000 },
    { id: 's3-done', name: 'انجام‌شده', color: '#22c55e', group: 'completed', sequence: 40000 },
  ],
};

const issuesByProject: Record<string, PlaneIssue[]> = {
  'proj-1': [
    {
      id: 'i1-1',
      name: 'یکپارچه‌سازی Plane.so با پنل ادمین',
      description_html: null,
      priority: 'high',
      state: 's1-doing',
      assignees: ['mem-1'],
      due_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sequence_id: 1,
      label_ids: [],
      completed_at: null,
      started_at: new Date().toISOString(),
    },
    {
      id: 'i1-2',
      name: 'بهبود تجربهٔ کاربری صفحهٔ داشبورد',
      description_html: null,
      priority: 'medium',
      state: 's1-todo',
      assignees: ['mem-2'],
      due_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sequence_id: 2,
      label_ids: [],
      completed_at: null,
      started_at: null,
    },
    {
      id: 'i1-3',
      name: 'رفع خطای وارد کردن کد ملی',
      description_html: null,
      priority: 'urgent',
      state: 's1-review',
      assignees: ['mem-1', 'mem-3'],
      due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sequence_id: 3,
      label_ids: [],
      completed_at: null,
      started_at: new Date().toISOString(),
    },
    {
      id: 'i1-4',
      name: 'به‌روزرسانی مستندات API',
      description_html: null,
      priority: 'low',
      state: 's1-done',
      assignees: ['mem-2'],
      due_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sequence_id: 4,
      label_ids: [],
      completed_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
    },
  ],
  'proj-2': [
    {
      id: 'i2-1',
      name: 'اضافه کردن فیلتر تاریخ به لیست لیدها',
      description_html: null,
      priority: 'high',
      state: 's2-doing',
      assignees: ['mem-3'],
      due_date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sequence_id: 1,
      label_ids: [],
      completed_at: null,
      started_at: new Date().toISOString(),
    },
    {
      id: 'i2-2',
      name: 'گزارش ماهانهٔ تبدیل لید به مشتری',
      description_html: null,
      priority: 'medium',
      state: 's2-backlog',
      assignees: [],
      due_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sequence_id: 2,
      label_ids: [],
      completed_at: null,
      started_at: null,
    },
  ],
  'proj-3': [
    {
      id: 'i3-1',
      name: 'ادغام سرویس SMS',
      description_html: null,
      priority: 'high',
      state: 's3-doing',
      assignees: ['mem-1'],
      due_date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sequence_id: 1,
      label_ids: [],
      completed_at: null,
      started_at: new Date().toISOString(),
    },
  ],
};

const mockMembers: PlaneMember[] = [
  {
    id: 'memrow-1',
    member: {
      id: 'mem-1',
      display_name: 'کاربر آزمایشی',
      avatar: null,
      email: 'admin@amline.ir',
      first_name: 'کاربر',
      last_name: 'آزمایشی',
    },
    role: 20,
    created_at: new Date('2024-01-01').toISOString(),
  },
  {
    id: 'memrow-2',
    member: {
      id: 'mem-2',
      display_name: 'کارشناس حقوقی',
      avatar: null,
      email: 'legal@amline.ir',
      first_name: 'کارشناس',
      last_name: 'حقوقی',
    },
    role: 15,
    created_at: new Date('2024-01-05').toISOString(),
  },
  {
    id: 'memrow-3',
    member: {
      id: 'mem-3',
      display_name: 'پشتیبانی',
      avatar: null,
      email: 'support@amline.ir',
      first_name: 'تیم',
      last_name: 'پشتیبانی',
    },
    role: 15,
    created_at: new Date('2024-01-10').toISOString(),
  },
];

const cyclesByProject: Record<string, PlaneCycle[]> = {
  'proj-1': [
    {
      id: 'cyc-1',
      name: 'اسپرینت ۱ — اردیبهشت ۱۴۰۴',
      description: 'یکپارچه‌سازی ابزارهای سازمانی',
      status: 'in_progress',
      start_date: new Date(Date.now() - 86400000 * 7).toISOString().split('T')[0],
      end_date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      total_issues: 4,
      completed_issues: 1,
      cancelled_issues: 0,
      started_issues: 2,
      unstarted_issues: 1,
      backlog_issues: 0,
    },
    {
      id: 'cyc-2',
      name: 'اسپرینت ۲ — خرداد ۱۴۰۴',
      description: 'بهینه‌سازی و رفع اشکال',
      status: 'draft',
      start_date: new Date(Date.now() + 86400000 * 8).toISOString().split('T')[0],
      end_date: new Date(Date.now() + 86400000 * 22).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      total_issues: 0,
      completed_issues: 0,
      cancelled_issues: 0,
      started_issues: 0,
      unstarted_issues: 0,
      backlog_issues: 0,
    },
  ],
  'proj-2': [],
  'proj-3': [],
};

function listResponse<T>(results: T[]) {
  return HttpResponse.json({ count: results.length, next: null, previous: null, results });
}

export function planeHandlers() {
  const base = '*/api/v1';
  return [
    // workspaces
    http.get(`${base}/workspaces/`, () => HttpResponse.json([mockWorkspace])),

    // projects
    http.get(`${base}/workspaces/*/projects/`, () => listResponse(mockProjects)),

    // states
    http.get(`${base}/workspaces/*/projects/:projectId/states/`, ({ params }) => {
      const states = statesByProject[params.projectId as string] ?? statesByProject['proj-1'];
      return listResponse(states);
    }),

    // issues list
    http.get(`${base}/workspaces/*/projects/:projectId/issues/`, ({ params }) => {
      const issues = issuesByProject[params.projectId as string] ?? [];
      return listResponse(issues);
    }),

    // create issue
    http.post(`${base}/workspaces/*/projects/:projectId/issues/`, async ({ params, request }) => {
      const projectId = params.projectId as string;
      const body = (await request.json().catch(() => ({}))) as Partial<PlaneIssue & { name: string }>;
      if (!body.name?.trim()) {
        return HttpResponse.json({ detail: 'name_required' }, { status: 422 });
      }
      const states = statesByProject[projectId] ?? statesByProject['proj-1'];
      const defaultState = states.find((s) => s.group === 'backlog') ?? states[0];
      const newIssue: PlaneIssue = {
        id: `i-${Date.now()}`,
        name: body.name.trim(),
        description_html: null,
        priority: (body.priority as PlaneIssue['priority']) ?? 'none',
        state: body.state ?? defaultState?.id ?? '',
        assignees: [],
        due_date: body.due_date ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sequence_id: (issuesByProject[projectId]?.length ?? 0) + 1,
        label_ids: [],
        completed_at: null,
        started_at: null,
      };
      if (!issuesByProject[projectId]) issuesByProject[projectId] = [];
      issuesByProject[projectId].unshift(newIssue);
      return HttpResponse.json(newIssue, { status: 201 });
    }),

    // update issue
    http.patch(
      `${base}/workspaces/*/projects/:projectId/issues/:issueId/`,
      async ({ params, request }) => {
        const projectId = params.projectId as string;
        const issueId = params.issueId as string;
        const body = (await request.json().catch(() => ({}))) as Partial<PlaneIssue>;
        const list = issuesByProject[projectId];
        const issue = list?.find((i) => i.id === issueId);
        if (!issue) return HttpResponse.json({ detail: 'not_found' }, { status: 404 });
        Object.assign(issue, body, { updated_at: new Date().toISOString() });
        return HttpResponse.json(issue);
      }
    ),

    // members
    http.get(`${base}/workspaces/*/members/`, () => listResponse(mockMembers)),

    // cycles
    http.get(`${base}/workspaces/*/projects/:projectId/cycles/`, ({ params }) => {
      const cycles = cyclesByProject[params.projectId as string] ?? [];
      return listResponse(cycles);
    }),
  ];
}
