import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseList } from '@/lib/utils';
import {
  AdminClient,
  type AdminApplication,
  type AdminEvent,
  type AdminLead,
  type AdminMember,
  type AdminOpportunity,
  type AdminPost,
  type AdminResource,
  type AdminSponsor,
} from './admin-client';

/** Counts move every time somebody joins. Never cache this. */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin console',
  description: 'BSA back office: members, events, opportunities, partners, insights, resources and the lead inbox.',
  robots: { index: false, follow: false },
};

const DAY_MS = 86_400_000;
const GROWTH_WEEKS = 8;

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect('/login?redirect=/admin');
  if (session.role !== 'ADMIN') redirect('/dashboard');

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
  const growthSince = new Date(now.getTime() - GROWTH_WEEKS * 7 * DAY_MS);

  const [
    counts,
    memberRows,
    eventRows,
    sponsorRows,
    postRows,
    opportunityRows,
    resourceRows,
    leadRows,
    applicationRows,
    signupRows,
  ] = await Promise.all([
    Promise.all([
      prisma.user.count(),
      prisma.event.count(),
      prisma.eventRegistration.count(),
      prisma.formSubmission.count(),
      prisma.opportunity.count(),
      prisma.application.count(),
      prisma.chapter.count(),
      prisma.blogPost.count(),
      prisma.resource.count(),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ]),

    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        profile: {
          select: {
            fullName: true,
            handle: true,
            headline: true,
            org: true,
            jobTitle: true,
            field: true,
            memberType: true,
            location: true,
            yearsExperience: true,
            avatarUrl: true,
          },
        },
      },
    }),

    prisma.event.findMany({
      orderBy: { eventDate: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        fullDetails: true,
        category: true,
        eventDate: true,
        startTime: true,
        endTime: true,
        location: true,
        locationType: true,
        venueName: true,
        maxCapacity: true,
        isPaid: true,
        status: true,
        heroImageUrl: true,
        cpdHours: true,
        tickets: { orderBy: { price: 'asc' }, take: 1, select: { name: true, price: true, currency: true } },
        _count: { select: { registrations: true } },
      },
    }),

    prisma.sponsor.findMany({
      orderBy: [{ tier: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        logoUrl: true,
        tier: true,
        description: true,
        websiteUrl: true,
        ctaText: true,
        ctaUrl: true,
        isHiring: true,
        perkText: true,
        isPublished: true,
      },
    }),

    prisma.blogPost.findMany({
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        content: true,
        category: true,
        tags: true,
        imageUrl: true,
        authorName: true,
        authorTitle: true,
        authorAvatar: true,
        publishedAt: true,
        isFeatured: true,
        isPublished: true,
        readTimeMinutes: true,
      },
    }),

    prisma.opportunity.findMany({
      orderBy: { postedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        org: true,
        logoUrl: true,
        coverImageUrl: true,
        type: true,
        locationType: true,
        location: true,
        compensation: true,
        description: true,
        requirements: true,
        applyUrl: true,
        deadline: true,
        isPublished: true,
        postedAt: true,
        _count: { select: { applications: true } },
      },
    }),

    prisma.resource.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        level: true,
        emoji: true,
        estHours: true,
        isPublished: true,
        _count: { select: { modules: true } },
      },
    }),

    prisma.formSubmission.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        formType: true,
        source: true,
        campaign: true,
        message: true,
        hubspotStatus: true,
        isHandled: true,
        createdAt: true,
      },
    }),

    prisma.application.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        org: true,
        profileUrl: true,
        note: true,
        status: true,
        createdAt: true,
        opportunity: { select: { title: true, slug: true, org: true } },
      },
    }),

    prisma.user.findMany({
      where: { createdAt: { gte: growthSince } },
      select: { createdAt: true },
    }),
  ]);

  const [
    memberCount,
    eventCount,
    registrationCount,
    leadCount,
    opportunityCount,
    applicationCount,
    chapterCount,
    postCount,
    resourceCount,
    newMembers7,
    newMembers30,
  ] = counts;

  /* Weekly signup buckets. Bucketed on the server so the client never renders a
 clock-dependent value during hydration. */
  const signups = Array.from({ length: GROWTH_WEEKS }, (_, index) => {
    const start = new Date(now.getTime() - (GROWTH_WEEKS - index) * 7 * DAY_MS);
    const end = new Date(now.getTime() - (GROWTH_WEEKS - 1 - index) * 7 * DAY_MS);
    const count = signupRows.filter((row) => row.createdAt >= start && row.createdAt < end).length;
    return { label: `${start.getDate()}/${start.getMonth() + 1}`, count };
  });

  const members: AdminMember[] = memberRows.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status || 'ACTIVE',
    emailVerified: row.emailVerified,
    createdAt: row.createdAt.toISOString(),
    fullName: row.profile?.fullName ?? row.email.split('@')[0],
    handle: row.profile?.handle ?? null,
    headline: row.profile?.headline ?? '',
    org: row.profile?.org ?? '-',
    jobTitle: row.profile?.jobTitle ?? '',
    field: row.profile?.field ?? '',
    memberType: row.profile?.memberType ?? 'PROFESSIONAL',
    location: row.profile?.location ?? '',
    yearsExperience: row.profile?.yearsExperience ?? null,
    avatarUrl: row.profile?.avatarUrl ?? null,
    hasProfile: Boolean(row.profile),
  }));

  const events: AdminEvent[] = eventRows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    fullDetails: row.fullDetails,
    category: row.category,
    eventDate: row.eventDate.toISOString(),
    startTime: row.startTime,
    endTime: row.endTime,
    location: row.location,
    locationType: row.locationType,
    venueName: row.venueName,
    maxCapacity: row.maxCapacity,
    isPaid: row.isPaid,
    status: row.status,
    heroImageUrl: row.heroImageUrl,
    cpdHours: row.cpdHours,
    registrations: row._count.registrations,
    ticketName: row.tickets[0]?.name ?? 'Member Registration',
    ticketPrice: row.tickets[0]?.price ?? 0,
    ticketCurrency: row.tickets[0]?.currency ?? 'USD',
  }));

  const opportunities: AdminOpportunity[] = opportunityRows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    org: row.org,
    logoUrl: row.logoUrl,
    coverImageUrl: row.coverImageUrl,
    type: row.type,
    locationType: row.locationType,
    location: row.location,
    compensation: row.compensation,
    description: row.description,
    requirements: parseList(row.requirements),
    applyUrl: row.applyUrl,
    deadline: row.deadline ? row.deadline.toISOString() : null,
    daysLeft: row.deadline ? Math.ceil((row.deadline.getTime() - now.getTime()) / DAY_MS) : null,
    isPublished: row.isPublished,
    postedAt: row.postedAt.toISOString(),
    applications: row._count.applications,
  }));

  const sponsors: AdminSponsor[] = sponsorRows.map((row) => ({ ...row }));

  const posts: AdminPost[] = postRows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    content: row.content,
    category: row.category,
    tags: parseList(row.tags),
    imageUrl: row.imageUrl,
    authorName: row.authorName,
    authorTitle: row.authorTitle,
    authorAvatar: row.authorAvatar,
    publishedAt: row.publishedAt.toISOString(),
    isFeatured: row.isFeatured,
    isPublished: row.isPublished,
    readTimeMinutes: row.readTimeMinutes,
  }));

  const resources: AdminResource[] = resourceRows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    level: row.level,
    emoji: row.emoji,
    estHours: row.estHours,
    isPublished: row.isPublished,
    modules: row._count.modules,
  }));

  const leads: AdminLead[] = leadRows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    company: row.company,
    formType: row.formType,
    source: row.source,
    campaign: row.campaign,
    message: row.message,
    hubspotStatus: row.hubspotStatus,
    isHandled: row.isHandled,
    createdAt: row.createdAt.toISOString(),
  }));

  const applications: AdminApplication[] = applicationRows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    org: row.org,
    profileUrl: row.profileUrl,
    note: row.note,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    opportunityTitle: row.opportunity.title,
    opportunitySlug: row.opportunity.slug,
    opportunityOrg: row.opportunity.org,
  }));

  return (
    <AdminClient
      adminEmail={session.email}
      adminUserId={session.userId}
      counts={{
        members: memberCount,
        events: eventCount,
        registrations: registrationCount,
        leads: leadCount,
        opportunities: opportunityCount,
        applications: applicationCount,
        chapters: chapterCount,
        posts: postCount,
        resources: resourceCount,
        newMembers7,
        newMembers30,
      }}
      signups={signups}
      members={members}
      events={events}
      opportunities={opportunities}
      applications={applications}
      sponsors={sponsors}
      posts={posts}
      resources={resources}
      leads={leads}
    />
  );
}
