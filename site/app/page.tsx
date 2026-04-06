اimport Link from 'next/link'

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
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="text-2xl font-bold text-blue-700">اَملاین</span>
          <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 sm:flex">
            <a href="#features" className="hover:text-blue-700">ویژگی‌ها</a>
            <a href="#how" className="hover:text-blue-700">نحوه کار</a>
            <a href="#contact" className="hover:text-blue-700">تماس</a>
          </nav>
          <Link
            href="https://app.amline.ir"
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            ورود به پنل
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-20 text-center sm:px-6 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <span className="inline-block rounded-full bg-blue-100 px-4 py-1.5 text-xs font-semibold text-blue-700">
            پلتفرم هوشمند قرارداد ملکی
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight text-gray-900 sm:text-5xl">
            قرارداد ملکی خود را
            <br />
            <span className="text-blue-700">آنلاین و امن</span> ببندید
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-gray-600">
            اَملاین بستری امن برای انعقاد، امضا و مدیریت قراردادهای رهن، اجاره و خرید و فروش ملک فراهم می‌کند.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="https://app.amline.ir/contracts/wizard"
              className="w-full rounded-xl bg-blue-700 px-8 py-3.5 text-base font-bold text-white shadow-lg hover:bg-blue-800 sm:w-auto"
            >
              شروع رایگان
            </Link>
            <a
              href="#how"
              className="w-full rounded-xl border border-gray-300 px-8 py-3.5 text-base font-semibold text-gray-700 hover:bg-gray-50 sm:w-auto"
            >
              نحوه کار
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-100 bg-white py-10">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 px-4 sm:grid-cols-4 sm:px-6">
          {[
            { val: '+۱۰۰۰', label: 'قرارداد ثبت‌شده' },
            { val: '+۵۰۰', label: 'کاربر فعال' },
            { val: '۹۹٪', label: 'رضایت کاربران' },
            { val: '۲۴/۷', label: 'پشتیبانی آنلاین' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-extrabold text-blue-700">{s.val}</p>
              <p className="mt-1 text-sm text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-50 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900">چرا اَملاین؟</h2>
            <p className="mt-3 text-gray-500">همه آنچه برای یک قرارداد حرفه‌ای نیاز دارید</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-4 text-4xl">{f.icon}</div>
                <h3 className="text-lg font-bold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-white px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900">نحوه کار</h2>
            <p className="mt-3 text-gray-500">در چهار گام ساده قرارداد خود را ببندید</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.num} className="relative text-center">
                {i < STEPS.length - 1 && (
                  <div className="absolute left-0 top-6 hidden h-0.5 w-full bg-blue-100 lg:block" />
                )}
                <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-700 text-xl font-bold text-white">
                  {s.num}
                </div>
                <h3 className="mt-4 font-bold text-gray-900">{s.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-700 px-4 py-16 text-center sm:px-6">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold text-white">همین حالا شروع کنید</h2>
          <p className="mt-4 text-blue-100">
            ثبت‌نام رایگان است. اولین قرارداد خود را در کمتر از ۱۰ دقیقه ببندید.
          </p>
          <Link
            href="https://app.amline.ir"
            className="mt-8 inline-block rounded-xl bg-white px-8 py-3.5 text-base font-bold text-blue-700 shadow hover:bg-blue-50"
          >
            ورود به اَملاین
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="border-t border-gray-100 bg-white px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="text-xl font-bold text-blue-700">اَملاین</span>
          <p className="text-sm text-gray-500">
            تماس:{' '}
            <a href="mailto:info@amline.ir" className="text-blue-600 hover:underline">
              info@amline.ir
            </a>
          </p>
          <p className="text-xs text-gray-400">© ۱۴۰۳ اَملاین — تمامی حقوق محفوظ است</p>
        </div>
      </footer>
    </>
  )
}
