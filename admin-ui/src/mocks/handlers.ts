// @ts-nocheck — MSW resolver generics clash with shared dual-route handlers; runtime behavior is validated via dev MSW.
import { http, HttpResponse } from 'msw';
import type { HttpHandler } from 'msw';

/** هر هندلر را هم برای مسیر قدیمی star-slash و هم برای canonical با پیشوند api/v1 ثبت می‌کند. */
const MSW_V1 = '/api/v1';

function mswDual(legacyStarPath: string): string[] {
  if (!legacyStarPath.startsWith('*/')) return [legacyStarPath];
  const rest = legacyStarPath.slice(2);
  return [legacyStarPath, `*${MSW_V1}/${rest}`];
}

function dualGet(path: string, resolver: Parameters<typeof http.get>[1]): HttpHandler[] {
  return mswDual(path).map((p) => http.get(p, resolver));
}
function dualPost(path: string, resolver: Parameters<typeof http.post>[1]): HttpHandler[] {
  return mswDual(path).map((p) => http.post(p, resolver));
}
function dualPatch(path: string, resolver: Parameters<typeof http.patch>[1]): HttpHandler[] {
  return mswDual(path).map((p) => http.patch(p, resolver));
}
function dualDelete(path: string, resolver: Parameters<typeof http.delete>[1]): HttpHandler[] {
  return mswDual(path).map((p) => http.delete(p, resolver));
}

// ---- Mock user & shared fixtures ----
const MSW_FULL_PERMS = [
  'legal:read',
  'legal:write',
  'contracts:read',
  'contracts:write',
  'users:read',
  'users:write',
  'ads:read',
  'ads:write',
  'wallets:read',
  'wallets:write',
  'settings:read',
  'settings:write',
  'audit:read',
  'roles:read',
  'roles:write',
  'reports:read',
  'notifications:read',
  'crm:read',
  'crm:write',
];

const mockUser = {
  id: 'mock-001',
  mobile: '09120000000',
  first_name: 'کاربر',
  last_name: 'آزمایشی',
  full_name: 'کاربر آزمایشی',
  role: 'admin',
  role_id: 'role-admin',
  permissions: [...MSW_FULL_PERMS],
  national_code: null,
  gender: null,
  nick_name: null,
  postal_code: null,
  email: null,
  address: null,
  avatar_file: null,
  is_verified: true,
  last_login: new Date().toISOString(),
  roles: ['STAFF'],
  is_active: true,
  birth_date: null,
  father_name: null,
};

/** MSW — admin enterprise (هم‌تراز dev-mock-api) */
const mswRoles: Array<{ id: string; name: string; description: string; permissions: string[] }> = [
  {
    id: 'role-admin',
    name: 'مدیر کامل',
    description: 'دسترسی به همه ماژول‌ها',
    permissions: [...MSW_FULL_PERMS],
  },
  {
    id: 'role-support',
    name: 'پشتیبانی',
    description: 'پشتیبانی',
    permissions: ['contracts:read', 'contracts:write', 'users:read', 'crm:read', 'crm:write', 'reports:read'],
  },
];
let mswAuditSeq = 1;
const mswAuditLogs: Array<{
  id: string;
  user_id: string;
  action: string;
  entity: string;
  metadata: Record<string, unknown>;
  created_at: string;
}> = [];
const mswActivityByUserDay = new Map<string, number>();
const mswSessions: Array<{
  id: string;
  user_id: string;
  started_at: string;
  last_seen_at: string;
  ip: string;
}> = [];
const mswNotificationReads = new Set<string>();

const mswNotifications: Array<{
  id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  type?: string;
}> = [
  {
    id: 'n1',
    title: 'قرارداد جدید ثبت شد',
    body: 'یک قرارداد در صف بررسی است.',
    read: false,
    created_at: new Date().toISOString(),
  },
];

/** MSW CRM — همان منبع برای `/api/v1/crm/*` و متریک‌های داشبورد */
const crmMockLeads: Record<string, unknown>[] = [];
const crmMockActivities: Record<string, Record<string, unknown>[]> = {};

function seedCrmMockLeadsIfEmpty() {
  ensureMswRichDemo();
}

function crmOpenLeadCount(): number {
  seedCrmMockLeadsIfEmpty();
  return crmMockLeads.filter((l) => {
    const s = String((l as { status?: string }).status ?? '').toUpperCase();
    return s !== 'LOST' && s !== 'CONTRACTED';
  }).length;
}

