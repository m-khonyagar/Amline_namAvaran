/**
 * Homepage contract builder showcase — decorative UI matching the reference flow:
 * steps, contract types, sample fields. RTL / Tailwind only.
 */

const STEPS = [
  'نوع قرارداد را انتخاب کنید',
  'اطلاعات طرفین',
  'مشخصات ملک',
  'شرایط قرارداد',
  'بررسی و تأیید',
  'ارسال برای امضا',
] as const

const CONTRACT_TYPES = [
  'رهن و اجاره',
  'خرید و فروش',
  'معاوضه',
  'مشارکت',
  'پیش‌فروش',
] as const

function Field({
  label,
  placeholder,
}: {
  label: string
  placeholder: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-400">{label}</span>
      <input
        readOnly
        tabIndex={-1}
        placeholder={placeholder}
        className="w-full cursor-default rounded-xl border border-white/[0.08] bg-[#050b0f]/80 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#179A9C]/40"
        dir="rtl"
      />
    </label>
  )
}

export function AmlineContractFlowSection() {
  return (
    <section
      id="contract-flow"
      dir="rtl"
      lang="fa"
      className="relative scroll-mt-20 border-t border-white/[0.06] bg-[#040910] py-16 sm:py-20 lg:py-24"
      aria-labelledby="contract-flow-title"
    >
      <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden>
        <div className="absolute left-1/2 top-0 h-64 w-[90%] -translate-x-1/2 bg-[#179A9C]/10 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-[#7dd3d5]">ارزش اصلی محصول</p>
          <h2
            id="contract-flow-title"
            className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
          >
            ساخت قرارداد
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-400 sm:text-lg">
            در چند مرحله ساده، قرارداد خود را بسازید؛ از انتخاب نوع تا ارسال برای امضا و
            دریافت کد رهگیری.
          </p>
        </div>

        <div className="mt-12 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ol className="flex min-w-max gap-2 sm:min-w-0 sm:flex-wrap sm:justify-center">
            {STEPS.map((label, i) => (
              <li
                key={label}
                className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-medium sm:text-sm ${
                  i === 0
                    ? 'border-[#179A9C]/50 bg-[#179A9C]/15 text-[#b8e8ea]'
                    : 'border-white/[0.06] bg-white/[0.02] text-slate-500'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                    i === 0
                      ? 'bg-[#179A9C] text-white'
                      : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="max-w-[10rem] leading-snug sm:max-w-none">{label}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-white/[0.08] bg-[#0a1218]/90 p-6 shadow-xl backdrop-blur-sm sm:p-8">
              <h3 className="text-lg font-bold text-white">۱. نوع قرارداد را انتخاب کنید</h3>
              <p className="mt-1 text-sm text-slate-500">
                برای هر معامله، قالب مناسب را انتخاب کنید.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {CONTRACT_TYPES.map((t) => (
                  <span
                    key={t}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      t === 'رهن و اجاره'
                        ? 'bg-[#179A9C] text-white shadow-lg shadow-[#179A9C]/25'
                        : 'border border-white/10 bg-white/[0.03] text-slate-300 hover:border-[#179A9C]/30'
                    }`}
                  >
                    {t}
                  </span>
                ))}
              </div>

              <div className="mt-8 border-t border-white/[0.06] pt-8">
                <h3 className="text-lg font-bold text-white">۲–۴. اطلاعات و شرایط</h3>
                <p className="mt-1 text-sm text-slate-500">
                  پیش‌نمایش فیلدها؛ در اپ واقعی مرحله‌به‌مرحله تکمیل می‌شود.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Field label="نام" placeholder="نام" />
                  <Field label="نام خانوادگی" placeholder="نام خانوادگی" />
                  <Field label="کد ملی" placeholder="کد ملی" />
                  <Field label="شماره تماس" placeholder="۰۹۱۲…" />
                  <Field label="آدرس ملک" placeholder="آدرس کامل" />
                  <Field label="متراژ" placeholder="مثلاً ۹۵" />
                  <Field label="مبلغ رهن (تومان)" placeholder="—" />
                  <Field label="مبلغ اجاره ماهانه (تومان)" placeholder="—" />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="overflow-hidden rounded-3xl border border-[#179A9C]/20 bg-gradient-to-br from-[#0d1f22]/90 to-[#0a1218]/95 p-6 shadow-2xl sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
                <div>
                  <p className="text-xs font-medium text-[#8ec9ca]">پیش‌نمایش قرارداد</p>
                  <p className="mt-1 text-lg font-bold text-white">رهن و اجاره</p>
                </div>
                <span className="rounded-lg border border-[#179A9C]/30 bg-[#179A9C]/10 px-3 py-1 text-xs font-bold text-[#a5e3e5]">
                  قرارداد قانونی و معتبر
                </span>
              </div>

              <dl className="mt-6 space-y-3 text-sm">
                {[
                  ['نوع قرارداد', 'رهن و اجاره'],
                  ['نام', '—'],
                  ['نام خانوادگی', '—'],
                  ['کد ملی', '—'],
                  ['شماره تماس', '—'],
                  ['آدرس ملک', '—'],
                  ['متراژ', '—'],
                  ['سال ساخت', '—'],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between gap-4 rounded-xl bg-black/20 px-4 py-2.5 ring-1 ring-white/[0.04]"
                  >
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="font-medium text-slate-200">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-8 rounded-2xl border border-white/[0.06] bg-black/25 p-5">
                <h3 className="text-base font-bold text-white">۵. بررسی و تأیید</h3>
                <div className="mt-3 flex items-start gap-3 text-sm text-slate-300">
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[#179A9C]/60 bg-[#179A9C]/25 text-xs font-bold text-[#b8e8ea]"
                    aria-hidden
                  >
                    ✓
                  </span>
                  <span>اطلاعات صحیح است</span>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/[0.06] bg-black/25 p-5">
                <h3 className="text-base font-bold text-white">۶. ارسال برای امضا</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  لینک امضا برای طرف مقابل ارسال می‌شود. پس از امضای هر دو طرف، کد رهگیری
                  صادر می‌شود.
                </p>
                <a
                  href="#contracts"
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[#179A9C] py-3.5 text-center text-base font-bold text-white shadow-lg shadow-[#179A9C]/25 transition hover:bg-[#138d8f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5eead4] sm:w-auto sm:px-10"
                >
                  ارسال لینک امضا
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AmlineContractFlowSection
