import { HamgitPlaceholderPage } from './HamgitPlaceholderPage'
import { SettlementsHamgitPage } from './SettlementsHamgitPage'
import { CustomInvoicesHamgitPage } from './CustomInvoicesHamgitPage'

export function HamgitRequirementsPage() {
  return (
    <HamgitPlaceholderPage
      title="نیازمندی‌ها (خرید، رهن، معاوضه)"
      description="هم‌راستا با منوی «نیازمندی‌ها» در Hamgit؛ دادهٔ نمونه در dev-mock به‌صورت لیست خالی برمی‌گردد."
      hamgitPaths={[
        '/requirements/buy-and-rental',
        '/requirements/buy-and-rental/create',
        '/requirements/barter',
        '/requirements/barter/create',
      ]}
      endpoints={[
        'GET /admin/ads/wanted/properties',
        'GET /admin/ads/swaps',
        '(و مسیرهای PATCH/POST مربوط در backend کامل)',
      ]}
    />
  )
}

export function HamgitAdsAdvancedPage() {
  return (
    <HamgitPlaceholderPage
      title="آگهی‌ها — ملک و بازدید"
      description="CRUD ملک و درخواست بازدید؛ مکمل صفحهٔ سادهٔ «آگهی‌ها» در منوی اصلی."
      hamgitPaths={['/ads/list', '/ads/list/create', '/ads/visit-requests']}
      endpoints={['GET /admin/ads/properties', 'GET /admin/ads/visit-requests']}
    />
  )
}

export function HamgitSettlementsPage() {
  return <SettlementsHamgitPage />
}

export function HamgitInvoicesPage() {
  return <CustomInvoicesHamgitPage />
}

export function HamgitClausesPage() {
  return (
    <HamgitPlaceholderPage
      title="بندهای پیش‌فرض قرارداد"
      description="بندهای پایهٔ عادی و ضمانتی در Hamgit."
      hamgitPaths={['/clauses/default', '/clauses/guaranteed']}
      endpoints={['GET /admin/contracts/base-clauses']}
    />
  )
}

export function HamgitPromoPage() {
  return (
    <HamgitPlaceholderPage
      title="کدهای تخفیف"
      description="تولید و لیست promos در لایهٔ financials."
      hamgitPaths={['/promo-codes', '/promo-codes/create']}
      endpoints={[
        'GET /financials/promos',
        'POST /financials/promos/generate',
        'POST /financials/promos/bulk-generate',
      ]}
    />
  )
}

export function HamgitMarketPage() {
  return (
    <HamgitPlaceholderPage
      title="بازار (Market)"
      description="فایل خرید/فروش، رهن/اجاره، مشاور املاک، وظایف، تنظیمات — بزرگ‌ترین حوزهٔ Hamgit؛ نیاز به پورت مرحله‌ای دارد."
      hamgitPaths={[
        '/market/buy-sell/buyer',
        '/market/deposit-rent/landlord',
        '/market/realtor',
        '/market/task',
        '/market/settings',
      ]}
      endpoints={['(ده‌ها endpoint در .reference — فاز بعد)']}
    />
  )
}

export function HamgitWalletToolsPage() {
  return (
    <HamgitPlaceholderPage
      title="ابزار کیف پول ادمین"
      description="لیست از مسیر financials و شارژ دستی؛ صفحهٔ «کیف پول» اصلی همچنان /wallets است."
      hamgitPaths={['/wallets/manual-charge']}
      endpoints={[
        'GET /admin/financials/wallets',
        'POST /admin/financials/wallets/manual-charge',
        'POST /admin/financials/wallets/bulk-manual-charge',
      ]}
    />
  )
}
