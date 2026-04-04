/**
 * دادهٔ نمایشی یک‌بار برای MSW — کاربران، قراردادها، CRM، اعلان‌ها، حقوقی، آگهی.
 * فقط وقتی دایرکتوری کاربران خالی است اجرا می‌شود تا از راه‌اندازی مضاعف جلوگیری شود.
 */

export type MswDirectoryUser = {
  id: string
  mobile: string
  full_name: string
  role: string
  created_at: string
  last_login?: string
  is_active: boolean
  national_id?: string
  email?: string
  wallet_balance?: number
}

export type MswContractSeed = {
  id: string
  type: string
  status: string
  step: string
  parties: Record<string, unknown[]>
  created_at: string
  /** فیلتر لیست قراردادها per کاربر در صفحهٔ جزئیات کاربر */
  user_id?: string
}

export type MswListingSeed = {
  id: string
  title: string
  deal_type: string
  status: string
  price_amount: string
  currency: string
  location_summary: string
  visibility: string
  latitude?: string | null
  longitude?: string | null
}

export type MswLegalReviewSeed = {
  id: string
  contract_id: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  comment: string | null
  reviewer_id: string | null
  created_at: string
  decided_at: string | null
}

type SeedDeps = {
  directoryUsers: MswDirectoryUser[]
  contracts: Map<string, MswContractSeed>
  idCounterRef: { current: number }
  crmLeads: Record<string, unknown>[]
  notifications: Array<{
    id: string
    title: string
    body: string
    read: boolean
    created_at: string
    type?: string
  }>
  legalReviews: MswLegalReviewSeed[]
  listingRows: MswListingSeed[]
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString()
}

