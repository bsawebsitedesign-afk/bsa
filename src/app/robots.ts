import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

/**
 * Everything public is crawlable. The four blocked prefixes are either
 * signed-in surfaces (nothing useful without a session), the JSON API, or the
 * payment flow - none of which should ever land in a search result.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/dashboard', '/api', '/checkout'],
      },
    ],
    sitemap: `${env.appUrl}/sitemap.xml`,
    host: env.appUrl,
  };
}
