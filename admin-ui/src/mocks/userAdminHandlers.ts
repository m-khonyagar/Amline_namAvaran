import { http, HttpResponse } from 'msw'
import {
  findUser,
  mswAdminUsers,
  mswStaffOptions,
  mswUserPayments,
  mswUserTickets,
  mswUserTimelines,
  mswWalletLedger,
  nextUserId,
  normalizeMobile,
  type AdminUserRecord,
  type SupportTicket,
  type TicketStatus,
} from './userAdminStore'

function listItem(u: AdminUserRecord) {
  return {
    id: u.id,
    mobile: u.mobile,
    full_name: u.full_name ?? undefined,
    role: u.role,
    created_at: u.created_at,
    last_login: u.last_login ?? undefined,
    is_active: u.is_active,
    verification_status: u.verification_status,
    wallet_balance: u.wallet_balance,
    tags: u.tags,
  }
}

function detailPayload(u: AdminUserRecord) {
  return {
    ...u,
    profile: {
      avatar: null as string | null,
      birth_date: u.birth_date,
      gender: u.gender,
      address: u.address,
    },
  }
}

function computeAnalytics() {
  const now = Date.now()
  const d30 = now - 30 * 86400000
  const d7 = now - 7 * 86400000
  const newRegs30 = mswAdminUsers.filter((u) => new Date(u.created_at).getTime() >= d30).length
  const active7 = mswAdminUsers.filter(
    (u) => u.last_login && new Date(u.last_login).getTime() >= d7 && u.is_active
  ).length
  let chats = 0
  let calls = 0
  for (const evs of Object.values(mswUserTimelines)) {
    for (const e of evs) {
      const t = new Date(e.created_at).getTime()
      if (t < d30) continue
      if (e.type === 'CHAT') chats += 1
      if (e.type === 'CALL_INBOUND' || e.type === 'CALL_OUTBOUND') calls += 1
    }
  }
  const contractsCompleted30 = 34
  const commissionsPaid30 = mswUserPayments
    .filter((p) => new Date(p.created_at).getTime() >= d30 && p.status === 'PAID')
    .reduce((s, p) => s + p.amount, 0)
  const pendingVerifications = mswAdminUsers.filter((u) => u.verification_status === 'PENDING').length
  const openTickets = mswUserTickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length

  return {
    new_registrations_30d: newRegs30,
    active_users_7d: active7,
    chat_sessions_30d: chats + 180,
    voice_calls_30d: calls + 64,
    contracts_completed_30d: contractsCompleted30,
    commissions_paid_30d: commissionsPaid30,
    pending_verifications: pendingVerifications,
    open_tickets: openTickets,
    total_users: mswAdminUsers.length,
  }
}