export function seedRichMswDemoIfNeeded(deps: SeedDeps): void {
  if (deps.directoryUsers.length > 0) return

  const adminLogin = daysAgo(0)
  deps.directoryUsers.push(
    {
      id: 'mock-001',
      mobile: '09120000000',
      full_name: 'کاربر آزمایشی (مدیر)',
      role: 'admin',
      created_at: daysAgo(400),
      last_login: adminLogin,
      is_active: true,
      national_id: '0012345678',
      email: 'admin@demo.amline.local',
      wallet_balance: 125_000_000,
    },
    {
      id: 'user-002',
      mobile: '09121111111',
      full_name: 'فاطمه کریمی',
      role: 'user',
      created_at: daysAgo(120),
      last_login: daysAgo(1),
      is_active: true,
      national_id: '0498765432',
      email: 'f.karimi@demo.local',
      wallet_balance: 0,
    },
    {
      id: 'realtor-003',
      mobile: '09132222222',
      full_name: 'مهدی نظری (مشاور)',
      role: 'realtor',
      created_at: daysAgo(200),
      last_login: daysAgo(0),
      is_active: true,
      wallet_balance: 450_000_000,
    },
    {
      id: 'user-004',
      mobile: '09123333333',
      full_name: 'زهرا احمدی',
      role: 'user',
      created_at: daysAgo(60),
      last_login: daysAgo(14),
      is_active: true,
    },
    {
      id: 'realtor-005',
      mobile: '09124444444',
      full_name: 'علی موسوی',
      role: 'realtor',
      created_at: daysAgo(90),
      last_login: daysAgo(3),
      is_active: true,
    },
    {
      id: 'user-006',
      mobile: '09125555555',
      full_name: 'حسین رضایی',
      role: 'user',
      created_at: daysAgo(30),
      is_active: false,
      last_login: daysAgo(90),
    },
    {
      id: 'acc-007',
      mobile: '09126666666',
      full_name: 'سارا حسینی (حسابدار)',
      role: 'accountant',
      created_at: daysAgo(300),
      last_login: daysAgo(2),
      is_active: true,
    },
    {
      id: 'user-008',
      mobile: '09127777777',
      full_name: 'نرگس صادقی',
      role: 'user',
      created_at: daysAgo(7),
      last_login: daysAgo(7),
      is_active: true,
    }
  )

  const L = (
    id: string,
    type: string,
    status: string,
    step: string,
    days: number,
    user_id: string,
    parties?: Record<string, unknown[]>
  ): MswContractSeed => ({
    id,
    type,
    status,
    step,
    parties: parties ?? {},
    created_at: daysAgo(days),
    user_id,
  })

  deps.contracts.set(
    'contract-001',
    L('contract-001', 'PROPERTY_RENT', 'DRAFT', 'TENANT_INFORMATION', 3, 'user-002', {
      landlords: [{ id: 'pl1', full_name: 'مالک نمونه' }],
    })
  )
  deps.contracts.set(
    'contract-002',
    L('contract-002', 'PROPERTY_RENT', 'DRAFT', 'PLACE_INFORMATION', 5, 'realtor-003', {
      landlords: [{ id: 'pl2', full_name: 'موجر — در حال تکمیل' }],
      tenants: [{ id: 'pt2', full_name: 'مستأجر ثبت‌شده' }],
    })
  )
  deps.contracts.set(
    'contract-003',
    L('contract-003', 'PROPERTY_RENT', 'ONE_PARTY_SIGNED', 'SIGNING', 8, 'realtor-003')
  )
  deps.contracts.set(
    'contract-004',
    L('contract-004', 'PROPERTY_RENT', 'PENDING_ADMIN_APPROVAL', 'FINISH', 10, 'user-002')
  )
  deps.contracts.set(
    'contract-005',
    L('contract-005', 'PROPERTY_RENT', 'ACTIVE', 'FINISH', 25, 'realtor-005', {
      landlords: [{ id: 'a1', full_name: 'موجر فعال' }],
      tenants: [{ id: 'a2', full_name: 'مستأجر فعال' }],
    })
  )
  deps.contracts.set(
    'contract-006',
    L('contract-006', 'PROPERTY_RENT', 'PENDING_COMMISSION', 'FINISH', 12, 'realtor-003')
  )
  deps.contracts.set(
    'contract-007',
    L('contract-007', 'PROPERTY_RENT', 'COMPLETED', 'FINISH', 40, 'user-004', {
      landlords: [{ id: 'c1', full_name: 'موجر — پرونده بسته' }],
      tenants: [{ id: 'c2', full_name: 'مستأجر' }],
    })
  )
  deps.contracts.set(
    'contract-008',
    L('contract-008', 'PROPERTY_RENT', 'ADMIN_REJECTED', 'FINISH', 15, 'user-006')
  )
  deps.contracts.set(
    'contract-009',
    L('contract-009', 'PROPERTY_RENT', 'REVOKED', 'FINISH', 50, 'user-002')
  )
  deps.contracts.set(
    'contract-010',
    L('contract-010', 'PROPERTY_RENT', 'FULLY_SIGNED', 'SIGNING', 6, 'realtor-005')
  )
  deps.contracts.set(
    'contract-011',
    L('contract-011', 'BUYING_AND_SELLING', 'DRAFT', 'LANDLORD_INFORMATION', 2, 'realtor-003')
  )

  deps.idCounterRef.current = 12

  const now = new Date().toISOString()
  if (deps.crmLeads.length === 0) {
    const row = (o: Record<string, unknown>) => ({ ...o, created_at: now, updated_at: now })
    deps.crmLeads.push(
      row({
        id: 'crm-seed-1',
        source: 'WEB',
        full_name: 'علی احمدی',
        mobile: '09120000000',
        need_type: 'RENT',
        status: 'NEW',
        notes: 'سرنخ تازه — تماس نگرفته',
      }),
      row({
        id: 'crm-seed-2',
        source: 'REFERRAL',
        full_name: 'مریم کریمی',
        mobile: '09121111111',
        need_type: 'BUY',
        status: 'CONTACTED',
        notes: 'پیگیری اول انجام شد',
      }),
      row({
        id: 'crm-seed-3',
        source: 'WEB',
        full_name: 'رضا محمدی',
        mobile: '09122222222',
        need_type: 'RENT',
        status: 'QUALIFIED',
        contract_id: 'contract-005',
      }),
      row({
        id: 'crm-seed-4',
        full_name: 'نگین فرهادی',
        mobile: '09123333333',
        need_type: 'SELL',
        status: 'NEGOTIATING',
        notes: 'در حال مذاکره قیمت',
      }),
      row({
        id: 'crm-seed-5',
        full_name: 'پویا امینی',
        mobile: '09124444444',
        need_type: 'RENT',
        status: 'NEGOTIATING',
      }),
      row({
        id: 'crm-seed-6',
        full_name: 'لیلا نوری',
        mobile: '09125555555',
        need_type: 'BUY',
        status: 'LOST',
        notes: 'انصراف مشتری',
      }),
      row({
        id: 'crm-seed-7',
        full_name: 'کامران جعفری',
        mobile: '09126666666',
        need_type: 'RENT',
        status: 'CONTRACTED',
        contract_id: 'contract-007',
      }),
      row({
        id: 'crm-seed-8',
        full_name: 'سمانه طالبی',
        mobile: '09127777777',
        need_type: 'RENT',
        status: 'NEW',
        assigned_to: 'realtor-003',
      })
    )
  }

  deps.notifications.push(
    {
      id: 'n-demo-2',
      title: 'قرارداد در انتظار تأیید ادمین',
      body: 'قرارداد contract-004 نیاز به بررسی دارد.',
      read: false,
      created_at: daysAgo(0),
      type: 'legal',
    },
    {
      id: 'n-demo-3',
      title: 'کمیسیون ثبت شد',
      body: 'پروندهٔ contract-006 در صف پرداخت کمیسیون است.',
      read: true,
      created_at: daysAgo(1),
      type: 'billing',
    },
    {
      id: 'n-demo-4',
      title: 'سرنخ جدید CRM',
      body: 'یک لید جدید از وب ثبت شد.',
      read: false,
      created_at: daysAgo(2),
      type: 'crm',
    }
  )

  deps.legalReviews.push(
    {
      id: 'leg-demo-1',
      contract_id: 'contract-004',
      status: 'PENDING',
      comment: null,
      reviewer_id: null,
      created_at: daysAgo(1),
      decided_at: null,
    },
    {
      id: 'leg-demo-2',
      contract_id: 'contract-007',
      status: 'APPROVED',
      comment: 'تأیید نمونه',
      reviewer_id: 'mock-001',
      created_at: daysAgo(30),
      decided_at: daysAgo(29),
    },
    {
      id: 'leg-demo-3',
      contract_id: 'contract-008',
      status: 'REJECTED',
      comment: 'نقص مدارک',
      reviewer_id: 'mock-001',
      created_at: daysAgo(14),
      decided_at: daysAgo(13),
    }
  )

  deps.listingRows.push(
    {
      id: 'lst-001',
      title: 'آپارتمان ۹۵ متری ولنجک',
      deal_type: 'SALE',
      status: 'PUBLISHED',
      price_amount: '18500000000',
      currency: 'IRR',
      location_summary: 'تهران، ولنجک',
      visibility: 'PUBLIC',
      latitude: '35.805',
      longitude: '51.395',
    },
    {
      id: 'lst-002',
      title: 'اجارهٔ موقعیت اداری میدان ونک',
      deal_type: 'RENT_MONTHLY',
      status: 'PUBLISHED',
      price_amount: '85000000',
      currency: 'IRR',
      location_summary: 'تهران، ونک',
      visibility: 'PUBLIC',
      latitude: '35.757',
      longitude: '51.411',
    },
    {
      id: 'lst-003',
      title: 'زمین مسکونی ۲۰۰ متر کرج',
      deal_type: 'SALE',
      status: 'DRAFT',
      price_amount: '0',
      currency: 'IRR',
      location_summary: 'کرج، گلشهر',
      visibility: 'PRIVATE',
    },
    {
      id: 'lst-004',
      title: 'ویلا نیم‌کاره شمال',
      deal_type: 'SALE',
      status: 'PUBLISHED',
      price_amount: '52000000000',
      currency: 'IRR',
      location_summary: 'مازندران، نوشهر',
      visibility: 'PUBLIC',
    },
    {
      id: 'lst-005',
      title: 'رهن کامل — مغازه تجریش',
      deal_type: 'RENT_DEPOSIT',
      status: 'ARCHIVED',
      price_amount: '5000000000',
      currency: 'IRR',
      location_summary: 'تهران، تجریش',
      visibility: 'PUBLIC',
    }
  )
}
