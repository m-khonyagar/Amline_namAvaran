import { http, HttpResponse } from 'msw';

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
}

const contracts = new Map<string, MockContract>();
let idCounter = 1;

function adminEnterpriseHandlers() {
  return [
    http.get('*/admin/roles', () => HttpResponse.json([...mswRoles])),
    http.post('*/admin/roles', async ({ request }) => {
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
    http.patch('*/admin/roles/:roleId', async ({ params, request }) => {
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
    http.post('*/admin/audit', async ({ request }) => {
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
    http.get('*/admin/audit', ({ request }) => {
      const u = new URL(request.url);
      const skip = Math.max(0, parseInt(u.searchParams.get('skip') ?? '0', 10) || 0);
      const limit = Math.min(200, Math.max(1, parseInt(u.searchParams.get('limit') ?? '50', 10) || 50));
      const items = mswAuditLogs.slice(skip, skip + limit);
      return HttpResponse.json({ total: mswAuditLogs.length, items, skip, limit });
    }),
    http.post('*/admin/auth/heartbeat', () => HttpResponse.json({ ok: 'true' })),
    http.get('*/admin/staff/activity', ({ request }) => {
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
    http.get('*/admin/sessions', ({ request }) => {
      const u = new URL(request.url);
      const skip = Math.max(0, parseInt(u.searchParams.get('skip') ?? '0', 10) || 0);
      const limit = Math.min(200, Math.max(1, parseInt(u.searchParams.get('limit') ?? '50', 10) || 50));
      const items = mswSessions.slice(skip, skip + limit);
      return HttpResponse.json({ total: mswSessions.length, items, skip, limit });
    }),
    http.get('*/admin/metrics/summary', () =>
      HttpResponse.json({
        contracts_total: contracts.size,
        users_total: 1,
        active_leads: 3,
        contracts_today: 0,
        audit_events_total: mswAuditLogs.length,
      })
    ),
    http.get('*/admin/metrics/operations', () => {
      const unread = mswNotifications.filter((x) => !mswNotificationReads.has(x.id)).length;
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const audit24 = mswAuditLogs.filter((e) => {
        const t = Date.parse(e.created_at);
        return !Number.isNaN(t) && t >= cutoff;
      }).length;
      return HttpResponse.json({
        unread_notifications: unread,
        open_crm_leads: 3,
        crm_by_status: { NEW: 1, CONTACTED: 1, QUALIFIED: 1 },
        contracts_flagged_legal: 0,
        audit_events_last_24h: audit24,
      });
    }),
    http.get('*/admin/notifications', ({ request }) => {
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
    http.post('*/admin/notifications/:id/read', ({ params }) => {
      mswNotificationReads.add(params.id as string);
      return new HttpResponse(null, { status: 204 });
    }),
    http.post('*/admin/notifications/read-all', () => {
      mswNotifications.forEach((n) => mswNotificationReads.add(n.id));
      return new HttpResponse(null, { status: 204 });
    }),
    http.post('*/admin/notifications', async ({ request }) => {
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

/** MSW CRM — برای تست API بدون backend */
const crmMockLeads: Record<string, unknown>[] = [];
const crmMockActivities: Record<string, Record<string, unknown>[]> = {};

function crmLeadHandlers() {
  return [
    http.get('*/admin/crm/leads', () =>
      HttpResponse.json([...crmMockLeads])
    ),
    http.get('*/admin/crm/leads/:id', ({ params }) => {
      const row = crmMockLeads.find((l) => (l as { id: string }).id === params.id);
      return row
        ? HttpResponse.json(row)
        : HttpResponse.json({ error: 'not_found' }, { status: 404 });
    }),
    http.post('*/admin/crm/leads', async ({ request }) => {
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
    }),
    http.patch('*/admin/crm/leads/:id', async ({ params, request }) => {
      const idx = crmMockLeads.findIndex(
        (l) => (l as { id: string }).id === params.id
      );
      if (idx < 0) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
      const patch = (await request.json()) as Record<string, unknown>;
      crmMockLeads[idx] = {
        ...crmMockLeads[idx],
        ...patch,
        updated_at: new Date().toISOString(),
      };
      return HttpResponse.json(crmMockLeads[idx]);
    }),
    http.get('*/admin/crm/leads/:id/activities', ({ params }) => {
      const list = crmMockActivities[params.id as string] ?? [];
      return HttpResponse.json([...list]);
    }),
    http.post('*/admin/crm/leads/:id/activities', async ({ params, request }) => {
      const id = params.id as string;
      const body = (await request.json()) as Record<string, unknown>;
      const act = {
        ...body,
        id: `act-${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      crmMockActivities[id] = [...(crmMockActivities[id] ?? []), act];
      return HttpResponse.json(act, { status: 201 });
    }),
  ];
}

function nextId(): string {
  return `contract-${String(idCounter++).padStart(3, '0')}`;
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
    created_at: new Date().toISOString(),
  };
}

function getContract(contractId: string): MockContract | null {
  return contracts.get(contractId) ?? null;
}

function setStep(c: MockContract, step: string) {
  c.step = step;
}

export const handlers = [
  // Auth
  http.get('*/auth/me', () => HttpResponse.json(mockUser)),
  http.post('*/admin/otp/send', () => HttpResponse.json({ success: true, message: 'کد ارسال شد' })),
  http.post('*/admin/login', async ({ request }) => {
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

  http.post('*/contracts/start', async ({ request }) => {
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
    };
    contracts.set(id, c);
    return HttpResponse.json(contractJson(c), { status: 201 });
  }),

  http.get('*/contracts/list', () =>
    HttpResponse.json(Array.from(contracts.values()).map(contractJson))
  ),

  http.get('*/contracts/:id/status', ({ params }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    return HttpResponse.json({
      status: c.status,
      step: c.step,
      contract_id: c.id,
      type: c.type,
    });
  }),

  http.get('*/contracts/:id/commission/invoice', ({ params }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    return HttpResponse.json({
      total_amount: 5_000_000,
      landlord_share: 2_500_000,
      tenant_share: 2_500_000,
      invoice_id: `inv-${c.id}`,
    });
  }),

  http.post('*/contracts/:id/revoke', ({ params }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    c.status = 'REVOKED';
    return HttpResponse.json({ ok: true });
  }),

  http.post('*/contracts/:id/party/landlord', ({ params }) => {
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

  http.patch('*/contracts/:id/party/:partyId', ({ params }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    return HttpResponse.json({
      id: params.partyId,
      contract: contractJson(c),
      party_type: 'LANDLORD',
      person_type: 'NATURAL_PERSON',
    });
  }),

  http.post('*/contracts/:id/party/landlord/set', async ({ params, request }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as { next_step?: string };
    const next = body.next_step ?? 'TENANT_INFORMATION';
    setStep(c, next);
    return HttpResponse.json({ next_step: next });
  }),

  http.post('*/contracts/:id/party/tenant', ({ params }) => {
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

  http.post('*/contracts/:id/party/tenant/set', async ({ params, request }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as { next_step?: string };
    const next = body.next_step ?? 'PLACE_INFORMATION';
    setStep(c, next);
    return HttpResponse.json({ next_step: next });
  }),

  http.delete('*/contracts/:id/party/:partyId', ({ params }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    return HttpResponse.json({ ok: true });
  }),

  http.post('*/contracts/:id/home-info', async ({ params, request }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as { next_step?: string };
    const next = body.next_step ?? 'DATING';
    setStep(c, next);
    return HttpResponse.json({ next_step: next }, { status: 201 });
  }),

  http.post('*/contracts/:id/dating', async ({ params, request }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as { next_step?: string };
    const next = body.next_step ?? 'MORTGAGE';
    setStep(c, next);
    return HttpResponse.json({ next_step: next }, { status: 201 });
  }),

  http.post('*/contracts/:id/mortgage', async ({ params, request }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as { next_step?: string };
    const next = body.next_step ?? (c.type === 'BUYING_AND_SELLING' ? 'SIGNING' : 'RENTING');
    const resolved = next;
    setStep(c, resolved);
    return HttpResponse.json({ next_step: resolved }, { status: 201 });
  }),

  http.post('*/contracts/:id/renting', async ({ params, request }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as { next_step?: string };
    const next = body.next_step ?? 'SIGNING';
    setStep(c, next);
    return HttpResponse.json({ next_step: next }, { status: 201 });
  }),

  http.post('*/contracts/:id/sign', () => HttpResponse.json({}, { status: 201 })),

  http.post('*/contracts/:id/sign/verify', () => HttpResponse.json({ ok: true })),

  http.post('*/contracts/:id/sign/set', async ({ params, request }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as { next_step?: string };
    const next = body.next_step ?? 'WITNESS';
    setStep(c, next);
    return HttpResponse.json({ next_step: next });
  }),

  http.post('*/contracts/:id/add-witness', async ({ params, request }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as { next_step?: string };
    const next = body.next_step ?? 'WITNESS';
    setStep(c, next);
    return HttpResponse.json({ next_step: next });
  }),

  http.post('*/contracts/:id/witness/send-otp', () => HttpResponse.json({}, { status: 201 })),

  http.post('*/contracts/:id/witness/verify', async ({ params, request }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as { next_step?: string };
    const next = body.next_step ?? 'FINISH';
    setStep(c, next);
    c.status = 'COMPLETED';
    return HttpResponse.json({ ok: true, next_step: next });
  }),

  http.get('*/contracts/resolve-info', () => HttpResponse.json({ result: 'اطلاعات تأیید شد' })),

  http.post('*/files/upload', () => HttpResponse.json({ id: 'file-001', url: null }, { status: 201 })),

  http.get('*/admin/users', () =>
    HttpResponse.json({
      total_count: 1,
      start_index: 0,
      end_index: 1,
      data: [mockUser],
    })
  ),

  http.get('*/admin/users/:id', () => HttpResponse.json(mockUser)),

  // ---- CRM in-memory (وقتی VITE_USE_CRM_API=true + MSW) ----
  ...crmLeadHandlers(),

  http.get('*/provinces/cities', () => HttpResponse.json([])),
  http.get('*/provinces', () => HttpResponse.json([])),

  http.get('*/financials/wallets', () =>
    HttpResponse.json({
      id: 'wallet-001',
      credit: 0,
      user_id: 'mock-001',
      status: 'ACTIVE',
    })
  ),
];