function crmByStatusCounts(): Record<string, number> {
  seedCrmMockLeadsIfEmpty();
  const m: Record<string, number> = {};
  for (const raw of crmMockLeads) {
    let s = String((raw as { status?: string }).status ?? 'NEW').toUpperCase();
    if (s === 'QUALIFIED' || s === 'NEGOTIATION' || s === 'PROPOSAL') s = 'NEGOTIATING';
    m[s] = (m[s] ?? 0) + 1;
  }
  return m;
}

function mswRecordAudit(userId: string, action: string, entity: string, metadata: Record<string, unknown>) {
  const created_at = new Date().toISOString();
  const ev = {
    id: `aud-${mswAuditSeq++}`,
    user_id: userId,
    action,
    entity,
    metadata,
    created_at,
  };
  mswAuditLogs.unshift(ev);
  const day = created_at.slice(0, 10);
  const key = `${userId}:${day}`;
  mswActivityByUserDay.set(key, (mswActivityByUserDay.get(key) ?? 0) + 1);
  return ev;
}

interface MockContract {
  id: string;
  type: string;
  status: string;
  step: string;
  parties: Record<string, unknown[]>;
  created_at?: string;
  user_id?: string;
}

const contracts = new Map<string, MockContract>();

interface MswLegalReviewRow {
  id: string;
  contract_id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comment: string | null;
  reviewer_id: string | null;
  created_at: string;
  decided_at: string | null;
}
const mswLegalReviews: MswLegalReviewRow[] = [];

/** کاربران دایرکتوری، آگهی‌های نمونه؛ seed با قراردادها و CRM در ensureMswRichDemo */
const mswDirectoryUsers: MswDirectoryUser[] = [];
const mswListingRows: MswListingSeed[] = [];
const idCounterRef = { current: 1 };

const mswPaymentIntents: Array<{
  id: string;
  user_id: string;
  amount_cents: number;
  currency: string;
  idempotency_key: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  psp_reference?: string | null;
  psp_provider?: string | null;
  psp_checkout_token?: string | null;
  last_verify_error?: string | null;
  verify_attempt_count: number;
  callback_payload?: string | null;
  created_at: string;
  updated_at: string;
}> = [];

function seedPaymentIntentsDemo() {
  if (mswPaymentIntents.length > 0 || mswDirectoryUsers.length === 0) return;
  const t = new Date().toISOString();
  const t2 = new Date(Date.now() - 86400000).toISOString();
  mswPaymentIntents.push(
    {
      id: 'pi-demo-1',
      user_id: 'user-002',
      amount_cents: 150_000_000,
      currency: 'IRR',
      idempotency_key: 'idem-mock-1',
      status: 'PENDING',
      psp_reference: null,
      psp_provider: 'zibal',
      psp_checkout_token: null,
      last_verify_error: null,
      verify_attempt_count: 0,
      callback_payload: null,
      created_at: t,
      updated_at: t,
    },
    {
      id: 'pi-demo-2',
      user_id: 'realtor-003',
      amount_cents: 80_000_000,
      currency: 'IRR',
      idempotency_key: 'idem-mock-2',
      status: 'COMPLETED',
      psp_reference: 'PSP-REF-9921',
      psp_provider: 'mellat',
      psp_checkout_token: null,
      last_verify_error: null,
      verify_attempt_count: 1,
      callback_payload: '{"ok":true}',
      created_at: t2,
      updated_at: t2,
    },
    {
      id: 'pi-demo-3',
      user_id: 'user-004',
      amount_cents: 10_000_000,
      currency: 'IRR',
      idempotency_key: 'idem-mock-3',
      status: 'FAILED',
      psp_reference: null,
      psp_provider: 'zibal',
      psp_checkout_token: null,
      last_verify_error: 'عدم تأیید بانک',
      verify_attempt_count: 3,
      callback_payload: null,
      created_at: t2,
      updated_at: t,
    }
  );
}

function ensureMswRichDemo() {
  seedRichMswDemoIfNeeded({
    directoryUsers: mswDirectoryUsers,
    contracts,
    idCounterRef,
    crmLeads: crmMockLeads,
    notifications: mswNotifications,
    legalReviews: mswLegalReviews,
    listingRows: mswListingRows,
  });
  seedPaymentIntentsDemo();
}

