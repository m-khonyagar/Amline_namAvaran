import { AmlineHero } from '../../components/marketing/AmlineHero'
import { AmlineContractFlowSection } from '../../components/marketing/AmlineContractFlowSection'

/**
 * صفحهٔ پیش‌نمایش: Hero قراردادمحور + بلوک «ساخت قرارداد» + لنگرها.
 */
export default function HeroPreviewPage() {
  return (
    <div className="min-h-screen bg-[#050b0f]">
      <AmlineHero adminLoginTo="/login" />

      <AmlineContractFlowSection />

      <main
        className="mx-auto max-w-6xl space-y-12 px-4 py-16 sm:px-6 sm:py-20"
        dir="rtl"
        lang="fa"
      >
        <section
          id="verify"
          className="scroll-mt-24 rounded-2xl border border-[#179A9C]/20 bg-[#0a1218]/90 p-8 shadow-xl ring-1 ring-white/5 backdrop-blur-sm"
        >
          <h2 className="text-xl font-bold text-white">استعلام اصالت قرارداد</h2>
          <p className="mt-2 leading-relaxed text-slate-400">
            اتصال به سامانهٔ رسمی یا فرم استعلام با سریال و رمز قرارداد.
          </p>
        </section>

        <section
          id="contracts"
          className="scroll-mt-24 rounded-2xl border border-white/10 bg-[#0a1218]/90 p-8 shadow-xl ring-1 ring-white/5 backdrop-blur-sm"
        >
          <h2 className="text-xl font-bold text-white">قراردادها</h2>
          <p className="mt-2 leading-relaxed text-slate-400">
            لینک «مشاهده قراردادها» به این بخش می‌آید؛ لیست یا داشبورد قرارداد در
            محصول نهایی.
          </p>
          <a
            href="#contract-flow"
            className="mt-4 inline-flex text-sm font-semibold text-[#7dd3d5] hover:underline"
          >
            ← بازگشت به ساخت قرارداد
          </a>
        </section>

        <section
          id="sample-rental"
          className="scroll-mt-24 rounded-2xl border border-white/10 bg-[#0a1218]/90 p-8 shadow-xl ring-1 ring-white/5 backdrop-blur-sm"
        >
          <h2 className="text-xl font-bold text-white">نمونه قرارداد اجاره</h2>
          <p className="mt-2 leading-relaxed text-slate-400">
            محل قرارگیری PDF یا پیش‌نمایش نمونه.
          </p>
        </section>
      </main>
    </div>
  )
}
