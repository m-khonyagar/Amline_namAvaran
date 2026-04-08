import { http, HttpResponse } from 'msw';
import type {
  ConsultantApplicationRow,
  ConsultantApplicationStatus,
  ConsultantProfile,
} from '../types/consultant';

const CONSULTANT_TOKEN_PREFIX = 'mock-consultant-';

const consultantProfiles = new Map<string, ConsultantProfile>();
const consultantApplications: ConsultantApplicationRow[] = [];

function nowIso() {
  return new Date().toISOString();
}

function seedConsultants() {
  const id = 'cons-demo-001';
  consultantProfiles.set(id, {
    id,
    full_name: 'مشاور نمونه املاین',
    mobile: '09121112233',
    verification_tier: 'VERIFIED',
    application_status: 'APPROVED',
    credit_score: 82,
    active_contracts_count: 4,
    assigned_leads_count: 2,
  });
  consultantApplications.push({
    id: 'cap-demo-001',
    consultant_user_id: id,
    full_name: 'مشاور نمونه املاین',
    mobile: '09121112233',
    national_code: '0012345678',
    license_no: 'نظام-۱۴۰۲-۰۰۱',
    city: 'تهران',
    agency_name: 'املاک نمونه',
    status: 'APPROVED',
    reviewer_note: 'تأیید اولیه',
    submitted_at: nowIso(),
    updated_at: nowIso(),
  });
  consultantApplications.push({
    id: 'cap-pending-002',
    consultant_user_id: 'cons-pending-002',
    full_name: 'زهرا احمدی',
    mobile: '09139876543',
    national_code: '0076543210',
    license_no: 'نظام-۱۴۰۳-۱۸۸',
    city: 'اصفهان',
    agency_name: undefined,
    status: 'UNDER_REVIEW',
    submitted_at: nowIso(),
    updated_at: nowIso(),
  });
  consultantProfiles.set('cons-pending-002', {
    id: 'cons-pending-002',
    full_name: 'زهرا احمدی',
    mobile: '09139876543',
    verification_tier: 'BASIC',
    application_status: 'UNDER_REVIEW',
    credit_score: 0,
    active_contracts_count: 0,
    assigned_leads_count: 0,
  });
}

seedConsultants();

function parseConsultantAuth(request: Request): string | null {
  const h = request.headers.get('Authorization');
  if (!h?.startsWith('Bearer ')) return null;
  const t = h.slice(7);
  if (!t.startsWith(CONSULTANT_TOKEN_PREFIX)) return null;
  return t.slice(CONSULTANT_TOKEN_PREFIX.length);
}

const mockLeadsByConsultant: Record<
  string,
  Array<{ id: string; title: string; city: string; stage: string; created_at: string }>
> = {
  'cons-demo-001': [
    {
      id: 'lead-c1',
      title: 'خرید آپارتمان ۱۲۰ متری',
      city: 'تهران',
      stage: 'تماس اولیه',
      created_at: nowIso(),
    },
    {
      id: 'lead-c2',
      title: 'اجاره دفتر کار',
      city: 'تهران',
      stage: 'بازدید',
      created_at: nowIso(),
    },
  ],
};

