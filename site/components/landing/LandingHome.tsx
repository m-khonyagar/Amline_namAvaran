'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Building2,
  FileSignature,
  Lock,
  LayoutDashboard,
  Zap,
  Users,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { siteConfig } from '@/lib/siteConfig';
import { ChannelsSection } from './ChannelsSection';

const FEATURES = [
  {
    icon: FileSignature,
    title: 'قرارداد دیجیتال',
    desc: 'رهن، اجاره و خرید و فروش با ویزارد گام‌به‌گام و متن حقوقی استاندارد.',
  },
  {
    icon: Lock,
    title: 'امضا و هویت',
    desc: 'تأیید موبایل، نقش‌های طرفین و ردپای ممیزی برای هر رویداد.',
  },
  {
    icon: LayoutDashboard,
    title: 'پنل یکپارچه',
    desc: 'داشبورد بنگاه، CRM، کیف و گزارش — همه در یک اکوسیستم.',
  },
  {
    icon: Zap,
    title: 'سرعت عمل',
    desc: 'کمتر از یک جلسه کاری از پیش‌نویس تا امضای چندطرفه.',
  },
  {
    icon: Users,
    title: 'چند کاربره',
    desc: 'نقش ادمین، مشاور و حقیقی با دسترسی کنترل‌شده.',
  },
  {
    icon: Building2,
    title: 'مقیاس‌پذیر',
    desc: 'مناسب دفتر کوچک تا شبکهٔ شعب با یک قرارداد منبع واحد.',
  },
];

const STEPS = [
  { num: '۱', title: 'ثبت‌نام', desc: 'با شماره موبایل وارد شوید' },
  { num: '۲', title: 'نوع قرارداد', desc: 'رهن، اجاره یا فروش' },
  { num: '۳', title: 'اطلاعات طرفین', desc: 'ملک، شرایط مالی، ضمایم' },
  { num: '۴', title: 'امضا و اجرا', desc: 'همه طرفین امضا؛ پیگیری وضعیت' },
];

const fade = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };

export function LandingHome() {
  return (
    <>
      <section className="relative overflow-hidden px-4 pb-20 pt-12 sm:px-6 sm:pb-28 sm:pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.35),transparent)]" />
        <div className="pointer-events-none absolute right-0 top-1/3 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <motion.div {...fade}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-cyan-300 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              پلتفرم قرارداد و امضای دیجیتال املاک
            </span>
          </motion.div>
          <motion.h1
            className="mt-8 text-4xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-5xl md:text-6xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            قرارداد ملکی
            <br />
            <span className="bg-gradient-to-l from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
              حرفه‌ای، آنلاین، امن
            </span>
          </motion.h1>
          <motion.p
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            اَملاین زیرساخت انعقاد، امضا و مدیریت چرخهٔ قرارداد را برای بنگاه‌ها، مالک و مستأجر در یک تجربهٔ فارسی و
            راست‌به‌چپ فراهم می‌کند.
          </motion.p>
          <motion.div
            className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            <Link
              href={`${siteConfig.appUrl}/contracts/wizard`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-blue-600 to-cyan-500 px-8 py-4 text-base font-bold text-white shadow-xl shadow-blue-600/25 transition hover:brightness-110 sm:w-auto"
            >
              شروع رایگان
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link
              href="/agencies/"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur transition hover:bg-white/10 sm:w-auto"
            >
              راهکار بنگاه‌ها
            </Link>
            <Link
              href="/blog/"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-8 py-4 text-base font-semibold text-cyan-200 backdrop-blur transition hover:bg-cyan-500/20 sm:w-auto"
            >
              بلاگ حقوقی
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="border-y border-white/5 bg-white/[0.02] px-4 py-12 sm:px-6">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 sm:grid-cols-4">
          {[
            { val: 'سریع', label: 'از پیش‌نویس تا امضا' },
            { val: 'امن', label: 'کنترل دسترسی و ممیزی' },
            { val: 'یکپارچه', label: 'قرارداد + CRM' },
            { val: 'پشتیبانی', label: 'ایمیل و بازوها' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-extrabold text-white sm:text-3xl">{s.val}</p>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="scroll-mt-24 px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">چرا اَملاین؟</h2>
            <p className="mt-3 text-slate-400">طراحی‌شده برای واقعیت معاملات ملکی در ایران</p>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.45 }}
                  className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-6 backdrop-blur transition hover:border-cyan-500/30"
                >
                  <Icon className="h-9 w-9 text-cyan-400" strokeWidth={1.5} />
                  <h3 className="mt-4 text-lg font-bold text-white">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how" className="scroll-mt-24 border-t border-white/5 bg-slate-900/50 px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">نحوه کار</h2>
            <p className="mt-3 text-slate-400">چهار گام تا قرارداد آماده</p>
          </div>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.num} className="relative text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-xl font-extrabold text-white shadow-lg">
                  {s.num}
                </div>
                {i < STEPS.length - 1 ? (
                  <div className="absolute left-0 top-7 hidden h-0.5 w-full bg-gradient-to-l from-transparent via-white/10 to-transparent lg:block" />
                ) : null}
                <h3 className="mt-5 font-bold text-white">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ChannelsSection />

      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-blue-600/20 via-slate-900 to-cyan-600/10 px-6 py-14 text-center sm:px-12">
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl">همین حالا امتحان کنید</h2>
          <p className="mx-auto mt-4 max-w-lg text-slate-300">
            ثبت‌نام سریع با موبایل؛ بدون نصب اجباری — از مرورگر یا برنامک پیام‌رسان وارد شوید.
          </p>
          <Link
            href={siteConfig.appUrl}
            className="mt-8 inline-flex rounded-2xl bg-white px-8 py-4 text-base font-bold text-slate-900 shadow-xl transition hover:bg-slate-100"
          >
            ورود به اَملاین
          </Link>
        </div>
      </section>
    </>
  );
}