export function userAdminHandlers() {
  return [
    http.get('*/admin/analytics/users-summary', () => HttpResponse.json(computeAnalytics())),

    http.get('*/admin/staff/options', () => HttpResponse.json({ items: mswStaffOptions })),

    http.get('*/admin/users', ({ request }) => {
      const url = new URL(request.url)
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
      const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10) || 20))
      const search = (url.searchParams.get('search') || '').trim().toLowerCase()
      const role = (url.searchParams.get('role') || '').trim()
      const verification = (url.searchParams.get('verification_status') || '').trim()
      const activeOnly = url.searchParams.get('is_active')
      let rows = [...mswAdminUsers]
      if (search) {
        rows = rows.filter(
          (u) =>
            u.mobile.includes(search) ||
            (u.full_name && u.full_name.toLowerCase().includes(search)) ||
            (u.email && u.email.toLowerCase().includes(search))
        )
      }
      if (role) rows = rows.filter((u) => u.role === role)
      if (verification) rows = rows.filter((u) => u.verification_status === verification)
      if (activeOnly === 'true') rows = rows.filter((u) => u.is_active)
      if (activeOnly === 'false') rows = rows.filter((u) => !u.is_active)
      const total = rows.length
      const start = (page - 1) * limit
      const items = rows.slice(start, start + limit).map(listItem)
      return HttpResponse.json({ items, total, page, limit })
    }),

    http.get('*/admin/users/:id', ({ params }) => {
      const u = findUser(params.id as string)
      if (!u) return HttpResponse.json({ detail: 'not_found' }, { status: 404 })
      return HttpResponse.json(detailPayload(u))
    }),

    http.patch('*/admin/users/:id', async ({ params, request }) => {
      const u = findUser(params.id as string)
      if (!u) return HttpResponse.json({ detail: 'not_found' }, { status: 404 })
      const body = (await request.json()) as Partial<AdminUserRecord> & { tags?: string[] }
      if (body.full_name !== undefined) u.full_name = body.full_name
      if (body.email !== undefined) u.email = body.email
      if (body.national_code !== undefined) u.national_code = body.national_code
      if (body.role !== undefined) u.role = body.role
      if (body.is_active !== undefined) u.is_active = body.is_active
      if (body.internal_notes !== undefined) u.internal_notes = body.internal_notes
      if (body.address !== undefined) u.address = body.address
      if (body.birth_date !== undefined) u.birth_date = body.birth_date
      if (body.gender !== undefined) u.gender = body.gender
      if (body.credit_limit !== undefined) u.credit_limit = body.credit_limit
      if (body.tags !== undefined) u.tags = body.tags
      return HttpResponse.json(detailPayload(u))
    }),

    http.post('*/admin/users/:id/verification', async ({ params, request }) => {
      const u = findUser(params.id as string)
      if (!u) return HttpResponse.json({ detail: 'not_found' }, { status: 404 })
      const body = (await request.json()) as {
        action: 'approve' | 'reject' | 'reset'
        note?: string
        staff_name?: string
      }
      const staff = body.staff_name ?? 'کارشناس'
      const now = new Date().toISOString()
      if (body.action === 'approve') {
        u.verification_status = 'VERIFIED'
        u.verified_at = now
        u.verified_by_name = staff
        u.verification_note = body.note ?? null
      } else if (body.action === 'reject') {
        u.verification_status = 'REJECTED'
        u.verified_at = now
        u.verified_by_name = staff
        u.verification_note = body.note ?? null
      } else {
        u.verification_status = 'PENDING'
        u.verified_at = null
        u.verified_by_name = null
        u.verification_note = body.note ?? null
      }
      const evs = mswUserTimelines[u.id] ?? []
      evs.unshift({
        id: `te-v-${Date.now()}`,
        user_id: u.id,
        type: 'VERIFICATION',
        title:
          body.action === 'approve'
            ? 'تأیید احراز هویت دستی'
            : body.action === 'reject'
              ? 'رد احراز هویت'
              : 'بازنشانی وضعیت احراز',
        detail: body.note ?? null,
        created_at: now,
      })
      mswUserTimelines[u.id] = evs
      return HttpResponse.json(detailPayload(u))
    }),

    http.get('*/admin/users/:id/timeline', ({ params }) => {
      const id = params.id as string
      const list = [...(mswUserTimelines[id] ?? [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      return HttpResponse.json({ items: list, total: list.length })
    }),

    http.get('*/admin/users/:id/payments', ({ params }) => {
      const id = params.id as string
      const list = mswUserPayments.filter((p) => p.user_id === id)
      return HttpResponse.json({ items: list, total: list.length })
    }),

    http.get('*/admin/users/:id/wallet/ledger', ({ params }) => {
      const id = params.id as string
      const list = mswWalletLedger.filter((l) => l.user_id === id)
      return HttpResponse.json({ items: list, total: list.length })
    }),

    http.get('*/admin/users/:id/tickets', ({ params }) => {
      const id = params.id as string
      const list = mswUserTickets.filter((t) => t.user_id === id)
      return HttpResponse.json({ items: list, total: list.length })
    }),

    http.post('*/admin/users/:id/tickets', async ({ params, request }) => {
      const uid = params.id as string
      if (!findUser(uid)) return HttpResponse.json({ detail: 'not_found' }, { status: 404 })
      const body = (await request.json()) as { subject: string; body: string; priority?: string }
      const now = new Date().toISOString()
      const t: SupportTicket = {
        id: `tk-${Date.now()}`,
        user_id: uid,
        subject: body.subject,
        body: body.body,
        status: 'OPEN',
        priority: (body.priority as SupportTicket['priority']) ?? 'NORMAL',
        assigned_to_id: null,
        assigned_to_name: null,
        referred_from_id: null,
        referred_to_name: null,
        created_at: now,
        updated_at: now,
      }
      mswUserTickets.unshift(t)
      return HttpResponse.json(t, { status: 201 })
    }),

    http.patch('*/admin/users/:userId/tickets/:ticketId', async ({ params, request }) => {
      const tid = params.ticketId as string
      const t = mswUserTickets.find((x) => x.id === tid)
      if (!t) return HttpResponse.json({ detail: 'not_found' }, { status: 404 })
      const body = (await request.json()) as {
        status?: TicketStatus
        assigned_to_id?: string | null
        refer_to_staff_id?: string | null
      }
      const now = new Date().toISOString()
      if (body.status) t.status = body.status
      if (body.refer_to_staff_id) {
        const prevName = t.assigned_to_name
        const st = mswStaffOptions.find((s) => s.id === body.refer_to_staff_id)
        t.referred_from_id = t.assigned_to_id
        t.referred_to_name = prevName ? `از ${prevName} به ${st?.name ?? ''}` : st?.name ?? null
        t.assigned_to_id = body.refer_to_staff_id
        t.assigned_to_name = st?.name ?? null
        t.status = 'REFERRED'
      } else if (body.assigned_to_id !== undefined) {
        t.assigned_to_id = body.assigned_to_id
        const st = mswStaffOptions.find((s) => s.id === body.assigned_to_id)
        t.assigned_to_name = st?.name ?? null
        if (body.assigned_to_id) t.status = 'IN_PROGRESS'
      }
      t.updated_at = now
      return HttpResponse.json(t)
    }),

    http.post('*/admin/users/bulk-import', async ({ request }) => {
      const body = (await request.json()) as { mobiles: string[]; default_role?: string }
      const role = body.default_role || 'user'
      const seen = new Set(mswAdminUsers.map((u) => u.mobile))
      let created = 0
      let skipped = 0
      for (const raw of body.mobiles || []) {
        const m = normalizeMobile(String(raw))
        if (!m || seen.has(m)) {
          skipped += 1
          continue
        }
        seen.add(m)
        const id = nextUserId()
        const u: AdminUserRecord = {
          id,
          mobile: m,
          full_name: null,
          email: null,
          national_code: null,
          role,
          is_active: true,
          created_at: new Date().toISOString(),
          last_login: null,
          verification_status: 'PENDING',
          verified_at: null,
          verified_by_name: null,
          verification_note: null,
          wallet_balance: 0,
          credit_limit: 10_000_000,
          internal_notes: 'ایجاد شده از ورود دسته‌ای',
          tags: ['import'],
          address: null,
          birth_date: null,
          gender: null,
          source: 'ورود دسته‌ای',
        }
        mswAdminUsers.push(u)
        mswUserTimelines[id] = [
          {
            id: `te-import-${Date.now()}-${id}`,
            user_id: id,
            type: 'NOTE',
            title: 'ثبت از ورود دسته‌ای ادمین',
            detail: null,
            created_at: new Date().toISOString(),
          },
        ]
        created += 1
      }
      return HttpResponse.json({ created, skipped, total: mswAdminUsers.length })
    }),
  ]
}
