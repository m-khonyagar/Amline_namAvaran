import { http, HttpResponse } from 'msw';
import type { ContractResponse, Party } from '../features/contract-wizard/types/api';
import { userAdminHandlers } from './userAdminHandlers';
import { consultantPlatformHandlers } from './consultantPlatformHandlers'; // self + admin review
import { workspaceOrgHandlers } from './workspaceOrgHandlers';
import { hamgitPortHandlers } from './hamgitPortHandlers';
import { crmHandlers } from './crmHandlers';

// ---- Mock user & shared fixtures ----
const MSW_FULL_PERMS = [
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
  'consultants:read',
  'consultants:write',
  'workspace:read',
  'workspace:write',
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
    permissions: [
      'contracts:read',
      'contracts:write',
      'users:read',
      'crm:read',
      'crm:write',
      'reports:read',
      'notifications:read',
      'consultants:read',
      'workspace:read',
    ],
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
const mswNotifications: Array<{ id: string; title: string; body: string; read: boolean; created_at: string }> = [
  {
    id: 'n1',
    title: 'قرارداد جدید ثبت شد',
    body: 'یک قرارداد در صف بررسی است.',
    read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'n2',
    title: 'به‌روزرسانی سیستم',
    body: 'نسخهٔ جدید پنل در دسترس است.',
    read: true,
    created_at: new Date().toISOString(),
  },
];

const mswAds: Array<{ id: string; title: string; status: string; city?: string; created_at: string }> = [
  {
    id: 'ad-1',
    title: 'آگهی نمونه — اجاره منزل',
    status: 'PUBLISHED',
    city: 'تهران',
    created_at: new Date().toISOString(),
  },
];

const mswAdminWallets: Array<{
  id: string
  user_id: string
  mobile: string
  balance: number
  currency: string
  status: string
}> = [
  {
    id: 'w1',
    user_id: 'mock-001',
    mobile: '09120000000',
    balance: 0,
    currency: 'IRR',
    status: 'ACTIVE',
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
  /** landlords/tenants + فیلدهای مالی ویزارد */
  parties: Record<string, unknown>;
  created_at: string;
  owner_id?: string;
  /** نمایش در لیست ادمین (نام طرف‌ها) */
  party_preview?: { full_name?: string }[];
  tracking_code?: string | null;
  legal_review_status?: 'NONE' | 'AWAITING_STAFF' | 'APPROVED' | 'REJECTED';
  commission_paid_at?: string | null;
}

const contracts = new Map<string, MockContract>();
let idCounter = 10;

function seedDemoContracts() {
  const t0 = new Date(Date.now() - 86400000 * 5).toISOString();
  const t1 = new Date(Date.now() - 86400000 * 2).toISOString();
  const t2 = new Date(Date.now() - 86400000 * 30).toISOString();
  const samples: MockContract[] = [
    {
      id: 'contract-demo-001',
      type: 'PROPERTY_RENT',
      status: 'PENDING_ADMIN_APPROVAL',
      step: 'FINISH',
      parties: {},
      created_at: t0,
      owner_id: 'mock-001',
      party_preview: [{ full_name: 'احمد کریمی' }, { full_name: 'سارا محمدی' }],
      tracking_code: null,
      legal_review_status: 'AWAITING_STAFF',
    },
    {
      id: 'contract-demo-002',
      type: 'PROPERTY_RENT',
      status: 'ACTIVE',
      step: 'FINISH',
      parties: {},
      created_at: t1,
      owner_id: 'user-002',
      party_preview: [{ full_name: 'علی رضایی' }, { full_name: 'نرگس حسینی' }],
      tracking_code: 'RG-1403-009812',
      legal_review_status: 'APPROVED',
    },
    {
      id: 'contract-demo-003',
      type: 'BUYING_AND_SELLING',
      status: 'COMPLETED',
      step: 'FINISH',
      parties: {},
      created_at: t2,
      owner_id: 'mock-001',
      party_preview: [{ full_name: 'کاربر آزمایشی' }, { full_name: 'خریدار نمونه' }],
      tracking_code: 'RG-1402-004421',
      legal_review_status: 'APPROVED',
    },
  ];
  for (const c of samples) contracts.set(c.id, c);
}

seedDemoContracts();

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
    http.delete('*/admin/roles/:roleId', ({ params }) => {
      const id = params.roleId as string;
      if (id === 'role-admin') {
        return HttpResponse.json({ detail: 'cannot_delete_system_role' }, { status: 403 });
      }
      const idx = mswRoles.findIndex((x) => x.id === id);
      if (idx < 0) return HttpResponse.json({ detail: 'not_found' }, { status: 404 });
      mswRoles.splice(idx, 1);
      return HttpResponse.json({ ok: true });
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
      const actionQ = (u.searchParams.get('action') ?? '').trim().toLowerCase();
      const entityQ = (u.searchParams.get('entity') ?? '').trim().toLowerCase();
      let logs = mswAuditLogs;
      if (actionQ) logs = logs.filter((l) => l.action.toLowerCase().includes(actionQ));
      if (entityQ) logs = logs.filter((l) => l.entity.toLowerCase().includes(entityQ));
      const total = logs.length;
      const items = logs.slice(skip, skip + limit);
      return HttpResponse.json({ total, items, skip, limit });
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
    http.get('*/admin/notifications', () =>
      HttpResponse.json({ items: [...mswNotifications], total: mswNotifications.length })
    ),
    http.patch('*/admin/notifications/:notificationId', async ({ params, request }) => {
      const id = params.notificationId as string;
      const body = (await request.json().catch(() => ({}))) as { read?: boolean };
      const n = mswNotifications.find((x) => x.id === id);
      if (!n) return HttpResponse.json({ detail: 'not_found' }, { status: 404 });
      if (typeof body.read === 'boolean') n.read = body.read;
      return HttpResponse.json({ ...n });
    }),
    http.post('*/admin/notifications/read-all', () => {
      for (const n of mswNotifications) n.read = true;
      return HttpResponse.json({ ok: true, updated: mswNotifications.length });
    }),
    http.get('*/admin/ads', () =>
      HttpResponse.json({ items: [...mswAds], total: mswAds.length })
    ),
    http.get('*/admin/wallets', () =>
      HttpResponse.json({ items: [...mswAdminWallets], total: mswAdminWallets.length })
    ),
  ];
}



function nextId(): string {
  return `contract-${String(idCounter++).padStart(3, '0')}`;
}

/** هم‌تراز با بک‌اند: در SIGNING تا قبل از پرداخت کمیسیون، status مؤثر PENDING_COMMISSION */
const WIZARD_STATUS_NO_COMMISSION_OVERLAY = new Set(['REVOKED', 'COMPLETED', 'REJECTED']);

function effectiveContractStatus(c: MockContract): string {
  const raw = c.status ?? 'DRAFT';
  if (WIZARD_STATUS_NO_COMMISSION_OVERLAY.has(raw)) return raw;
  if (c.step === 'SIGNING' && !c.commission_paid_at) return 'PENDING_COMMISSION';
  if (raw === 'PENDING_COMMISSION' && c.commission_paid_at) return 'DRAFT';
  return raw;
}

function contractJson(c: MockContract) {
  return {
    id: c.id,
    type: c.type,
    status: effectiveContractStatus(c),
    step: c.step,
    parties: c.party_preview?.length ? c.party_preview : c.parties,
    is_owner: true,
    key: 'mock-key',
    password: null,
    created_at: c.created_at ?? new Date().toISOString(),
    user_id: c.owner_id ?? 'mock-001',
    tracking_code: c.tracking_code ?? null,
    legal_review_status: c.legal_review_status ?? 'NONE',
  };
}

function contractDetailResponse(c: MockContract): ContractResponse {
  const j = contractJson(c);
  const bag: Record<string, unknown> = { ...(c.parties ?? {}) };
  if (!Array.isArray(bag.landlords)) bag.landlords = [];
  if (!Array.isArray(bag.tenants)) bag.tenants = [];
  if (c.party_preview?.length) {
    const list: Party[] = c.party_preview.map((_p, i) => ({
      id: `pv-${c.id}-${i}`,
      party_type: i === 0 ? 'LANDLORD' : 'TENANT',
      person_type: 'NATURAL_PERSON',
      contract: j as unknown as Record<string, unknown>,
    }));
    bag.landlords = list[0] ? [list[0]] : [];
    bag.tenants = list.slice(1);
  }
  return {
    id: j.id,
    type: j.type as ContractResponse['type'],
    status: j.status as ContractResponse['status'],
    step: j.step as ContractResponse['step'],
    parties: bag,
    is_owner: j.is_owner,
    key: j.key,
    password: j.password,
    created_at: j.created_at,
    tracking_code: j.tracking_code,
    legal_review_status: j.legal_review_status as ContractResponse['legal_review_status'],
  };
}

function mergeMockParties(c: MockContract, patch: Record<string, unknown>) {
  c.parties = { ...c.parties, ...patch };
}

function mockCommissionTotals(c: MockContract): {
  total_amount: number;
  landlord_share: number;
  tenant_share: number;
  commission: number;
  tax: number;
  tracking_code_fee: number;
} {
  const p = c.parties ?? {};
  if (c.type === 'BUYING_AND_SELLING' && Number(p.sale_price ?? 0) > 0) {
    const total_amount = 7_200_000;
    return {
      total_amount,
      landlord_share: 3_600_000,
      tenant_share: 3_600_000,
      commission: 6_000_000,
      tax: 600_000,
      tracking_code_fee: 600_000,
    };
  }
  if (Number(p.rent_amount ?? 0) > 0 || Number(p.deposit_amount ?? 0) > 0) {
    const total_amount = 5_550_000;
    return {
      total_amount,
      landlord_share: 2_775_000,
      tenant_share: 2_775_000,
      commission: 5_000_000,
      tax: 500_000,
      tracking_code_fee: 50_000,
    };
  }
  const total_amount = 5_550_000;
  return {
    total_amount,
    landlord_share: 2_775_000,
    tenant_share: 2_775_000,
    commission: 5_000_000,
    tax: 500_000,
    tracking_code_fee: 50_000,
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
  ...userAdminHandlers(),

  http.post('*/contracts/start', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { contract_type?: string; party_type?: string; is_guaranteed?: boolean };
    const type = body.contract_type ?? 'PROPERTY_RENT';
    const id = nextId();
    const c: MockContract = {
      id,
      type,
      status: 'DRAFT',
      step: 'LANDLORD_INFORMATION',
      parties: {},
      created_at: new Date().toISOString(),
      owner_id: 'mock-001',
    };
    contracts.set(id, c);
    return HttpResponse.json(contractJson(c), { status: 201 });
  }),

  http.get('*/contracts/list', ({ request }) => {
    const u = new URL(request.url);
    const userId = u.searchParams.get('user_id');
    const statusQ = (u.searchParams.get('status') ?? '').trim();
    const typeQ = (u.searchParams.get('type') ?? '').trim();
    const page = Math.max(1, parseInt(u.searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(u.searchParams.get('limit') || '20', 10) || 20));
    let list = Array.from(contracts.values()).map((c) => contractJson(c));
    if (userId) list = list.filter((row) => (row as { user_id?: string }).user_id === userId);
    if (statusQ) list = list.filter((row) => (row as { status?: string }).status === statusQ);
    if (typeQ) list = list.filter((row) => (row as { type?: string }).type === typeQ);
    const total = list.length;
    const start = (page - 1) * limit;
    const items = list.slice(start, start + limit);
    return HttpResponse.json({
      items,
      total,
      page,
      limit,
    });
  }),

  http.get('*/contracts/:id', ({ params }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    return HttpResponse.json(contractDetailResponse(c));
  }),

  http.post('*/admin/contracts/:id/approve', ({ params }) => {
    const c = contracts.get(params.id as string);
    if (!c) return HttpResponse.json({ detail: 'not_found' }, { status: 404 });
    c.status = 'ACTIVE';
    c.legal_review_status = 'APPROVED';
    if (!c.tracking_code) c.tracking_code = `AML-${String(Date.now()).slice(-8)}`;
    return HttpResponse.json(contractJson(c));
  }),

  http.post('*/admin/contracts/:id/reject', ({ params }) => {
    const c = contracts.get(params.id as string);
    if (!c) return HttpResponse.json({ detail: 'not_found' }, { status: 404 });
    c.status = 'ADMIN_REJECTED';
    c.legal_review_status = 'REJECTED';
    return HttpResponse.json(contractJson(c));
  }),

  http.post('*/admin/contracts/:id/revoke', ({ params }) => {
    const c = contracts.get(params.id as string);
    if (!c) return HttpResponse.json({ detail: 'not_found' }, { status: 404 });
    c.status = 'REVOKED';
    return HttpResponse.json(contractJson(c));
  }),

  http.get('*/contracts/:id/status', ({ params }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    if (c.commission_paid_at && c.status === 'PENDING_COMMISSION') {
      c.status = 'DRAFT';
      setStep(c, 'SIGNING');
    }
    return HttpResponse.json({
      status: effectiveContractStatus(c),
      step: c.step,
      contract_id: c.id,
      type: c.type,
    });
  }),

  http.get('*/contracts/:id/commission/invoice', ({ params, request }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    const paid = Boolean(c.commission_paid_at);
    const inv = mockCommissionTotals(c);
    const code = new URL(request.url).searchParams.get('discount_code')?.trim() ?? '';
    if (code) {
      const upper = code.toUpperCase();
      if (upper !== 'AMLINE50') {
        return HttpResponse.json(
          { detail: { code: 'invalid_discount_code', hint: 'کد تخفیف معتبر نیست' } },
          { status: 422 },
        );
      }
      const gross = inv.total_amount;
      const discount_amount = Math.floor(gross / 2);
      const total_amount = gross - discount_amount;
      const landlord_share = Math.floor(total_amount / 2);
      const tenant_share = total_amount - landlord_share;
      return HttpResponse.json({
        ...inv,
        gross_total_amount: gross,
        discount_amount,
        discount_percent: 50,
        total_amount,
        landlord_share,
        tenant_share,
        invoice_id: `inv-${c.id}`,
        commission_paid: paid,
        commission_paid_at: c.commission_paid_at ?? null,
      });
    }
    return HttpResponse.json({
      ...inv,
      invoice_id: `inv-${c.id}`,
      commission_paid: paid,
      commission_paid_at: c.commission_paid_at ?? null,
    });
  }),

  http.post('*/contracts/:id/commission/pay', async ({ params, request }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as {
      use_wallet_credit?: boolean;
      use_all_wallet_credits?: boolean;
      discount_code?: string | null;
    };
    const code = (body.discount_code ?? '').trim();
    if (code && code.toUpperCase() !== 'AMLINE50') {
      return HttpResponse.json(
        { detail: { code: 'invalid_discount_code', hint: 'کد تخفیف معتبر نیست' } },
        { status: 422 },
      );
    }
    const tryWallet = Boolean(body.use_wallet_credit || body.use_all_wallet_credits);
    if (tryWallet) {
      c.commission_paid_at = new Date().toISOString();
      if (c.status === 'PENDING_COMMISSION') {
        c.status = 'DRAFT';
        setStep(c, 'SIGNING');
      }
      return HttpResponse.json({ ok: true, redirect_url: '/', used_wallet: true });
    }
    return HttpResponse.json({
      ok: true,
      redirect_url: `/financials/bank/gateway?contract_id=${params.id}`,
      used_wallet: false,
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
    const prevL = Array.isArray(c.parties.landlords) ? c.parties.landlords : [];
    c.parties.landlords = [...prevL, row];
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
    const prevT = Array.isArray(c.parties.tenants) ? c.parties.tenants : [];
    c.parties.tenants = [...prevT, row];
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
    const body = (await request.json().catch(() => ({}))) as {
      next_step?: string;
      postal_code?: string;
      area_m2?: number;
      property_use_type?: string;
    };
    const next = body.next_step ?? 'DATING';
    setStep(c, next);
    mergeMockParties(c, {
      postal_code: body.postal_code ?? '',
      area_m2: body.area_m2 ?? 0,
      property_use_type: body.property_use_type ?? '',
    });
    return HttpResponse.json({ next_step: next }, { status: 201 });
  }),

  http.post('*/contracts/:id/dating', async ({ params, request }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as {
      next_step?: string;
      start_date?: string;
      end_date?: string;
      delivery_date?: string;
    };
    const next = body.next_step ?? 'MORTGAGE';
    setStep(c, next);
    mergeMockParties(c, {
      lease_start_date: body.start_date ?? '',
      lease_end_date: body.end_date ?? '',
      ...(body.delivery_date ? { delivery_date: body.delivery_date } : {}),
    });
    return HttpResponse.json({ next_step: next }, { status: 201 });
  }),

  http.post('*/contracts/:id/mortgage', async ({ params, request }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    if (c.type === 'BUYING_AND_SELLING') {
      return HttpResponse.json({ detail: 'use_sale_price_endpoint' }, { status: 422 });
    }
    const body = (await request.json().catch(() => ({}))) as {
      next_step?: string;
      total_amount?: number;
      stages?: Array<{ due_date: string; payment_type: string; amount: number; cheque_image_file_id?: number | null }>;
    };
    const next = body.next_step ?? 'RENTING';
    setStep(c, next);
    if (body.total_amount != null && body.stages) {
      mergeMockParties(c, {
        deposit_amount: body.total_amount,
        mortgage_payment_stages: body.stages,
      });
    }
    return HttpResponse.json({ next_step: next }, { status: 201 });
  }),

  http.post('*/contracts/:id/sale-price', async ({ params, request }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    if (c.type !== 'BUYING_AND_SELLING') {
      return HttpResponse.json({ detail: 'sale_price_contract_type' }, { status: 422 });
    }
    const body = (await request.json().catch(() => ({}))) as {
      next_step?: string;
      total_price?: number;
      stages?: Array<{ due_date: string; payment_type: string; amount: number; cheque_image_file_id?: number | null }>;
    };
    const stages = body.stages ?? [];
    const tp = body.total_price ?? 0;
    if (stages.length > 0) {
      const sum = stages.reduce((a, s) => a + (s.amount ?? 0), 0);
      if (sum !== tp) return HttpResponse.json({ detail: 'stages_sum_mismatch' }, { status: 422 });
    }
    const next = body.next_step ?? 'SIGNING';
    setStep(c, next);
    mergeMockParties(c, { sale_price: tp, sale_payment_stages: stages });
    return HttpResponse.json({ next_step: next }, { status: 201 });
  }),

  http.post('*/contracts/:id/renting', async ({ params, request }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as {
      next_step?: string;
      monthly_rent_amount?: number;
      rent_due_day_of_month?: number | null;
      stages?: Array<{ due_date: string; payment_type: string; amount: number; cheque_image_file_id?: number | null }>;
    };
    const next = body.next_step ?? 'SIGNING';
    setStep(c, next);
    if (c.type === 'PROPERTY_RENT' && body.monthly_rent_amount != null && body.stages) {
      mergeMockParties(c, {
        rent_amount: body.monthly_rent_amount,
        rent_payment_stages: body.stages,
        ...(body.rent_due_day_of_month != null
          ? { rent_due_day_of_month: body.rent_due_day_of_month }
          : {}),
      });
    }
    return HttpResponse.json({ next_step: next }, { status: 201 });
  }),

  http.post('*/contracts/:id/sign', ({ params }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    if (c.step === 'SIGNING' && !c.commission_paid_at) {
      return HttpResponse.json({ detail: 'commission_required' }, { status: 400 });
    }
    return HttpResponse.json({}, { status: 201 });
  }),

  http.post('*/contracts/:id/sign/verify', ({ params }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    if (c.step === 'SIGNING' && !c.commission_paid_at) {
      return HttpResponse.json({ detail: 'commission_required' }, { status: 400 });
    }
    return HttpResponse.json({ ok: true });
  }),

  http.post('*/contracts/:id/sign/set', async ({ params, request }) => {
    const c = getContract(params.id as string);
    if (!c) return HttpResponse.json({ error: 'not_found' }, { status: 404 });
    if (c.step === 'SIGNING' && !c.commission_paid_at) {
      return HttpResponse.json({ detail: 'commission_required' }, { status: 400 });
    }
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

  http.post('*/files/upload', () => HttpResponse.json({ id: '10001', url: null }, { status: 201 })),

  // ---- CRM in-memory ----
  ...crmHandlers,

  http.get('*/provinces/cities', () => HttpResponse.json([])),
  http.get('*/provinces', () => HttpResponse.json([])),

  http.get('*/financials/wallets', () =>
    HttpResponse.json({
      id: 'wallet-001',
      credit: 3_000_000,
      user_id: 'mock-001',
      status: 'ACTIVE',
    })
  ),

  http.get('*/financials/bank/gateway', () =>
    new HttpResponse(
      '<!DOCTYPE html><html lang="fa" dir="rtl"><meta charset="utf-8"/><title>درگاه (MSW)</title><body style="font-family:sans-serif;padding:1.5rem"><h1>درگاه آزمایشی</h1><p>برای ثبت پرداخت در MSW دکمه را بزنید.</p><button type="button" id="go">تأیید پرداخت</button><p><button type="button" onclick="history.back()">بازگشت</button></p><script>document.getElementById("go").onclick=function(){var p=new URLSearchParams(location.search);var cid=p.get("contract_id");if(!cid){alert("contract_id");return;}fetch("/financials/bank/mock-verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contract_id:cid})}).then(function(r){if(r.ok)history.back();else alert(r.status);});};</script></body></html>',
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    )
  ),

  http.post('*/financials/bank/mock-verify', async ({ request }) => {
    const body = (await request.json()) as { contract_id: string };
    const c = getContract(body.contract_id);
    if (!c) return HttpResponse.json({ detail: 'not_found' }, { status: 404 });
    c.commission_paid_at = new Date().toISOString();
    if (c.status === 'PENDING_COMMISSION') {
      c.status = 'DRAFT';
      setStep(c, 'SIGNING');
    }
    return HttpResponse.json({ ok: true });
  }),

  ...consultantPlatformHandlers(),

  ...workspaceOrgHandlers(),

  ...hamgitPortHandlers(),
];