type MswAddendumRow = {
  id: string;
  subject: string;
  created_at: string;
  sign_status: 'PENDING' | 'PARTIALLY_SIGNED' | 'FULLY_SIGNED';
};
const addendumsByContractId = new Map<string, MswAddendumRow[]>();

function adminEnterpriseHandlers() {
  return [
    ...dualGet('*/admin/roles', () => HttpResponse.json([...mswRoles])),
    ...dualPost('*/admin/roles', async ({ request }) => {
      const body = (await request.json()) as { name: string; description?: string; permissions?: string[] };
      const row = {
        id: `role-${mswRoles.length + 1}`,
        name: body.name,
        description: body.description ?? '',
        permissions: body.permissions ?? [],
      };
      mswRoles.push(row);
      return HttpResponse.json(row, { status: 201 });
    }),
    ...dualPatch('*/admin/roles/:roleId', async ({ params, request }) => {
      const id = params.roleId as string;
      const body = (await request.json()) as {
        name?: string;
        description?: string;
        permissions?: string[];
      };
      const r = mswRoles.find((x) => x.id === id);
      if (!r) return HttpResponse.json({ detail: 'not_found' }, { status: 404 });
      if (body.name !== undefined) r.name = body.name;
      if (body.description !== undefined) r.description = body.description;
      if (body.permissions !== undefined) r.permissions = [...body.permissions];
      return HttpResponse.json(r);
    }),
    ...dualPost('*/admin/audit', async ({ request }) => {
      const body = (await request.json()) as {
        action: string;
        entity: string;
        metadata?: Record<string, unknown>;
        user_id?: string;
      };
      const uid = body.user_id ?? mockUser.id;
      const ev = mswRecordAudit(uid, body.action, body.entity, body.metadata ?? {});
      return HttpResponse.json(ev, { status: 201 });
    }),
    ...dualGet('*/admin/audit', ({ request }) => {
      const u = new URL(request.url);
      const skip = Math.max(0, parseInt(u.searchParams.get('skip') ?? '0', 10) || 0);
      const limit = Math.min(200, Math.max(1, parseInt(u.searchParams.get('limit') ?? '50', 10) || 50));
      const items = mswAuditLogs.slice(skip, skip + limit);
      return HttpResponse.json({ total: mswAuditLogs.length, items, skip, limit });
    }),
    ...dualPost('*/admin/auth/heartbeat', () => HttpResponse.json({ ok: 'true' })),
    ...dualGet('*/admin/staff/activity', ({ request }) => {
      const u = new URL(request.url);
      const fromDate = u.searchParams.get('from_date') ?? undefined;
      const toDate = u.searchParams.get('to_date') ?? undefined;
      const filterUser = u.searchParams.get('user_id') ?? undefined;
      const rows: Array<{ user_id: string; date: string; event_count: number }> = [];
      for (const [key, cnt] of mswActivityByUserDay) {
        const sep = key.indexOf(':');
        const uid = sep >= 0 ? key.slice(0, sep) : key;
        const day = sep >= 0 ? key.slice(sep + 1) : '';
        if (filterUser && uid !== filterUser) continue;
        if (fromDate && day < fromDate) continue;
        if (toDate && day > toDate) continue;
        rows.push({ user_id: uid, date: day, event_count: cnt });
      }
      rows.sort((a, b) => (a.date === b.date ? b.user_id.localeCompare(a.user_id) : b.date.localeCompare(a.date)));
      return HttpResponse.json({ items: rows, total: rows.length });
    }),
    ...dualGet('*/admin/sessions', ({ request }) => {
      const u = new URL(request.url);
      const skip = Math.max(0, parseInt(u.searchParams.get('skip') ?? '0', 10) || 0);
      const limit = Math.min(200, Math.max(1, parseInt(u.searchParams.get('limit') ?? '50', 10) || 50));
      const items = mswSessions.slice(skip, skip + limit);
      return HttpResponse.json({ total: mswSessions.length, items, skip, limit });
    }),
    ...dualGet('*/admin/metrics/summary', () =>
      HttpResponse.json({
        contracts_total: contracts.size,
        users_total: 1,
        active_leads: crmOpenLeadCount(),
        contracts_today: 0,
        audit_events_total: mswAuditLogs.length,
      })
    ),
    ...dualGet('*/admin/metrics/operations', () => {
      const unread = mswNotifications.filter((x) => !mswNotificationReads.has(x.id)).length;
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const audit24 = mswAuditLogs.filter((e) => {
        const t = Date.parse(e.created_at);
        return !Number.isNaN(t) && t >= cutoff;
      }).length;
      const legalPending = mswLegalReviews.filter((r) => r.status === 'PENDING').length;
      return HttpResponse.json({
        unread_notifications: unread,
        open_crm_leads: crmOpenLeadCount(),
        crm_by_status: crmByStatusCounts(),
        contracts_flagged_legal: legalPending,
        audit_events_last_24h: audit24,
      });
    }),
    ...dualGet('*/admin/notifications', ({ request }) => {
      const u = new URL(request.url);
      const unreadOnly = u.searchParams.get('unread_only') === 'true' || u.searchParams.get('unread_only') === '1';
      const limit = Math.min(200, Math.max(1, parseInt(u.searchParams.get('limit') ?? '50', 10) || 50));
      const ordered = [...mswNotifications].reverse();
      const items: typeof mswNotifications = [];
      for (const n of ordered) {
        const read = mswNotificationReads.has(n.id);
        if (unreadOnly && read) continue;
        items.push({ ...n, read });
        if (items.length >= limit) break;
      }
      const unread_count = mswNotifications.filter((x) => !mswNotificationReads.has(x.id)).length;
      return HttpResponse.json({ items, total: mswNotifications.length, unread_count });
    }),
    ...dualPost('*/admin/notifications/:id/read', ({ params }) => {
      mswNotificationReads.add(params.id as string);
      return new HttpResponse(null, { status: 204 });
    }),
    ...dualPost('*/admin/notifications/read-all', () => {
      mswNotifications.forEach((n) => mswNotificationReads.add(n.id));
      return new HttpResponse(null, { status: 204 });
    }),
    ...dualPost('*/admin/notifications', async ({ request }) => {
      const body = (await request.json()) as { title: string; body?: string; type?: string };
      const row = {
        id: `n-${Date.now()}`,
        title: body.title,
        body: body.body ?? '',
        read: false,
        created_at: new Date().toISOString(),
        type: body.type ?? 'system',
      };
      mswNotifications.push(row);
      return HttpResponse.json(row, { status: 201 });
    }),
  ];
}

