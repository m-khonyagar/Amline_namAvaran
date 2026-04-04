import type { MetadataRoute } from 'next';
import { blogPosts } from '@/data/blog-posts';
import { siteConfig } from '@/lib/siteConfig';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const root = siteConfig.siteUrl.replace(/\/$/, '');

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${root}/`, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${root}/agencies/`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.85 },
    { url: `${root}/miniapp/`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${root}/blog/`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.95 },
  ];

  const posts: MetadataRoute.Sitemap = blogPosts.map((p) => ({
    url: `${root}/blog/${p.slug}/`,
    lastModified: new Date(p.modifiedTime ?? p.publishedTime),
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }));

  return [...staticRoutes, ...posts];
}
