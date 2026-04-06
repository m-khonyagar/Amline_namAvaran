import Link from 'next/link'

const FEATURES = [
  {
    icon: '📄',
    title: 'قرارداد دیجیتال',
    desc: 'انعقاد قرارداد رهن، اجاره و خرید و فروش به‌صورت کاملاً آنلاین و بدون نیاز به حضور فیزیکی.',
  },
  {
    icon: '✍️',
    title: 'امضای الکترونیک',
    desc: 'امضای قانونی و معتبر برای همه طرفین قرارداد با تأیید هویت از طریق موبایل.',
  },
  {
    icon: '🔐',
    title: 'امنیت بالا',
    desc: 'رمزنگاری end-to-end، ذخیره‌سازی امن اسناد و دسترسی کنترل‌شده برای هر نقش.',
  },
  {
    icon: '📊',
    title: 'مدیریت یکپارچه',
    desc: 'داشبورد مدیریتی برای پیگیری وضعیت قراردادها، کاربران و گزارش‌های مالی.',
  },
  {
    icon: '⚡',
    title: 'سرعت و سادگی',
    desc: 'ویزارد گام‌به‌گام برای ثبت اطلاعات طرفین، ملک، تاریخ و شرایط مالی.',
  },
  {
    icon: '🏢',
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

export default function HomePage() {
  return (
    <>
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-[var(--amline-border)] bg-[var(--amline-surface)]/95 shadow-[var(--amline-shadow-sm)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="text-2xl font-bold text-[var(--amline-primary)]">اَملاین</span>
          <nav className="hidden items-center gap-6 text-sm font-medium text-[var(--amline-fg-muted)] sm:flex">
            <a href="#features" className="transition hover:text-[var(--amline-primary)]">ویژگی‌ها</a>
            <a href="#how" className="transition hover:text-[var(--amline-primary)]">نحوه کار</a>
            <a href="#contact" className="transition hover:text-[var(--amline-primary)]">تماس</a>
          </nav>
          <Link
            href="https://app.amline.ir"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--amline-radius-md)] bg-[var(--amline-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--amline-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--amline-ring)]"
          >
            ورود به پنل
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-[var(--amline-surface-muted)] to-[var(--amline-surface)] px-4 py-20 text-center sm:px-6 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <span className="inline-block rounded-full bg-[var(--amline-primary-muted)] px-4 py-1.5 text-xs font-semibold text-[var(--amline-primary)]">
            پلتفرم هوشمند قرارداد ملکی
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight text-[var(--amline-fg)] sm:text-5xl">
            قرارداد ملکی خود را
            <br />
            <span className="text-[var(--amline-primary)]">آنلاین و امن</span> ببندید
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--amline-fg-muted)]">
            اَملاین بستری امن برای انعقاد، امضا و مدیریت قراردادهای رهن، اجاره و خرید و فروش ملک فراهم می‌کند.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="https://app.amline.ir/contracts/wizard"
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-[var(--amline-radius-lg)] bg-[var(--amline-primary)] px-8 py-3.5 text-base font-bold text-white shadow-[var(--amline-shadow-md)] transition-colors hover:bg-[var(--amline-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--amline-ring)] sm:w-auto"
            >
              شروع رایگان
            </Link>
            <a
              href="#how"
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-[var(--amline-radius-lg)] border border-[var(--amline-border)] bg-[var(--amline-surface)] px-8 py-3.5 text-base font-semibold text-[var(--amline-fg)] transition-colors hover:bg-[var(--amline-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--amline-ring)] sm:w-auto"
            >
              نحوه کار
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-[var(--amline-border)] bg-[var(--amline-surface)] py-10">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 px-4 sm:grid-cols-4 sm:px-6">
          {[
            { val: '+۱۰۰۰', label: 'قرارداد ثبت‌شده' },
            { val: '+۵۰۰', label: 'کاربر فعال' },
            { val: '۹۹٪', label: 'رضایت کاربران' },
            { val: '۲۴/۷', label: 'پشتیبانی آنلاین' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-extrabold text-[var(--amline-primary)]">{s.val}</p>
              <p className="mt-1 text-sm text-[var(--amline-fg-muted)]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-[var(--amline-surface-muted)] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-[var(--amline-fg)]">چرا اَملاین؟</h2>
            <p className="mt-3 text-[var(--amline-fg-muted)]">همه آنچه برای یک قرارداد حرفه‌ای نیاز دارید</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-[var(--amline-radius-xl)] border border-[var(--amline-border)] bg-[var(--amline-surface)] p-6 shadow-[var(--amline-shadow-sm)] transition-shadow hover:shadow-[var(--amline-shadow-md)]"
              >
                <div className="mb-4 text-4xl">{f.icon}</div>
                <h3 className="text-lg font-bold text-[var(--amline-fg)]">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--amline-fg-muted)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-[var(--amline-surface)] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-[var(--amline-fg)]">نحوه کار</h2>
            <p className="mt-3 text-[var(--amline-fg-muted)]">در چهار گام ساده قرارداد خود را ببندید</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.num} className="relative text-center">
                {i < STEPS.length - 1 && (
                  <div className="absolute left-0 top-6 hidden h-0.5 w-full bg-[var(--amline-primary-muted)] lg:block" />
                )}
                <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--amline-primary)] text-xl font-bold text-white">
                  {s.num}
                </div>
                <h3 className="mt-4 font-bold text-[var(--amline-fg)]">{s.title}</h3>
                <p className="mt-1 text-sm text-[var(--amline-fg-muted)]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="px-4 py-16 text-center sm:px-6"
        style={{ backgroundColor: 'var(--amline-primary)' }}
      >
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold text-white">همین حالا شروع کنید</h2>
          <p className="mt-4 text-white/90">
            ثبت‌نام رایگان است. اولین قرارداد خود را در کمتر از ۱۰ دقیقه ببندید.
          </p>
          <Link
            href="https://app.amline.ir"
            className="mt-8 inline-block rounded-[var(--amline-radius-lg)] bg-[var(--amline-surface)] px-8 py-3.5 text-base font-bold text-[var(--amline-primary)] shadow-amline transition hover:opacity-95"
          >
            ورود به اَملاین
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        id="contact"
        className="border-t border-[var(--amline-border)] bg-[var(--amline-surface)] px-4 py-10 sm:px-6"
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="text-xl font-bold text-[var(--amline-primary)]">اَملاین</span>
          <p className="text-sm text-[var(--amline-fg-muted)]">
            تماس:{' '}
            <a href="mailto:info@amline.ir" className="text-[var(--amline-primary)] hover:underline">
              info@amline.ir
            </a>
          </p>
          <p className="text-xs text-[var(--amline-fg-subtle)]">© ۱۴۰۴ اَملاین — تمامی حقوق محفوظ است</p>
        </div>
      </footer>
    </>
  )
}
