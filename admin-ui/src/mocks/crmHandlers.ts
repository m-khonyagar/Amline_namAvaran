import { http, HttpResponse } from 'msw';
import type { Lead, LeadActivity, LeadTask, CrmStats, ConversionReport } from '../features/crm/types';

// ---- In-memory stores ----
const now = new Date();
const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

const crmLeads: Lead[] = [
  {
    id: 'lead-001',
    full_name: 'علی محمدی',
    mobile: '09121111111',
    need_type: 'RENT',
    status: 'NEW',
    assigned_to: null,
    notes: 'لید نمونه اول',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    contract_id: null,
    province_id: null,
    city_id: null,
  },
  {
    id: 'lead-002',
    full_name: 'سارا احمدی',
    mobile: '09122222222',
    need_type: 'BUY',
    status: 'CONTACTED',
    assigned_to: 'agent-001',
    notes: 'لید نمونه دوم',
    created_at: twoWeeksAgo.toISOString(),
    updated_at: twoWeeksAgo.toISOString(),
    contract_id: null,
    province_id: null,
    city_id: null,
  },
  {
    id: 'lead-003',
    full_name: 'رضا کریمی',
    mobile: '09123333333',
    need_type: 'SELL',
    status: 'NEGOTIATING',
    assigned_to: 'agent-001',
    notes: 'لید نمونه سوم',
    created_at: monthAgo.toISOString(),
    updated_at: monthAgo.toISOString(),
    contract_id: null,
    province_id: null,
    city_id: null,
  },
];

const crmActivities: Record<string, LeadActivity[]> = {
  'lead-001': [],
  'lead-002': [],
  'lead-003': [],
};

const crmTasks: Record<string, LeadTask[]> = {
  'lead-001': [],
  'lead-002': [],
  'lead-003': [],
};

let activitySeq = 1;
let taskSeq = 1;

// ---- Helpers ----
function computeStats(): CrmStats {
  const total = crmLeads.length;
  const contracted = crmLeads.filter((l) => l.status === 'CONTRACTED').length;
  const lost = crmLeads.filter((l) => l.status === 'LOST').length;
  const active = crmLeads.filter((l) => l.status !== 'LOST' && l.status !== 'CONTRACTED').length;
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const leadsThisMonth = crmLeads.filter((l) => l.created_at >= thisMonthStart).length;
  const conversionRate = total > 0 ? Math.round((contracted / total) * 100) : 0;
  return {
    active_leads: active,
    contracted_leads: contracted,
    total_leads: total,
    conversion_rate: conversionRate,
    leads_this_month: leadsThisMonth,
    lost_leads: lost,
  };
}

function computeConversionReport(fromDate?: string, toDate?: string): ConversionReport {
  let leads = [...crmLeads];
  if (fromDate) leads = leads.filter((l) => l.created_at >= fromDate);
  if (toDate) leads = leads.filter((l) => l.created_at <= toDate + 'T23:59:59Z');

  const total = leads.length;
  const converted = leads.filter((l) => l.status === 'CONTRACTED').length;
  const lost = leads.filter((l) => l.status === 'LOST').length;
  const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

  // monthly breakdown of converted leads
  const byMonth: Record<string, number> = {};
  for (const l of leads.filter((l) => l.status === 'CONTRACTED')) {
    const month = l.created_at.slice(0, 7); // YYYY-MM
    byMonth[month] = (byMonth[month] ?? 0) + 1;
  }
  const monthly_breakdown = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  return { total_leads: total, converted_leads: converted, lost_leads: lost, conversion_rate: conversionRate, monthly_breakdown };
}

