import { prisma } from '@/lib/prisma';
import { route, jsonOk } from '@/lib/api';

export const dynamic = 'force-dynamic';

function match(q: string, ...texts: (string | null | undefined)[]): boolean {
  const needle = q.toLowerCase();
  return texts.some((text) => text && text.toLowerCase().includes(needle));
}

export const GET = route(async (req) => {
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() || '';

  if (q.length < 1) {
    return jsonOk({ members: [], events: [], opportunities: [], resources: [], posts: [] });
  }

  const [allProfiles, allEvents, allOpportunities, allResources, allPosts] = await Promise.all([
    prisma.memberProfile.findMany({
      where: {
        user: { status: 'ACTIVE', role: { not: 'ADMIN' } },
        privacy: { isPublic: true, searchableInDirectory: true },
      },
      select: {
        id: true,
        fullName: true,
        handle: true,
        jobTitle: true,
        org: true,
        field: true,
        headline: true,
        location: true,
        avatarUrl: true,
      },
    }),

    prisma.event.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        eventDate: true,
        location: true,
        description: true,
        venueName: true,
      },
    }),

    prisma.opportunity.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        org: true,
        type: true,
        location: true,
        description: true,
      },
    }),

    prisma.resource.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        level: true,
      },
    }),

    prisma.blogPost.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        summary: true,
      },
    }),
  ]);

  // Case-insensitive filtering across all fields
  const members = allProfiles
    .filter((m) => match(q, m.fullName, m.handle, m.jobTitle, m.org, m.field, m.headline, m.location))
    .slice(0, 5)
    .map((m) => ({
      id: m.id,
      fullName: m.fullName,
      handle: m.handle,
      jobTitle: m.jobTitle,
      org: m.org,
      field: m.field,
      avatarUrl: m.avatarUrl,
    }));

  const events = allEvents
    .filter((e) => match(q, e.title, e.description, e.location, e.venueName, e.category))
    .slice(0, 5)
    .map((e) => ({
      id: e.id,
      title: e.title,
      slug: e.slug,
      category: e.category,
      eventDate: typeof e.eventDate === 'object' && e.eventDate !== null ? (e.eventDate as Date).toISOString() : String(e.eventDate),
      location: e.location,
    }));

  const opportunities = allOpportunities
    .filter((o) => match(q, o.title, o.org, o.description, o.location, o.type))
    .slice(0, 4)
    .map((o) => ({
      id: o.id,
      title: o.title,
      slug: o.slug,
      org: o.org,
      type: o.type,
      location: o.location,
    }));

  const resources = allResources
    .filter((r) => match(q, r.title, r.summary, r.level))
    .slice(0, 4)
    .map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      level: r.level,
    }));

  const posts = allPosts
    .filter((p) => match(q, p.title, p.summary, p.category))
    .slice(0, 4)
    .map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      category: p.category,
    }));

  return jsonOk({
    members,
    events,
    opportunities,
    resources,
    posts,
  });
});
