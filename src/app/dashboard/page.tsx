import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Chip, LiveDot } from '@/components/ui/badge';
import { Marquee } from '@/components/ui/marquee';
import { Reveal } from '@/components/ui/reveal';
import { formatDate, parseList } from '@/lib/utils';
import {
  DashboardClient,
  type DashApplication,
  type DashMembership,
  type DashModuleDone,
  type DashPrivacy,
  type DashProfileForm,
  type DashRegistration,
  type DashStats,
  type DirectoryVisibility,
  type SuggestedChapter,
  type SuggestedEvent,
  type SuggestedResource,
  type TabKey,
} from './dashboard-client';

/**
 * Everything here is one member's private state - a registration that settled
 * ninety seconds ago, a privacy switch flipped in another tab. Caching any of
 * it would be a bug rather than an optimisation.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your dashboard',
  description:
    'Your BSA member record: profile, directory visibility, event registrations, CPD hours, resources and chapter memberships.',
  robots: { index: false, follow: false },
};

const TAB_KEYS: readonly TabKey[] = ['overview', 'profile', 'privacy', 'security', 'activity'];

function pickTab(value?: string | string[]): TabKey {
  const raw = (Array.isArray(value) ? value[0] : value)?.toLowerCase() ?? '';
  return (TAB_KEYS as readonly string[]).includes(raw) ? (raw as TabKey) : 'overview';
}

function firstParam(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const QUICK_LINKS = [
  { href: '/directory', label: 'Directory', blurb: 'Find a member' },
  { href: '/events', label: 'Events', blurb: 'Book a place' },
  { href: '/resources', label: 'Resources', blurb: 'Read something' },
  { href: '/chapters', label: 'Chapters', blurb: 'Meet in person' },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { denied?: string | string[]; tab?: string | string[] };
}) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const deniedAdmin = firstParam(searchParams?.denied) === 'admin';
  const initialTab = pickTab(searchParams?.tab);

  let user: any = null;
  try {
    user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
      id: true,
      email: true,
      role: true,
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
          bio: true,
          yearsExperience: true,
          phone: true,
          contactEmail: true,
          avatarUrl: true,
          linkedinUrl: true,
          websiteUrl: true,
          specialties: true,
          skills: true,
          openToOpportunities: true,
          openToMentoring: true,
          openToSpeaking: true,
          privacy: {
            select: {
              isPublic: true,
              searchableInDirectory: true,
              showEmail: true,
              showPhone: true,
              showOrg: true,
              showLinkedIn: true,
              showWebsite: true,
            },
          },
        },
      },
      registrations: {
        orderBy: { registeredAt: 'desc' },
        select: {
          id: true,
          registrationCode: true,
          status: true,
          registeredAt: true,
          event: {
            select: {
              slug: true,
              title: true,
              category: true,
              eventDate: true,
              startTime: true,
              endTime: true,
              location: true,
              locationType: true,
              venueName: true,
              cpdHours: true,
            },
          },
          ticket: { select: { name: true, price: true, currency: true } },
          // The PENDING row here is what powers the resume-payment link.
          payments: {
            orderBy: { createdAt: 'desc' },
            select: { transactionId: true, status: true, amount: true, currency: true },
          },
        },
      },
      resourceProgress: {
        orderBy: { completedAt: 'desc' },
        select: {
          completedAt: true,
          module: {
            select: {
              id: true,
              title: true,
              minutes: true,
              resource: { select: { slug: true, title: true, emoji: true, level: true } },
            },
          },
        },
      },
      memberships: {
        orderBy: { joinedAt: 'desc' },
        select: {
          role: true,
          joinedAt: true,
          chapter: {
            select: {
              slug: true,
              name: true,
              region: true,
              city: true,
              country: true,
              emoji: true,
              meetingCadence: true,
            },
          },
        },
      },
      applications: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          createdAt: true,
          opportunity: {
            select: {
              slug: true,
              title: true,
              org: true,
              type: true,
              locationType: true,
              location: true,
            },
          },
        },
      },
    },
  });
  } catch (err) {
    console.error('Dashboard User DB Error:', err);
  }

  const profile = user?.profile;
  if (!user || !profile) {
    // A session pointing at a deleted account: clear the slate and start over.
    redirect('/login');
  }

  let resources: any[] = [];
  let totalModules = 0;
  let upcomingEvents: any[] = [];
  let chapters: any[] = [];

  try {
    const fetched = await Promise.all([
      prisma.resource.findMany({
        where: { isPublished: true },
        orderBy: { sortOrder: 'asc' },
        select: {
          slug: true,
          title: true,
          summary: true,
          emoji: true,
          level: true,
          estHours: true,
          _count: { select: { modules: true } },
        },
      }),
      prisma.resourceModule.count({ where: { resource: { isPublished: true } } }),
      prisma.event.findMany({
        where: { status: { in: ['UPCOMING', 'LIVE'] } },
        orderBy: { eventDate: 'asc' },
        take: 8,
        select: {
          slug: true,
          title: true,
          category: true,
          eventDate: true,
          startTime: true,
          location: true,
          locationType: true,
          cpdHours: true,
          isPaid: true,
        },
      }),
      prisma.chapter.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: {
          slug: true,
          name: true,
          region: true,
          city: true,
          country: true,
          emoji: true,
          meetingCadence: true,
          _count: { select: { memberships: true } },
        },
      }),
    ]);
    resources = fetched[0];
    totalModules = fetched[1];
    upcomingEvents = fetched[2];
    chapters = fetched[3];
  } catch (err) {
    console.error('Dashboard Secondary DB Error:', err);
  }

  /* ------------------------------------------------------------- shaping */

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const registrations: DashRegistration[] = (user?.registrations ?? []).map((reg: any) => {
    const pending = (reg.payments ?? []).find((payment: any) => payment.status === 'PENDING') ?? null;
    return {
      id: reg.id,
      registrationCode: reg.registrationCode,
      status: reg.status,
      registeredAt: reg.registeredAt.toISOString(),
      eventSlug: reg.event.slug,
      eventTitle: reg.event.title,
      eventCategory: reg.event.category,
      eventDate: reg.event.eventDate.toISOString(),
      startTime: reg.event.startTime,
      endTime: reg.event.endTime,
      location: reg.event.location,
      locationType: reg.event.locationType,
      venueName: reg.event.venueName,
      cpdHours: reg.event.cpdHours,
      ticketName: reg.ticket?.name ?? 'Member registration',
      ticketPrice: reg.ticket?.price ?? 0,
      ticketCurrency: reg.ticket?.currency ?? 'USD',
      checkoutTransactionId: pending?.transactionId ?? null,
      amountDue: pending?.amount ?? null,
      amountDueCurrency: pending?.currency ?? reg.ticket?.currency ?? 'USD',
      isPast: reg.event.eventDate < todayStart,
    };
  });

  const moduleTotalBySlug = new Map(resources.map((resource) => [resource.slug, resource._count.modules]));

  const doneByResource = new Map<string, number>();
  for (const row of user.resourceProgress) {
    const slug = row.module.resource.slug;
    doneByResource.set(slug, (doneByResource.get(slug) ?? 0) + 1);
  }

  /** Unpublished resources are not in the map, so never report fewer than done. */
  const totalForResource = (slug: string): number =>
    Math.max(moduleTotalBySlug.get(slug) ?? 0, doneByResource.get(slug) ?? 0);

  const modulesDone: DashModuleDone[] = (user?.resourceProgress ?? []).map((row: any) => ({
    id: row.module.id,
    title: row.module.title,
    minutes: row.module.minutes,
    completedAt: row.completedAt.toISOString(),
    resourceSlug: row.module.resource.slug,
    resourceTitle: row.module.resource.title,
    resourceEmoji: row.module.resource.emoji,
    resourceLevel: row.module.resource.level,
    resourceModuleTotal: totalForResource(row.module.resource.slug),
  }));

  let resourcesInProgress = 0;
  let resourcesComplete = 0;
  doneByResource.forEach((done, slug) => {
    const total = totalForResource(slug);
    if (total > 0 && done >= total) resourcesComplete += 1;
    else if (done > 0) resourcesInProgress += 1;
  });

  const memberships: DashMembership[] = (user?.memberships ?? []).map((row: any) => ({
    slug: row.chapter.slug,
    name: row.chapter.name,
    region: row.chapter.region,
    city: row.chapter.city,
    country: row.chapter.country,
    emoji: row.chapter.emoji,
    meetingCadence: row.chapter.meetingCadence,
    role: row.role,
    joinedAt: row.joinedAt.toISOString(),
  }));

  const applications: DashApplication[] = (user?.applications ?? []).map((row: any) => ({
    id: row.id,
    slug: row.opportunity.slug,
    title: row.opportunity.title,
    org: row.opportunity.org,
    type: row.opportunity.type,
    locationType: row.opportunity.locationType,
    location: row.opportunity.location,
    status: row.status,
    deadline: row.opportunity.deadline ? row.opportunity.deadline.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }));

  /* ---------------------------------------------------------- suggestions */

  const unstarted = resources.find((resource) => resource._count.modules > 0 && !doneByResource.has(resource.slug));

  const suggestedResource: SuggestedResource | null = unstarted
    ? {
        slug: unstarted.slug,
        title: unstarted.title,
        summary: unstarted.summary,
        emoji: unstarted.emoji,
        level: unstarted.level,
        estHours: unstarted.estHours,
        moduleCount: unstarted._count.modules,
      }
    : null;

  const joinedChapterSlugs = new Set(memberships.map((membership) => membership.slug));
  const openChapters = chapters.filter((chapter) => !joinedChapterSlugs.has(chapter.slug));
  const locationText = profile.location.toLowerCase();
  // Somewhere the member could actually get to beats somewhere merely popular.
  const nearby = openChapters.find(
    (chapter) =>
      locationText.includes(chapter.city.toLowerCase()) || locationText.includes(chapter.country.toLowerCase()),
  );
  const busiest = [...openChapters].sort((a, b) => b._count.memberships - a._count.memberships)[0];
  const chapterPick = nearby ?? busiest;

  const suggestedChapter: SuggestedChapter | null = chapterPick
    ? {
        slug: chapterPick.slug,
        name: chapterPick.name,
        region: chapterPick.region,
        city: chapterPick.city,
        country: chapterPick.country,
        emoji: chapterPick.emoji,
        meetingCadence: chapterPick.meetingCadence,
        memberCount: chapterPick._count.memberships,
      }
    : null;

  const registeredEventSlugs = new Set(
    registrations.filter((reg) => reg.status !== 'CANCELLED').map((reg) => reg.eventSlug),
  );
  const eventPick = upcomingEvents.find((event) => !registeredEventSlugs.has(event.slug));

  const suggestedEvent: SuggestedEvent | null = eventPick
    ? {
        slug: eventPick.slug,
        title: eventPick.title,
        category: eventPick.category,
        eventDate: eventPick.eventDate.toISOString(),
        startTime: eventPick.startTime,
        location: eventPick.location,
        locationType: eventPick.locationType,
        cpdHours: eventPick.cpdHours,
        isPaid: eventPick.isPaid,
      }
    : null;

  /* --------------------------------------------------------------- state */

  const form: DashProfileForm = {
    fullName: profile.fullName,
    handle: profile.handle,
    headline: profile.headline,
    org: profile.org,
    jobTitle: profile.jobTitle,
    field: profile.field,
    memberType: profile.memberType,
    location: profile.location,
    bio: profile.bio,
    yearsExperience: profile.yearsExperience === null ? '' : String(profile.yearsExperience),
    phone: profile.phone ?? '',
    contactEmail: profile.contactEmail ?? '',
    avatarUrl: profile.avatarUrl ?? '',
    linkedinUrl: profile.linkedinUrl ?? '',
    websiteUrl: profile.websiteUrl ?? '',
    specialties: parseList(profile.specialties),
    skills: parseList(profile.skills),
    openToOpportunities: profile.openToOpportunities,
    openToMentoring: profile.openToMentoring,
    openToSpeaking: profile.openToSpeaking,
  };

  const privacy: DashPrivacy = {
    isPublic: profile.privacy?.isPublic ?? true,
    searchableInDirectory: profile.privacy?.searchableInDirectory ?? true,
    showEmail: profile.privacy?.showEmail ?? false,
    showPhone: profile.privacy?.showPhone ?? false,
    showOrg: profile.privacy?.showOrg ?? true,
    showLinkedIn: profile.privacy?.showLinkedIn ?? true,
    showWebsite: profile.privacy?.showWebsite ?? true,
  };

  const visibility: DirectoryVisibility = !privacy.isPublic
    ? 'HIDDEN'
    : privacy.searchableInDirectory
      ? 'LISTED'
      : 'UNLISTED';

  const activeRegistrations = registrations.filter((reg) => reg.status !== 'CANCELLED');
  const cpdHours = registrations
    .filter((reg) => reg.status === 'CONFIRMED')
    .reduce((sum, reg) => sum + reg.cpdHours, 0);

  const stats: DashStats = {
    eventsRegistered: activeRegistrations.length,
    cpdHours,
    resourcesInProgress,
    resourcesComplete,
    chaptersJoined: memberships.length,
    applicationsSubmitted: applications.length,
    modulesDone: modulesDone.length,
    totalModules,
    totalResources: resources.length,
  };

  // Same six checks the completeness meter runs, counted here so the header is
  // right before the client bundle has hydrated.
  const completeChecks = [
    form.bio.trim().length >= 60,
    form.avatarUrl.trim().length > 0,
    form.specialties.length > 0,
    form.skills.length > 0,
    form.linkedinUrl.trim().length > 0,
    form.yearsExperience.trim().length > 0,
  ];
  const completeCount = completeChecks.filter(Boolean).length;

  const firstName = profile.fullName.split(' ')[0] || profile.handle;
  const memberSince = formatDate(user.createdAt, { month: 'long', year: 'numeric' });
  const pendingCount = registrations.filter((reg) => reg.status === 'PENDING_PAYMENT').length;

  const visibilityLabel =
    visibility === 'LISTED'
      ? 'Listed in the directory'
      : visibility === 'UNLISTED'
        ? 'Reachable by link only'
        : 'Hidden from the directory';

  const tickerItems = [
    `@${profile.handle}`,
    `Member since ${memberSince}`,
    visibilityLabel,
    `Profile ${completeCount} of ${completeChecks.length}`,
    `${stats.eventsRegistered} registration${stats.eventsRegistered === 1 ? '' : 's'}`,
    `${stats.cpdHours} CPD hour${stats.cpdHours === 1 ? '' : 's'}`,
    `${stats.chaptersJoined} chapter${stats.chaptersJoined === 1 ? '' : 's'}`,
    `${stats.modulesDone} of ${stats.totalModules} modules`,
  ];

  return (
    <div className="overflow-x-hidden">
      {/* ==================================================================
 HEADER
 ================================================================== */}
      <section className="relative border-b border-line bg-base">
        <div className="absolute inset-0 mesh-grid" aria-hidden />

        <div className="relative mx-auto max-w-container-max px-4 py-12 lg:px-10 lg:py-16">
          {deniedAdmin && (
            <div
              role="status"
              className="mb-9 flex animate-shake flex-col gap-3 border border-line bg-grad-brand-soft p-4 text-ink shadow-panel sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm leading-relaxed">
                <strong className="font-display uppercase tracking-wide">Admins only.</strong> The console at /admin
                needs an ADMIN role and your account is set to {user.role}. Nothing is broken - you were sent back here.
              </p>
              <Button href="/contact" tone="paper" size="sm" className="flex-shrink-0">
                Think that is wrong?
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-7">
              <Reveal direction="down">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan/40 bg-cyan/20 px-4 py-1.5 font-mono text-xs font-bold text-cyan shadow-panel mb-5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan" />
                  </span>
                  Signed in as @{profile.handle} · Member since {memberSince}
                </span>
              </Reveal>

              <Reveal direction="up" delay={0.05}>
                <h1 className="text-display-lg font-black tracking-tight text-white leading-tight">
                  <span className="block text-cyan font-mono text-xs uppercase tracking-widest font-bold mb-2">Member Portal Active</span>
                  WELCOME BACK, <span className="text-cyan px-1">{firstName.toUpperCase()}</span>
                </h1>
              </Reveal>

              <Reveal direction="up" delay={0.12}>
                <p className="mt-5 max-w-xl text-base font-medium leading-relaxed text-white sm:text-lg">
                  Your member record, your registrations, and profile settings.{' '}
                  <strong className="text-cyan font-bold underline decoration-cyan underline-offset-4">
                    How complete your profile is decides how findable you are
                  </strong>{' '}
                  in the member directory.
                </p>
              </Reveal>

              <Reveal direction="up" delay={0.18}>
                <div className="mt-7 flex flex-wrap items-center gap-2.5">
                  <Chip tone="violet">{visibilityLabel}</Chip>
                  <Chip tone={completeCount === completeChecks.length ? 'lime' : 'paper'}>
                    Profile {completeCount}/{completeChecks.length} Complete
                  </Chip>
                  {stats.cpdHours > 0 && <Chip tone="violet">{stats.cpdHours} CPD Hours Booked</Chip>}
                  {pendingCount > 0 && (
                    <Chip tone="magenta">
                      {pendingCount} Unpaid Registration{pendingCount === 1 ? '' : 's'}
                    </Chip>
                  )}
                  {user.role === 'ADMIN' && <Chip tone="violet">Admin Access</Chip>}
                </div>
              </Reveal>
            </div>

            {/* Quick jumps */}
            <div className="lg:col-span-5">
              <Reveal direction="left" delay={0.15}>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { href: '/directory', icon: '👥', label: 'Directory', blurb: 'Find a member' },
                    { href: '/events', icon: '📅', label: 'Events', blurb: 'Book a place' },
                    { href: '/resources', icon: '📚', label: 'Resources', blurb: 'Read something' },
                    { href: '/chapters', icon: '🌐', label: 'Chapters', blurb: 'Meet in person' },
                  ].map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="group flex flex-col justify-between rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-4 shadow-panel-lg transition-all duration-300 hover:border-cyan/50 hover:shadow-cyan/10 hover:-translate-y-1"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-cyan/30 bg-cyan/10 text-sm shadow-panel">
                          {link.icon}
                        </span>
                        <span className="font-black text-sm uppercase text-white transition-colors group-hover:text-cyan">
                          {link.label}
                        </span>
                      </div>
                      <span className="mt-3 flex items-center gap-1 font-mono text-xs font-bold text-cyan transition-colors">
                        {link.blurb} <span className="transition-transform group-hover:translate-x-1">→</span>
                      </span>
                    </Link>
                  ))}

                  <Link
                    href={`/members/${profile.handle}`}
                    className="group col-span-2 flex items-center justify-between gap-4 rounded-2xl border border-cyan/40 bg-surface/90 backdrop-blur-md p-4 text-white shadow-panel-lg transition-all duration-300 hover:border-cyan hover:shadow-cyan/10 hover:-translate-y-0.5"
                  >
                    <div className="min-w-0">
                      <span className="block font-black text-sm uppercase tracking-wide text-white transition-colors group-hover:text-cyan">
                        🛡️ Your Public Directory Profile
                      </span>
                      <span className="mt-1 block truncate font-mono text-xs font-bold text-cyan/80">
                        /members/{profile.handle}
                      </span>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan/40 bg-cyan/20 text-cyan transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <Marquee tone="ink" speed="normal" items={tickerItems} />

      {/* ==================================================================
 TABS + PANELS
 ================================================================== */}
      <DashboardClient
        initialTab={initialTab}
        email={user.email}
        role={user.role}
        emailVerified={user.emailVerified}
        memberSince={user.createdAt.toISOString()}
        profile={form}
        privacy={privacy}
        visibility={visibility}
        stats={stats}
        registrations={registrations}
        modulesDone={modulesDone}
        memberships={memberships}
        applications={applications}
        suggestedResource={suggestedResource}
        suggestedChapter={suggestedChapter}
        suggestedEvent={suggestedEvent}
      />

      {/* ==================================================================
 FOOTER HELP
 ================================================================== */}
      <section className="border-b border-line bg-violet/15 py-14 text-ink">
        <div className="mx-auto flex max-w-container-max flex-col gap-6 px-4 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div className="max-w-xl">
            <span className="mb-3 inline-block border border-line bg-cyan/12 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink shadow-panel">
              Something wrong?
            </span>
            <h2 className="text-display-md text-ink">We would rather hear about it.</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/75">
              A registration that will not settle, a chapter that should be listed, a detail on your record that is out
              of date. Send it over and a person reads it.
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-col gap-3 sm:flex-row">
            <Button href="/contact" tone="lime">
              Contact BSA
            </Button>
            <Button href="/chapters" tone="paper">
              Find your chapter
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
