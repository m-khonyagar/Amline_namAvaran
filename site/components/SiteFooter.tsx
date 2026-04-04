import Link from 'next/link';
import { siteConfig, baleBotUrl, eitaaBotUrl, telegramBotUrl } from '@/lib/siteConfig';

export function SiteFooter() {
  const { bots } = siteConfig;
  return (
    <footer id="contact" className="border-t border-white/10 bg-slate-950 px-4 py-14 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-extrabold text-white">
              ا
            </span>
            <span className="text-lg font-extrabold text-white">اَملاین</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            پلتفرم قرارداد و امضای دیجیتال برای بازار املاک ایران.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">محتوا</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-400">
            <li>
              <Link href="/blog/" className="hover:text-cyan-400">
                بلاگ حقوقی
              </Link>
            </li>
            <li>
              <a href={siteConfig.baleChannelUrl} className="hover:text-cyan-400" target="_blank" rel="noopener noreferrer">
                کانال بله (amlinebime)
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">بازوها</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-400">
            <li>
              <a href={telegramBotUrl(bots.telegram)} className="hover:text-cyan-400" target="_blank" rel="noopener noreferrer">
                تلگرام
              </a>
            </li>
            <li>
              <a href={baleBotUrl(bots.bale)} className="hover:text-cyan-400" target="_blank" rel="noopener noreferrer">
                بله
              </a>
            </li>
            <li>
              <a href={eitaaBotUrl(bots.eitaa)} className="hover:text-cyan-400" target="_blank" rel="noopener noreferrer">
                ایتا
              </a>
            </li>
            <li>
              <Link href="/miniapp" className="hover:text-cyan-400">
                برنامک وب
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">تماس</p>
          <p className="mt-4 text-sm text-slate-400">
            تلفن:{' '}
            <a href={`tel:${siteConfig.supportPhoneTel}`} className="text-cyan-400 hover:underline">
              {siteConfig.supportPhoneDisplay}
            </a>
          </p>
          <p className="mt-2 text-sm text-slate-400">
            ایمیل:{' '}
            <a href={`mailto:${siteConfig.contactEmail}`} className="text-cyan-400 hover:underline">
              {siteConfig.contactEmail}
            </a>
          </p>
          <p className="mt-6 text-xs text-slate-500">© {new Date().getFullYear()} اَملاین — تمامی حقوق محفوظ است</p>
        </div>
      </div>
    </footer>
  );
}