function crmLeadHandlers() {
  const listHandler = ({ request }: { request: Request }) => {
    seedCrmMockLeadsIfEmpty();
    const u = new URL(request.url);
    const skip = Math.max(0, parseInt(u.searchParams.get('skip') ?? '0', 10) || 0);
    const limit = Math.min(500, Math.max(1, parseInt(u.searchParams.get('limit') ?? '100', 10) || 100));
    const items = crmMockLeads.slice(skip, skip + limit);
    return HttpResponse.json({
      items,
      total: crmMockLeads.length,
      skip,
      limit,
    });
  };
  const getById = ({ params }: { params: { id: string } }) => {
    seedCrmMockLeadsIfEmpty();
    const row = crmMockLeads.find((l) => (l as { id: string }).id === params.id);
    return row
      ? HttpResponse.json(row)
      : HttpResponse.json({ error: 'not_found' }, { status: 404 });
  };
  const postLead = async ({ request }: { request: Request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const now = new Date().toISOString();
    const row = {
      ...body,
      id: `crm-${Date.now()}`,
      created_at: now,
      updated_at: now,
    };
    crmMockLeads.push(row);
    return HttpResponse.json(row, { status: 201 });
  };
  const patchLead = async ({ params, request }: { params: { id: string }; request: Request }) => {
    seedCrmMockLeadsIfEmpty();
    const idx = crmMockLeads.findIndex((l) => (l as { id: string }).id === params.id);
    if (idx < 0) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    const patch = (await request.json()) as Record<string, unknown>;
    crmMockLeads[idx] = {
      ...crmMockLeads[idx],
      ...patch,
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(crmMockLeads[idx]);
  };
  const getActs = ({ params }: { params: { id: string } }) => {
    const list = crmMockActivities[params.id] ?? [];
    return HttpResponse.json([...list]);
  };
  const postAct = async ({ params, request }: { params: { id: string }; request: Request }) => {
    const id = params.id;
    const body = (await request.json()) as Record<string, unknown>;
    const act = {
      ...body,
      id: `act-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    crmMockActivities[id] = [...(crmMockActivities[id] ?? []), act];
    return HttpResponse.json(act, { status: 201 });
  };
  return [
    ...dualGet('*/crm/leads', listHandler),
    http.get('*/admin/crm/leads', listHandler),
    ...dualGet('*/crm/leads/:id', getById),
    http.get('*/admin/crm/leads/:id', getById),
    ...dualPost('*/crm/leads', postLead),
    http.post('*/admin/crm/leads', postLead),
    ...dualPatch('*/crm/leads/:id', patchLead),
    http.patch('*/admin/crm/leads/:id', patchLead),
    ...dualGet('*/crm/leads/:id/activities', getActs),
    http.get('*/admin/crm/leads/:id/activities', getActs),
    ...dualPost('*/crm/leads/:id/activities', postAct),
    http.post('*/admin/crm/leads/:id/activities', postAct),
  ];
}

function nextId(): string {
  return `contract-${String(idCounterRef.current++).padStart(3, '0')}`;
}

function contractJson(c: MockContract) {
  return {
    id: c.id,
    type: c.type,
    status: c.status,
    step: c.step,
    parties: c.parties,
    is_owner: true,
    key: 'mock-key',
    password: null,
    created_at: c.created_at ?? new Date().toISOString(),
  };
}

/** شناسهٔ `local-preview__<TYPE>__<ts>` — ویزارد dev بدون POST /contracts/start */
const MSW_PREVIEW_TYPES = [
  'PROPERTY_RENT',
  'BUYING_AND_SELLING',
  'EXCHANGE',
  'CONSTRUCTION',
  'PRE_SALE',
  'LEASE_TO_OWN',
] as const;

function parsePreviewContractType(contractId: string): string | null {
  if (!contractId.startsWith('local-preview__')) return null;
  const inner = contractId.slice('local-preview__'.length);
  for (const t of MSW_PREVIEW_TYPES) {
    if (inner.startsWith(`${t}__`)) return t;
  }
  return null;
}

function getContract(contractId: string): MockContract | null {
  const previewType = parsePreviewContractType(contractId);
  if (previewType) {
    let c = contracts.get(contractId);
    if (!c) {
      c = {
        id: contractId,
        type: previewType,
        status: 'DRAFT',
        step: 'LANDLORD_INFORMATION',
        parties: {},
      };
      contracts.set(contractId, c);
    }
    return c;
  }
  return contracts.get(contractId) ?? null;
}

function setStep(c: MockContract, step: string) {
  c.step = step;
}

function handleContractList({ request }: { request: Request }) {
  const u = new URL(request.url);
  const page = Math.max(1, parseInt(u.searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(u.searchParams.get('limit') ?? '20', 10) || 20));
  const all = Array.from(contracts.values()).map(contractJson);
  const start = (page - 1) * limit;
  const items = all.slice(start, start + limit);
  return HttpResponse.json({ items, total: all.length, page, limit });
}

export const handlers = [
  // Auth
  ...dualGet('*/auth/me', () => HttpResponse.json(mockUser)),
  ...dualPost('*/admin/otp/send', () => HttpResponse.json({ success: true, message: 'کد ارسال شد' })),
  ...dualPost('*/admin/login', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { mobile?: string };
    mswRecordAudit(mockUser.id, 'auth.login', 'session', { mobile: body.mobile ?? '' });
    mswSessions.unshift({
      id: `sess-${Date.now()}`,
      user_id: mockUser.id,
      started_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      ip: '127.0.0.1',
    });
    return HttpResponse.json({
      access_token: 'mock-token-123',
      refresh_token: 'mock-refresh-123',
      user: { ...mockUser },
    });
  }),

  ...adminEnterpriseHandlers(),

  ...dualPost('*/contracts/start', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { contract_type?: string; party_type?: string };
    if (!body.party_type) {
      return HttpResponse.json(
        { detail: 'party_type is required' },
        { status: 422 }
      );
    }
    const type = body.contract_type ?? 'PROPERTY_RENT';
    const id = nextId();
    const c: MockContract = {
      id,
      type,
      status: 'DRAFT',
      step: 'LANDLORD_INFORMATION',
      parties: {},
      created_at: new Date().toISOString(),
      user_id: mockUser.id,
    };
    contracts.set(id, c);
    return HttpResponse.json(contractJson(c), { status: 201 });
  }),

  ...dualGet('*/contracts/list', handleContractList),

  ...dualGet('*/contracts/:id', ({ params }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ detail: 'not_found' }, { status: 404 });
    return HttpResponse.json(contractJson(c));
  }),

  ...dualGet('*/contracts/:id/addendum', ({ params }) => {
    const id = params.id as string;
    const list = addendumsByContractId.get(id) ?? [];
    return HttpResponse.json([...list]);
  }),

  ...dualPost('*/contracts/:id/addendum', async ({ params, request }) => {
    const id = params.id as string;
    const body = (await request.json().catch(() => ({}))) as { subject?: string; content?: string };
    const row: MswAddendumRow = {
      id: `add-${Date.now()}`,
      subject: body.subject ?? 'متمم',
      created_at: new Date().toISOString(),
      sign_status: 'PENDING',
    };
    addendumsByContractId.set(id, [...(addendumsByContractId.get(id) ?? []), row]);
    return HttpResponse.json(row, { status: 201 });
  }),

  ...dualPost('*/contracts/:id/addendum/sign/initiate', () => HttpResponse.json({ ok: true })),

  ...dualPost('*/admin/contracts/:id/approve', ({ params }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ detail: 'not_found' }, { status: 404 });
    c.status = 'ACTIVE';
    return HttpResponse.json({ ok: true });
  }),

  ...dualPost('*/admin/contracts/:id/reject', ({ params }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ detail: 'not_found' }, { status: 404 });
    c.status = 'ADMIN_REJECTED';
    return HttpResponse.json({ ok: true });
  }),

  ...dualPost('*/admin/contracts/:id/revoke', ({ params }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ detail: 'not_found' }, { status: 404 });
    c.status = 'REVOKED';
    return HttpResponse.json({ ok: true });
  }),

  ...dualGet('*/legal/reviews', ({ request }) => {
    const u = new URL(request.url);
    const limit = Math.min(200, Math.max(1, parseInt(u.searchParams.get('limit') ?? '100', 10) || 100));
    const items = mswLegalReviews.slice(0, limit);
    return HttpResponse.json({ items, total: mswLegalReviews.length });
  }),

  ...dualPost('*/legal/reviews/:id/decide', async ({ params, request }) => {
    const id = params.id as string;
    const body = (await request.json().catch(() => ({}))) as { approve?: boolean; comment?: string };
    const row = mswLegalReviews.find((r) => r.id === id);
    if (!row) return HttpResponse.json({ detail: 'not_found' }, { status: 404 });
    row.status = body.approve ? 'APPROVED' : 'REJECTED';
    row.comment = body.comment ?? null;
    row.decided_at = new Date().toISOString();
    row.reviewer_id = mockUser.id;
    return HttpResponse.json(row);
  }),

  ...dualGet('*/contracts/:id/status', ({ params }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    return HttpResponse.json({
      status: c.status,
      step: c.step,
      contract_id: c.id,
      type: c.type,
    });
  }),

  ...dualGet('*/contracts/:id/commission/invoice', ({ params }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    return HttpResponse.json({
      total_amount: 5_000_000,
      landlord_share: 2_500_000,
      tenant_share: 2_500_000,
      invoice_id: `inv-${c.id}`,
    });
  }),

  ...dualPost('*/contracts/:id/revoke', ({ params }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    c.status = 'REVOKED';
    return HttpResponse.json({ ok: true });
  }),

  ...dualPost('*/contracts/:id/party/landlord', ({ params }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    const partyId = `party-landlord-${Date.now()}`;
    const row = {
      id: partyId,
      contract: contractJson(c),
      party_type: 'LANDLORD',
      person_type: 'NATURAL_PERSON',
    };
    c.parties.landlords = [...(c.parties.landlords ?? []), row];
    return HttpResponse.json(row, { status: 201 });
  }),

  ...dualPatch('*/contracts/:id/party/:partyId', ({ params }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    return HttpResponse.json({
      id: params.partyId,
      contract: contractJson(c),
      party_type: 'LANDLORD',
      person_type: 'NATURAL_PERSON',
    });
  }),

  ...dualPost('*/contracts/:id/party/landlord/set', async ({ params, request }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as { next_step?: string };
    const next = body.next_step ?? 'TENANT_INFORMATION';
    setStep(c, next);
    return HttpResponse.json({ next_step: next });
  }),

  ...dualPost('*/contracts/:id/party/tenant', ({ params }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    const partyId = `party-tenant-${Date.now()}`;
    const row = {
      id: partyId,
      contract: contractJson(c),
      party_type: 'TENANT',
      person_type: 'NATURAL_PERSON',
    };
    c.parties.tenants = [...(c.parties.tenants ?? []), row];
    return HttpResponse.json(row, { status: 201 });
  }),

  ...dualPost('*/contracts/:id/party/tenant/set', async ({ params, request }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as { next_step?: string };
    const next = body.next_step ?? 'PLACE_INFORMATION';
    setStep(c, next);
    return HttpResponse.json({ next_step: next });
  }),

  ...dualDelete('*/contracts/:id/party/:partyId', ({ params }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    return HttpResponse.json({ ok: true });
  }),

  ...dualPost('*/contracts/:id/home-info', async ({ params, request }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as { next_step?: string };
    const next = body.next_step ?? 'DATING';
    setStep(c, next);
    return HttpResponse.json({ next_step: next }, { status: 201 });
  }),

  ...dualPost('*/contracts/:id/dating', async ({ params, request }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as { next_step?: string };
    const next = body.next_step ?? 'MORTGAGE';
    setStep(c, next);
    return HttpResponse.json({ next_step: next }, { status: 201 });
  }),

  ...dualPost('*/contracts/:id/mortgage', async ({ params, request }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as { next_step?: string };
    const next = body.next_step ?? (c.type === 'BUYING_AND_SELLING' ? 'SIGNING' : 'RENTING');
    const resolved = next;
    setStep(c, resolved);
    return HttpResponse.json({ next_step: resolved }, { status: 201 });
  }),

  ...dualPost('*/contracts/:id/renting', async ({ params, request }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as { next_step?: string };
    const next = body.next_step ?? 'SIGNING';
    setStep(c, next);
    return HttpResponse.json({ next_step: next }, { status: 201 });
  }),

  ...dualPost('*/contracts/:id/sign', () => HttpResponse.json({}, { status: 201 })),

  ...dualPost('*/contracts/:id/sign/verify', () => HttpResponse.json({ ok: true })),

  ...dualPost('*/contracts/:id/sign/set', async ({ params, request }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as { next_step?: string };
    const next = body.next_step ?? 'WITNESS';
    setStep(c, next);
    return HttpResponse.json({ next_step: next });
  }),

  ...dualPost('*/contracts/:id/add-witness', async ({ params, request }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as { next_step?: string };
    const next = body.next_step ?? 'WITNESS';
    setStep(c, next);
    return HttpResponse.json({ next_step: next });
  }),

  ...dualPost('*/contracts/:id/witness/send-otp', () => HttpResponse.json({}, { status: 201 })),

  ...dualPost('*/contracts/:id/witness/verify', async ({ params, request }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as { next_step?: string };
    const next = body.next_step ?? 'FINISH';
    setStep(c, next);
    c.status = 'COMPLETED';
    const contractId = c.id;
    if (!mswLegalReviews.some((r) => r.contract_id === contractId && r.status === 'PENDING')) {
      mswLegalReviews.unshift({
        id: `leg-${Date.now()}`,
        contract_id: contractId,
        status: 'PENDING',
        comment: null,
        reviewer_id: null,
        created_at: new Date().toISOString(),
        decided_at: null,
      });
    }
    return HttpResponse.json({ ok: true, next_step: next });
  }),

  ...dualGet('*/contracts/resolve-info', () => HttpResponse.json({ result: 'اطلاعات تأیید شد' })),

  ...dualPost('*/files/upload', () => HttpResponse.json({ id: 'file-001', url: null }, { status: 201 })),

  ...dualGet('*/admin/users', () =>
    HttpResponse.json({
      total_count: 1,
      start_index: 0,
      end_index: 1,
      data: [mockUser],
    })
  ),

  ...dualGet('*/admin/users/:id', () => HttpResponse.json(mockUser)),

  // ---- CRM in-memory (وقتی VITE_USE_CRM_API=true + MSW) ----
  ...crmLeadHandlers(),

  http.get('*/provinces/cities', () => HttpResponse.json([])),
  http.get('*/provinces', () => HttpResponse.json([])),

  ...dualGet('*/listings', ({ request }) => {
    ensureMswRichDemo();
    const u = new URL(request.url);
    const skip = Math.max(0, parseInt(u.searchParams.get('skip') ?? '0', 10) || 0);
    const limit = Math.min(500, Math.max(1, parseInt(u.searchParams.get('limit') ?? '200', 10) || 200));
    const items = mswListingRows.slice(skip, skip + limit);
    return HttpResponse.json({ items, total: mswListingRows.length });
  }),

  ...dualGet('*/search/listings', ({ request }) => {
    ensureMswRichDemo();
    const u = new URL(request.url);
    const q = (u.searchParams.get('q') ?? '').trim().toLowerCase();
    const limit = Math.min(100, Math.max(1, parseInt(u.searchParams.get('limit') ?? '50', 10) || 50));
    let items = [...mswListingRows];
    if (q) {
      items = items.filter(
        (x) =>
          x.title.toLowerCase().includes(q) ||
          x.location_summary.toLowerCase().includes(q) ||
          x.deal_type.toLowerCase().includes(q)
      );
    }
    const total = items.length;
    items = items.slice(0, limit);
    return HttpResponse.json({ items, total, facets: {} });
  }),

  ...dualGet('*/wallets/:userId/balance', ({ params }) => {
    ensureMswRichDemo();
    const uid = params.userId as string;
    const row = mswDirectoryUsers.find((x) => x.id === uid);
    const cents = row?.wallet_balance ?? 0;
    return HttpResponse.json({ user_id: uid, balance_cents: cents, currency: 'IRR' });
  }),

  ...dualGet('*/payments/intents', ({ request }) => {
    ensureMswRichDemo();
    const u = new URL(request.url);
    const status = u.searchParams.get('status') ?? '';
    const userId = u.searchParams.get('user_id') ?? '';
    let items = [...mswPaymentIntents];
    if (status) items = items.filter((x) => x.status === status);
    if (userId) items = items.filter((x) => x.user_id === userId);
    return HttpResponse.json({ items, total: items.length });
  }),

  ...dualGet('*/payments/intents/:id', ({ params }) => {
    ensureMswRichDemo();
    const row = mswPaymentIntents.find((x) => x.id === params.id);
    if (!row) return HttpResponse.json({ detail: 'not_found' }, { status: 404 });
    return HttpResponse.json(row);
  }),

  ...dualPost('*/payments/intents/:id/verify-retry', ({ params }) => {
    ensureMswRichDemo();
    const row = mswPaymentIntents.find((x) => x.id === params.id);
    if (!row) return HttpResponse.json({ detail: 'not_found' }, { status: 404 });
    row.verify_attempt_count += 1;
    row.status = 'COMPLETED';
    row.updated_at = new Date().toISOString();
    row.last_verify_error = null;
    row.psp_reference = row.psp_reference ?? `RETRY-${Date.now()}`;
    return HttpResponse.json(row);
  }),

  ...dualGet('*/billing/plans', () =>
    HttpResponse.json([
      {
        id: 'plan-basic',
        code: 'BASIC',
        name_fa: 'پایه',
        price_cents: 0,
        cycle: 'monthly',
      },
      {
        id: 'plan-pro',
        code: 'PRO',
        name_fa: 'حرفه‌ای',
        price_cents: 99_000_000,
        cycle: 'monthly',
      },
    ])
  ),

  ...dualGet('*/billing/me', () =>
    HttpResponse.json({
      id: 'sub-demo-1',
      user_id: mockUser.id,
      plan_id: 'plan-pro',
      status: 'ACTIVE',
      current_period_end: new Date(Date.now() + 20 * 86400000).toISOString(),
    })
  ),

  ...dualGet('*/billing/invoice/latest', () =>
    HttpResponse.json({
      subscription_id: 'sub-demo-1',
      status: 'OPEN',
      lines: [
        { description: 'اشتراک اَملاین — طرح حرفه‌ای', amount_cents: 99_000_000 },
        { description: 'مالیات بر ارزش افزوده', amount_cents: 9_900_000 },
      ],
      total_cents: 108_900_000,
      period_end: new Date(Date.now() + 20 * 86400000).toISOString(),
    })
  ),

  http.get('*/financials/wallets', () =>
    HttpResponse.json({
      id: 'wallet-001',
      credit: 0,
      user_id: 'mock-001',
      status: 'ACTIVE',
    })
  ),
];
