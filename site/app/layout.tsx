import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';
import { JsonLd } from '@/components/JsonLd';
import { siteConfig } from '@/lib/siteConfig';

const canonicalBase = siteConfig.siteUrl.replace(/\/$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(canonicalBase),
  title: { default: 'اَملاین — قرارداد و امضای دیجیتال املاک', template: '%s | اَملاین' },
  description:
    'انعقاد، مدیریت و امضای دیجیتال قراردادهای ملکی؛ پنل بنگاه، بلاگ حقوقی، بازو و برنامک. کانال آموزشی در بله: amlinebime',
  keywords: [
    'قرارداد ملکی',
    'قرارداد آنلاین',
    'رهن و اجاره',
    'امضای دیجیتال',
    'کد رهگیری',
    'اَملاین',
    'بازو بله',
    'مشاور املاک',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'اَملاین',
    description: 'پلتفرم قرارداد و امضای دیجیتال املاک',
    locale: 'fa_IR',
    type: 'website',
    url: canonicalBase,
    siteName: 'اَملاین',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'اَملاین — قرارداد دیجیتال املاک',
    description: 'امضای آنلاین، کد رهگیری، پنل بنگاه',
  },
  robots: { index: true, follow: true },
};

const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'اَملاین',
  url: canonicalBase,
  email: siteConfig.contactEmail,
  telephone: siteConfig.supportPhoneTel,
  sameAs: [siteConfig.baleChannelUrl, siteConfig.appUrl],
};

const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'اَملاین',
  url: canonicalBase,
  inLanguage: 'fa-IR',
  publisher: { '@type': 'Organization', name: 'اَملاین', url: canonicalBase },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <JsonLd data={organizationLd} />
        <JsonLd data={websiteLd} />
        <SiteNav />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
