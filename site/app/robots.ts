import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/siteConfig';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  const root = siteConfig.siteUrl.replace(/\/$/, '');
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${root}/sitemap.xml`,
  };
}
