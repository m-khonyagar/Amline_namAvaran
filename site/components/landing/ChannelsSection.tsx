import { MessageCircle, Send, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { siteConfig, baleBotUrl, eitaaBotUrl, telegramBotUrl } from '@/lib/siteConfig';

const cards = [
  {
    key: 'telegram',
    name: 'تلگرام',
    desc: 'بازوی تلگرام: اعلان وضعیت قرارداد، لینک سریع به پنل و راهنمای گام‌به‌گام.',
    icon: Send,
    gradient: 'from-sky-500 to-blue-600',
    href: () => telegramBotUrl(siteConfig.bots.telegram),
  },
  {
    key: 'bale',
    name: 'بله',
    desc: 'بازوی بله با API سازگار با تلگرام — همان تجربهٔ مطمئن برای کاربران بانکی.',
    icon: MessageCircle,
    gradient: 'from-emerald-500 to-teal-600',
    href: () => baleBotUrl(siteConfig.bots.bale),
  },
  {
    key: 'eitaa',
    name: 'ایتا',
    desc: 'بازو و برنامک ایتا؛ ورود سبک داخل پیام‌رسان با وب‌اپ امن HTTPS.',
    icon: Smartphone,
    gradient: 'from-violet-500 to-purple-600',
    href: () => eitaaBotUrl(siteConfig.bots.eitaa),
  },
] as const;

export function ChannelsSection() {
  return (
    <section id="channels" className="scroll-mt-24 px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">دسترسی از پیام‌رسان</p>
          <h2 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">بازو و برنامک</h2>
          <p className="mt-4 text-slate-400">
            اَملاین را از تلگرام، بله و ایتا دنبال کنید؛ برنامک وب برای تجربهٔ تمام‌صفحه داخل ایتا و بله آماده است. آموزش‌های
            حقوقی کانال رسمی:{' '}
            <a href={siteConfig.baleChannelUrl} className="text-cyan-400 underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer">
              ble.ir/amlinebime
            </a>
            — نسخهٔ بلند و سئو‌شده در{' '}
            <a href="/blog/" className="text-cyan-400 underline-offset-2 hover:underline">
              بلاگ سایت
            </a>
            .
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {cards.map((c) => {
            const Icon = c.icon;
            const href = c.href();
            const configured = href !== '#';
            return (
              <div
                key={c.key}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur transition hover:border-white/20"
              >
                <div
                  className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${c.gradient} text-white shadow-lg`}
                >
                  <Icon className="h-6 w-6" strokeWidth={2} />
                </div>
                <h3 className="text-lg font-bold text-white">{c.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{c.desc}</p>
                {configured ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex text-sm font-semibold text-cyan-400 hover:text-cyan-300"
                  >
                    باز کردن بازو →
                  </a>
                ) : (
                  <p className="mt-5 text-xs text-slate-500">نام کاربری بازو را در تنظیمات سایت (env) قرار دهید.</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/miniapp"
            className="rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            ورود از طریق برنامک وب
          </Link>
          <a
            href={siteConfig.appUrl}
            className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            ورود مستقیم به اپلیکیشن
          </a>
        </div>
      </div>
    </section>
  );
}