/** فقط APIهای پنل مشاور — قابل import در consultant-ui (MSW جدا همچنان حافظهٔ جدا دارد). */
export function consultantSelfServiceHandlers() {
  return [
    http.post('*/consultant/auth/register', async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as {
        full_name?: string;
        mobile?: string;
        national_code?: string;
        license_no?: string;
        city?: string;
        agency_name?: string;
      };
      if (!body.full_name || !body.mobile || !body.national_code || !body.license_no || !body.city) {
        return HttpResponse.json({ detail: 'validation_error' }, { status: 422 });
      }
      const uid = `cons-${Date.now()}`;
      const appId = `cap-${Date.now()}`;
      const ts = nowIso();
      consultantProfiles.set(uid, {
        id: uid,
        full_name: body.full_name,
        mobile: body.mobile,
        verification_tier: 'NONE',
        application_status: 'SUBMITTED',
        credit_score: 0,
        active_contracts_count: 0,
        assigned_leads_count: 0,
      });
      consultantApplications.unshift({
        id: appId,
        consultant_user_id: uid,
        full_name: body.full_name,
        mobile: body.mobile,
        national_code: body.national_code,
        license_no: body.license_no,
        city: body.city,
        agency_name: body.agency_name,
        status: 'SUBMITTED',
        submitted_at: ts,
        updated_at: ts,
      });
      const token = `${CONSULTANT_TOKEN_PREFIX}${uid}`;
      return HttpResponse.json({
        access_token: token,
        user: consultantProfiles.get(uid),
      });
    }),

    http.post('*/consultant/auth/login', async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as { mobile?: string };
      if (!body.mobile) {
        return HttpResponse.json({ detail: 'mobile_required' }, { status: 422 });
      }
      const profile = [...consultantProfiles.values()].find((p) => p.mobile === body.mobile);
      if (!profile) {
        return HttpResponse.json({ detail: 'not_found' }, { status: 404 });
      }
      const token = `${CONSULTANT_TOKEN_PREFIX}${profile.id}`;
      return HttpResponse.json({
        access_token: token,
        user: profile,
      });
    }),

    http.get('*/consultant/me', ({ request }) => {
      const id = parseConsultantAuth(request);
      if (!id) return HttpResponse.json({ detail: 'unauthorized' }, { status: 401 });
      const p = consultantProfiles.get(id);
      if (!p) return HttpResponse.json({ detail: 'not_found' }, { status: 404 });
      return HttpResponse.json(p);
    }),

    http.get('*/consultant/application', ({ request }) => {
      const id = parseConsultantAuth(request);
      if (!id) return HttpResponse.json({ detail: 'unauthorized' }, { status: 401 });
      const row = consultantApplications.find((a) => a.consultant_user_id === id);
      if (!row) return HttpResponse.json(null);
      return HttpResponse.json(row);
    }),

    http.get('*/consultant/dashboard/summary', ({ request }) => {
      const id = parseConsultantAuth(request);
      if (!id) return HttpResponse.json({ detail: 'unauthorized' }, { status: 401 });
      const p = consultantProfiles.get(id);
      if (!p) return HttpResponse.json({ detail: 'not_found' }, { status: 404 });
      return HttpResponse.json({
        profile: p,
        benefits: {
          commission_boost_percent: p.verification_tier === 'PREMIUM' ? 5 : p.verification_tier === 'VERIFIED' ? 2 : 0,
          crm_priority: p.verification_tier !== 'NONE',
          featured_listing_slots: p.verification_tier === 'PREMIUM' ? 3 : p.verification_tier === 'VERIFIED' ? 1 : 0,
        },
        next_steps:
          p.application_status === 'APPROVED'
            ? []
            : [{ title: 'تکمیل پرونده', description: 'مدارک و تأیید هویت توسط کارشناس املاین' }],
      });
    }),

    http.get('*/consultant/leads', ({ request }) => {
      const id = parseConsultantAuth(request);
      if (!id) return HttpResponse.json({ detail: 'unauthorized' }, { status: 401 });
      const items = mockLeadsByConsultant[id] ?? [];
      return HttpResponse.json({ items, total: items.length });
    }),
  ];
}

export function consultantAdminReviewHandlers() {
  return [
    http.get('*/admin/consultants/applications', ({ request }) => {
      const u = new URL(request.url);
      const st = (u.searchParams.get('status') ?? '').trim();
      let rows = [...consultantApplications];
      if (st) rows = rows.filter((r) => r.status === st);
      return HttpResponse.json({ items: rows, total: rows.length });
    }),

    http.patch('*/admin/consultants/applications/:applicationId', async ({ params, request }) => {
      const applicationId = params.applicationId as string;
      const body = (await request.json().catch(() => ({}))) as {
        status?: ConsultantApplicationStatus;
        reviewer_note?: string;
      };
      const row = consultantApplications.find((a) => a.id === applicationId);
      if (!row) return HttpResponse.json({ detail: 'not_found' }, { status: 404 });
      if (body.status) row.status = body.status;
      if (body.reviewer_note !== undefined) row.reviewer_note = body.reviewer_note;
      row.updated_at = nowIso();
      const prof = consultantProfiles.get(row.consultant_user_id);
      if (prof) {
        prof.application_status = row.status;
        if (row.status === 'APPROVED') {
          prof.verification_tier = 'VERIFIED';
          prof.credit_score = Math.max(prof.credit_score, 70);
        }
        if (row.status === 'REJECTED') prof.verification_tier = 'NONE';
        if (row.status === 'NEEDS_INFO') prof.application_status = 'NEEDS_INFO';
      }
      return HttpResponse.json(row);
    }),
  ];
}

export function consultantPlatformHandlers() {
  return [...consultantSelfServiceHandlers(), ...consultantAdminReviewHandlers()];
}
