import { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';

export const dynamic = 'force-static';
export const revalidate = false;

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // Define the static pages available in your template
  const staticPages = [
    '', // Home page
    '/about',
    '/example',
  ];

  // Generate sitemap entries for all locales and static pages
  const sitemapEntries: MetadataRoute.Sitemap = routing.locales.flatMap((locale) =>
    staticPages.map((page) => ({
      url: `${baseUrl}/${locale}${page}`,
      lastModified: new Date(),
      changeFrequency: page === '' ? 'daily' : 'weekly' as const,
      priority: page === '' ? 1 : 0.8,
    }))
  );

  return sitemapEntries;
}