// ---- Handlers ----
export const crmHandlers = [
  // GET /admin/crm/leads — list all, sorted by created_at desc
  http.get('*/admin/crm/leads', () => {
    const sorted = [...crmLeads].sort((a, b) => b.created_at.localeCompare(a.created_at));
    return HttpResponse.json(sorted);
  }),

  // POST /admin/crm/leads — create lead, status defaults to NEW
  http.post('*/admin/crm/leads', async ({ request }) => {
    const body = (await request.json()) as Partial<Lead>;
    const ts = new Date().toISOString();
    const lead: Lead = {
      id: `lead-${Date.now()}`,
      full_name: body.full_name ?? '',
      mobile: body.mobile ?? '',
      need_type: body.need_type ?? 'RENT',
      status: body.status ?? 'NEW',
      assigned_to: body.assigned_to ?? null,
      notes: body.notes ?? '',
      created_at: ts,
      updated_at: ts,
      contract_id: body.contract_id ?? null,
      province_id: body.province_id ?? null,
      city_id: body.city_id ?? null,
    };
    crmLeads.push(lead);
    crmActivities[lead.id] = [];
    crmTasks[lead.id] = [];
    return HttpResponse.json(lead, { status: 201 });
  }),

  // GET /admin/crm/leads/:id — single lead
  http.get('*/admin/crm/leads/:id', ({ params }) => {
    const lead = crmLeads.find((l) => l.id === params.id);
    if (!lead) return HttpResponse.json({ detail: 'not_found' }, { status: 404 });
    return HttpResponse.json(lead);
  }),

  // PATCH /admin/crm/leads/:id — partial update
  http.patch('*/admin/crm/leads/:id', async ({ params, request }) => {
    const idx = crmLeads.findIndex((l) => l.id === params.id);
    if (idx < 0) return HttpResponse.json({ detail: 'not_found' }, { status: 404 });
    const patch = (await request.json()) as Partial<Lead>;
    crmLeads[idx] = { ...crmLeads[idx], ...patch, updated_at: new Date().toISOString() };
    return HttpResponse.json(crmLeads[idx]);
  }),

  // DELETE /admin/crm/leads/:id — delete lead
  http.delete('*/admin/crm/leads/:id', ({ params }) => {
    const idx = crmLeads.findIndex((l) => l.id === params.id);
    if (idx < 0) return HttpResponse.json({ detail: 'not_found' }, { status: 404 });
    crmLeads.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /admin/crm/leads/:id/activities
  http.get('*/admin/crm/leads/:id/activities', ({ params }) => {
    const list = crmActivities[params.id as string] ?? [];
    return HttpResponse.json([...list]);
  }),

  // POST /admin/crm/leads/:id/activities
  http.post('*/admin/crm/leads/:id/activities', async ({ params, request }) => {
    const leadId = params.id as string;
    const body = (await request.json()) as Partial<LeadActivity>;
    const activity: LeadActivity = {
      id: `act-${activitySeq++}`,
      lead_id: leadId,
      type: body.type ?? 'NOTE',
      content: body.content ?? (body as Record<string, string>).note ?? '',
      created_by: body.created_by ?? (body as Record<string, string>).user_id ?? 'mock-001',
      created_at: new Date().toISOString(),
    };
    if (!crmActivities[leadId]) crmActivities[leadId] = [];
    crmActivities[leadId].push(activity);
    return HttpResponse.json(activity, { status: 201 });
  }),

  // GET /admin/crm/leads/:id/tasks
  http.get('*/admin/crm/leads/:id/tasks', ({ params }) => {
    const list = crmTasks[params.id as string] ?? [];
    return HttpResponse.json([...list]);
  }),

  // POST /admin/crm/leads/:id/tasks — create task, done=false
  http.post('*/admin/crm/leads/:id/tasks', async ({ params, request }) => {
    const leadId = params.id as string;
    const body = (await request.json()) as Partial<LeadTask>;
    const task: LeadTask = {
      id: `task-${taskSeq++}`,
      lead_id: leadId,
      title: body.title ?? '',
      due_date: body.due_date ?? null,
      done: false,
      created_at: new Date().toISOString(),
    };
    if (!crmTasks[leadId]) crmTasks[leadId] = [];
    crmTasks[leadId].push(task);
    return HttpResponse.json(task, { status: 201 });
  }),

  // PATCH /admin/crm/leads/:id/tasks/:taskId — partial update task
  http.patch('*/admin/crm/leads/:id/tasks/:taskId', async ({ params, request }) => {
    const leadId = params.id as string;
    const taskId = params.taskId as string;
    const tasks = crmTasks[leadId] ?? [];
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx < 0) return HttpResponse.json({ detail: 'not_found' }, { status: 404 });
    const patch = (await request.json()) as Partial<LeadTask>;
    tasks[idx] = { ...tasks[idx], ...patch };
    return HttpResponse.json(tasks[idx]);
  }),

  // DELETE /admin/crm/leads/:id/tasks/:taskId
  http.delete('*/admin/crm/leads/:id/tasks/:taskId', ({ params }) => {
    const leadId = params.id as string;
    const taskId = params.taskId as string;
    const tasks = crmTasks[leadId] ?? [];
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx < 0) return HttpResponse.json({ detail: 'not_found' }, { status: 404 });
    tasks.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /admin/crm/stats
  http.get('*/admin/crm/stats', () => {
    return HttpResponse.json(computeStats());
  }),

  // GET /admin/crm/reports/conversion
  http.get('*/admin/crm/reports/conversion', ({ request }) => {
    const u = new URL(request.url);
    const fromDate = u.searchParams.get('from_date') ?? undefined;
    const toDate = u.searchParams.get('to_date') ?? undefined;
    return HttpResponse.json(computeConversionReport(fromDate, toDate));
  }),
];
