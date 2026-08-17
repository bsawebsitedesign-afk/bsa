import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';

export const revalidate = 3600;

const STATIC_ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
}> = [
  { path: '', priority: 1.0, changeFrequency: 'daily' },
  { path: '/directory', priority: 0.9, changeFrequency: 'daily' },
  { path: '/events', priority: 0.9, changeFrequency: 'daily' },
  { path: '/opportunities', priority: 0.9, changeFrequency: 'daily' },
  { path: '/resources', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/chapters', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/blog', priority: 0.8, changeFrequency: 'daily' },
  { path: '/membership', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/sponsors', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/register', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/login', priority: 0.3, changeFrequency: 'yearly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let events: any[] = [];
  let opportunities: any[] = [];
  let resources: any[] = [];
  let chapters: any[] = [];
  let posts: any[] = [];
  let members: any[] = [];

  try {
    const fetched = await Promise.all([
      prisma.event.findMany({
        where: { status: { not: 'DRAFT' } },
        select: { slug: true, updatedAt: true },
      }),
      prisma.opportunity.findMany({
        where: { isPublished: true },
        select: { slug: true, postedAt: true },
      }),
      prisma.resource.findMany({
        where: { isPublished: true },
        select: { slug: true, createdAt: true },
      }),
      prisma.chapter.findMany({
        where: { isActive: true },
        select: { slug: true, createdAt: true },
      }),
      prisma.blogPost.findMany({
        where: { isPublished: true },
        select: { slug: true, publishedAt: true },
      }),
      prisma.memberProfile.findMany({
        where: { user: { status: 'ACTIVE', role: { not: 'ADMIN' } }, privacy: { isPublic: true, searchableInDirectory: true } },
        select: { handle: true, updatedAt: true },
      }),
    ]);

    events = fetched[0];
    opportunities = fetched[1];
    resources = fetched[2];
    chapters = fetched[3];
    posts = fetched[4];
    members = fetched[5];
  } catch (err) {
    console.error('Sitemap DB query exception during build:', err);
  }

  const now = new Date();

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: `${env.appUrl}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...events.map((e) => ({
      url: `${env.appUrl}/events/${e.slug}`,
      lastModified: e.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...opportunities.map((o) => ({
      url: `${env.appUrl}/opportunities/${o.slug}`,
      lastModified: o.postedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...resources.map((r) => ({
      url: `${env.appUrl}/resources/${r.slug}`,
      lastModified: r.createdAt,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...chapters.map((c) => ({
      url: `${env.appUrl}/chapters/${c.slug}`,
      lastModified: c.createdAt,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...posts.map((p) => ({
      url: `${env.appUrl}/blog/${p.slug}`,
      lastModified: p.publishedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...members.map((m) => ({
      url: `${env.appUrl}/members/${m.handle}`,
      lastModified: m.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
  ];
}
