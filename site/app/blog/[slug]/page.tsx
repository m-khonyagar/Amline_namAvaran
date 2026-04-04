import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPostBySlug, getAllSlugs } from '@/data/blog-posts';
import { siteConfig } from '@/lib/siteConfig';
import { JsonLd } from '@/components/JsonLd';

const base = siteConfig.siteUrl.replace(/\/$/, '');

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: 'مقاله یافت نشد' };
  const url = `${base}/blog/${post.slug}/`;
  return {
    title: post.title,
    description: post.description,
    keywords: post.tags,
    authors: [{ name: post.author }],
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      locale: 'fa_IR',
      type: 'article',
      publishedTime: post.publishedTime,
      modifiedTime: post.modifiedTime,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

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

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const url = `${base}/blog/${post.slug}/`;

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedTime,
    dateModified: post.modifiedTime ?? post.publishedTime,
    author: { '@type': 'Organization', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: 'اَملاین',
      url: base,
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    inLanguage: 'fa-IR',
    keywords: post.tags.join(', '),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'خانه', item: `${base}/` },
      { '@type': 'ListItem', position: 2, name: 'بلاگ', item: `${base}/blog/` },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  };

  return (
    <>
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />
      <article className="px-4 pb-20 pt-10 sm:px-6 sm:pt-14" itemScope itemType="https://schema.org/BlogPosting">
        <div className="mx-auto max-w-3xl">
          <nav className="text-sm text-slate-500" aria-label="مسیر ناوبری">
            <Link href="/" className="hover:text-cyan-400">
              خانه
            </Link>
            <span className="mx-2">/</span>
            <Link href="/blog/" className="hover:text-cyan-400">
              بلاگ
            </Link>
          </nav>

          <header className="mt-6 border-b border-white/10 pb-8">
            <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl" itemProp="headline">
              {post.title}
            </h1>
            <p className="mt-4 text-lg text-slate-400" itemProp="description">
              {post.description}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <time dateTime={post.publishedTime} itemProp="datePublished">
                {formatDate(post.publishedTime)}
              </time>
              <span>·</span>
              <span itemProp="author">{post.author}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((t) => (
                <span key={t} className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
                  {t}
                </span>
              ))}
            </div>
          </header>

          <div className="mt-10 max-w-none">
            {post.sections.map((sec) => (
              <section key={sec.heading} className="mb-10">
                <h2 className="text-xl font-bold text-white sm:text-2xl">{sec.heading}</h2>
                {sec.paragraphs.map((para, i) => (
                  <p key={i} className="mt-4 leading-relaxed text-slate-300">
                    {para}
                  </p>
                ))}
                {sec.bullets ? (
                  <ul className="mt-4 list-disc space-y-2 pr-6 text-slate-300">
                    {sec.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          {post.relatedMedia?.length ? (
            <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="font-bold text-white">رسانه‌های مرتبط</h3>
              <ul className="mt-3 space-y-2">
                {post.relatedMedia.map((m) => (
                  <li key={m.href}>
                    <a href={m.href} className="text-cyan-400 hover:underline" target="_blank" rel="noopener noreferrer">
                      {m.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <footer className="mt-12 rounded-2xl border border-dashed border-cyan-500/30 bg-cyan-500/5 p-6 text-sm text-slate-400">
            <p>
              منبع محتوای آموزشی:{' '}
              <a
                href={siteConfig.baleChannelUrl}
                className="font-semibold text-cyan-400 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                کانال رسمی اَملاین در بله (amlinebime)
              </a>
              . متن برای وب بازنویسی و سئو شده است؛ برای احکام قطعی با وکیل یا مشاور حقوقی مشورت کنید.
            </p>
            <p className="mt-3">
              پشتیبانی:{' '}
              <a href={`tel:${siteConfig.supportPhoneTel}`} className="text-cyan-400 hover:underline">
                {siteConfig.supportPhoneDisplay}
              </a>
            </p>
          </footer>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/blog/" className="text-sm font-semibold text-cyan-400 hover:text-cyan-300">
              ← بازگشت به بلاگ
            </Link>
            <Link href={siteConfig.appUrl} className="text-sm font-semibold text-white hover:text-cyan-200">
              ورود به پنل اَملاین
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
