import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  FileSignature,
  FileText,
  LayoutDashboard,
  Shield,
  Zap,
} from 'lucide-react'

type Feature = {
  icon: LucideIcon
  title: string
  desc: string
}

const FEATURES: Feature[] = [
  {
    icon: FileText,
    title: 'قرارداد دیجیتال',
    desc: 'انعقاد قرارداد رهن، اجاره و خرید و فروش به‌صورت کاملاً آنلاین و بدون نیاز به حضور فیزیکی.',
  },
  {
    icon: FileSignature,
    title: 'امضای الکترونیک',
    desc: 'امضای قانونی و معتبر برای همه طرفین قرارداد با تأیید هویت از طریق موبایل.',
  },
  {
    icon: Shield,
    title: 'امنیت بالا',
    desc: 'رمزنگاری end-to-end، ذخیره‌سازی امن اسناد و دسترسی کنترل‌شده برای هر نقش.',
  },
  {
    icon: LayoutDashboard,
    title: 'مدیریت یکپارچه',
    desc: 'داشبورد مدیریتی برای پیگیری وضعیت قراردادها، کاربران و گزارش‌های مالی.',
  },
  {
    icon: Zap,
    title: 'سرعت و سادگی',
    desc: 'ویزارد گام‌به‌گام برای ثبت اطلاعات طرفین، ملک، تاریخ و شرایط مالی.',
  },
  {
    icon: Building2,
    title: 'مناسب بنگاه‌ها',
    desc: 'پنل اختصاصی برای مشاوران و بنگاه‌های معاملات ملکی با مدیریت چند کاربره.',
  },
]

const STEPS = [
  { num: '۱', title: 'ثبت‌نام', desc: 'با شماره موبایل وارد شوید' },
  { num: '۲', title: 'شروع قرارداد', desc: 'نوع قرارداد را انتخاب کنید' },
  { num: '۳', title: 'تکمیل اطلاعات', desc: 'اطلاعات طرفین و ملک را وارد کنید' },
  { num: '۴', title: 'امضا و تأیید', desc: 'همه طرفین امضا می‌کنند' },
]

const navLinkClass =
  'rounded-lg px-2 py-1 text-gray-600 transition-colors duration-200 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700'

const primaryBtnClass =
  'rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-blue-800 hover:shadow-lg active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700'

const secondaryBtnClass =
  'rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700'

export default function HomePage() {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/90 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/75">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <span className="text-xl font-bold tracking-tight text-blue-800 sm:text-2xl">اَملاین</span>
          <nav className="hidden items-center gap-5 text-sm font-medium sm:flex" aria-label="ناوبری اصلی">
            <a href="#features" className={navLinkClass}>
              ویژگی‌ها
            </a>
            <a href="#how" className={navLinkClass}>
              نحوه کار
            </a>
            <a href="#contact" className={navLinkClass}>
              تماس
            </a>
          </nav>
          <Link href="https://app.amline.ir" className={primaryBtnClass}>
            ورود به پنل
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 via-white to-white px-4 py-16 text-center sm:px-6 sm:py-24">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden
        >
          <div className="absolute left-1/2 top-0 h-64 w-[28rem] -translate-x-1/2 rounded-full bg-blue-200/40 blur-3xl" />
        </div>
        <div className="mx-auto max-w-3xl">
          <span className="inline-flex items-center rounded-full bg-blue-100/90 px-4 py-1.5 text-xs font-semibold text-blue-800 ring-1 ring-blue-200/60">
            پلتفرم هوشمند قرارداد ملکی
          </span>
          <h1 className="mt-6 text-balance text-3xl font-extrabold leading-tight text-gray-900 sm:text-5xl">
            قرارداد ملکی خود را
            <br />
            <span className="bg-gradient-to-l from-blue-700 to-blue-600 bg-clip-text text-transparent">
              آنلاین و امن
            </span>{' '}
            ببندید
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-gray-600 sm:text-lg">
            اَملاین بستری امن برای انعقاد، امضا و مدیریت قراردادهای رهن، اجاره و خرید و فروش ملک فراهم می‌کند.
          </p>
          <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
            <Link
              href="https://app.amline.ir/contracts/wizard"
              className={`${primaryBtnClass} w-full px-8 py-3.5 text-base sm:w-auto`}
            >
              شروع رایگان
            </Link>
            <a href="#how" className={`${secondaryBtnClass} w-full px-8 py-3.5 text-base sm:w-auto`}>
              نحوه کار
            </a>
          </div>
        </div>
      </section>

      <section className="border-y border-gray-100 bg-white py-10">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 px-4 sm:grid-cols-4 sm:px-6">
          {[
            { val: '+۱۰۰۰', label: 'قرارداد ثبت‌شده' },
            { val: '+۵۰۰', label: 'کاربر فعال' },
            { val: '۹۹٪', label: 'رضایت کاربران' },
            { val: '۲۴/۷', label: 'پشتیبانی آنلاین' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-extrabold text-blue-700 sm:text-3xl">{s.val}</p>
              <p className="mt-1 text-xs text-gray-500 sm:text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="bg-gray-50 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">چرا اَملاین؟</h2>
            <p className="mt-3 text-sm text-gray-500 sm:text-base">همه آنچه برای یک قرارداد حرفه‌ای نیاز دارید</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition-colors duration-300 group-hover:bg-blue-100">
                    <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="how" className="bg-white px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">نحوه کار</h2>
            <p className="mt-3 text-sm text-gray-500 sm:text-base">در چهار گام ساده قرارداد خود را ببندید</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.num} className="relative text-center">
                {i < STEPS.length - 1 && (
                  <div className="absolute left-0 top-6 hidden h-0.5 w-full bg-gradient-to-l from-blue-100 to-transparent lg:block" />
                )}
                <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-700 to-blue-600 text-lg font-bold text-white shadow-md ring-4 ring-blue-50">
                  {s.num}
                </div>
                <h3 className="mt-4 font-bold text-gray-900">{s.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-blue-700 to-blue-900 px-4 py-14 text-center sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">همین حالا شروع کنید</h2>
          <p className="mt-4 text-sm leading-relaxed text-blue-100 sm:text-base">
            ثبت‌نام رایگان است. اولین قرارداد خود را در کمتر از ۱۰ دقیقه ببندید.
          </p>
          <Link
            href="https://app.amline.ir"
            className="mt-8 inline-block rounded-xl bg-white px-8 py-3.5 text-base font-bold text-blue-700 shadow-lg transition-all duration-200 hover:bg-blue-50 hover:shadow-xl active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            ورود به اَملاین
          </Link>
        </div>
      </section>

      <footer id="contact" className="border-t border-gray-100 bg-white px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-right">
          <span className="text-xl font-bold text-blue-800">اَملاین</span>
          <p className="text-sm text-gray-500">
            تماس:{' '}
            <a
              href="mailto:info@amline.ir"
              className="font-medium text-blue-600 underline-offset-2 transition-colors hover:text-blue-800 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              info@amline.ir
            </a>
          </p>
          <p className="text-xs text-gray-400">© ۱۴۰۳ اَملاین — تمامی حقوق محفوظ است</p>
        </div>
      </footer>
    </>
  )
}
