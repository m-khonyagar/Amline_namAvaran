import type { Metadata } from 'next';
import Link from 'next/link';
import { blogPosts } from '@/data/blog-posts';
import { siteConfig } from '@/lib/siteConfig';
import { JsonLd } from '@/components/JsonLd';

const base = siteConfig.siteUrl.replace(/\/$/, '');

export const metadata: Metadata = {
  title: 'بلاگ حقوقی و آموزش قرارداد ملکی',
  description:
    'مقالات آموزشی اَملاین درباره قرارداد اجاره و خرید، امضای دیجیتال، کد رهگیری، فسخ و انفساخ، و بازار مسکن — هم‌راستا با کانال رسمی بله.',
  keywords: [
    'بلاگ املاین',
    'قرارداد آنلاین ملک',
    'امضای دیجیتال',
    'کد رهگیری',
    'مستأجر',
    'مشاور املاک',
  ],
  alternates: { canonical: `${base}/blog/` },
  openGraph: {
    title: 'بلاگ اَملاین',
    description: 'آموزش قرارداد ملکی و حقوق مستأجر و مالک',
    url: `${base}/blog/`,
    locale: 'fa_IR',
    type: 'website',
  },
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function BlogIndexPage() {
  const sorted = [...blogPosts].sort(
    (a, b) => new Date(b.publishedTime).getTime() - new Date(a.publishedTime).getTime()
  );

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: sorted.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${base}/blog/${p.slug}/`,
      name: p.title,
    })),
  };

  return (
    <>
      <JsonLd data={itemList} />
      <div className="px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold text-cyan-400">مجله اَملاین</p>
          <h1 className="mt-3 text-4xl font-extrabold text-white sm:text-5xl">بلاگ قرارداد و املاک</h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-400">
            محتوا بر اساس آموزش‌های کانال رسمی اَملاین در بله بازنویسی و برای جستجو و خواندن راحت‌تر غنی شده است.
          </p>
          <a
            href={siteConfig.baleChannelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex text-sm font-semibold text-cyan-400 hover:text-cyan-300"
          >
            کانال بله: ble.ir/amlinebime ←
          </a>
        </div>

        <ul className="mx-auto mt-16 max-w-3xl space-y-4">
          {sorted.map((post) => (
            <li key={post.slug}>
              <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-cyan-500/30">
                <time className="text-xs text-slate-500" dateTime={post.publishedTime}>
                  {formatDate(post.publishedTime)}
                </time>
                <h2 className="mt-2 text-xl font-bold text-white">
                  <Link href={`/blog/${post.slug}/`} className="hover:text-cyan-300">
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{post.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {post.tags.slice(0, 4).map((t) => (
                    <span key={t} className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-slate-400">
                      {t}
                    </span>
                  ))}
                </div>
                <Link
                  href={`/blog/${post.slug}/`}
                  className="mt-4 inline-block text-sm font-semibold text-cyan-400 hover:text-cyan-300"
                >
                  ادامه مطلب ←
                </Link>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
