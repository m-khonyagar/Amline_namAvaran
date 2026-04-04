import type { Metadata } from 'next';
import Link from 'next/link';
import { BarChart3, Shield, Users, Workflow } from 'lucide-react';
import { siteConfig } from '@/lib/siteConfig';

export const metadata: Metadata = {
  title: 'راهکار بنگاه‌ها و مشاوران — اَملاین',
  description: 'پنل چندکاربره، CRM، قرارداد دیجیتال و گزارش برای دفاتر املاک',
};

const PILLARS = [
  {
    icon: Workflow,
    title: 'قرارداد استاندارد',
    desc: 'قالب‌های رهن، اجاره و فروش با جریان امضای چندطرفه و صف حقوقی.',
  },
  {
    icon: Users,
    title: 'تیم سازمان‌یافته',
    desc: 'نقش مشاور، مدیر و پشتیبانی با دسترسی دقیق به قرارداد و سرنخ.',
  },
  {
    icon: BarChart3,
    title: 'دید عملیاتی',
    desc: 'داشبورد وضعیت قراردادها، پرداخت و فعالیت تیم در یک نگاه.',
  },
  {
    icon: Shield,
    title: 'امنیت سازمانی',
    desc: 'ممیزی رویدادها، نقش‌های سفارشی و آماده برای سیاست‌های داخلی شما.',
  },
];

export default function AgenciesPage() {
  return (
    <div className="relative px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(59,130,246,0.2),transparent)]" />
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold text-cyan-400">سازمانی</p>
        <h1 className="mt-3 text-4xl font-extrabold text-white sm:text-5xl">راهکار حرفه‌ای برای بنگاه املاک</h1>
        <p className="mt-6 text-lg leading-relaxed text-slate-400">
          اَملاین فراتر از یک فرم قرارداد است: زیرساخت روزمرهٔ دفتر شما — از ثبت سرنخ تا امضای نهایی و بایگانی دیجیتال.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href={siteConfig.appUrl}
            className="rounded-2xl bg-gradient-to-l from-blue-600 to-cyan-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/25"
          >
            درخواست دمو / ورود
          </Link>
          <Link href="/#channels" className="text-sm font-semibold text-cyan-400 hover:text-cyan-300">
            اتصال از طریق بازوها ←
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-20 grid max-w-5xl gap-6 sm:grid-cols-2">
        {PILLARS.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur"
            >
              <Icon className="h-10 w-10 text-cyan-400" strokeWidth={1.5} />
              <h2 className="mt-5 text-xl font-bold text-white">{p.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{p.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="mx-auto mt-20 max-w-2xl rounded-2xl border border-dashed border-white/15 bg-slate-900/40 p-8 text-center">
        <p className="text-sm text-slate-400">
          برای قرارداد سفارش‌سازی‌شده، اتصال API یا آموزش تیم، با ما مکاتبه کنید:
        </p>
        <a href={`mailto:${siteConfig.contactEmail}`} className="mt-3 inline-block text-lg font-semibold text-cyan-400 hover:underline">
          {siteConfig.contactEmail}
        </a>
      </div>
    </div>
  );
}
