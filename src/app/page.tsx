import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { Button } from '@/components/ui/button';
import { Card, CardBar, CardBody } from '@/components/ui/card';
import { Chip, LiveDot, TypeChip, labelFor } from '@/components/ui/badge';
import { Marquee } from '@/components/ui/marquee';
import { Reveal, RevealGroup, RevealItem, RevealWords, ClipReveal, EngraveRule } from '@/components/ui/reveal';
import { Parallax, ScrollRail, ScrollScale, Spotlight, Magnetic, TiltCard } from '@/components/ui/scroll';
import { Counter } from '@/components/ui/counter';
import { PhotoFrame, PhotoHex } from '@/components/ui/photo';
import { EmptyState, SectionHead, Stat, Sticker } from '@/components/ui/misc';
import { formatDay, formatMonth, parseList, relativeTime } from '@/lib/utils';

import { FigureStrip, HeroCopy } from '@/components/hero-bits';
// Statically imported rather than lazily: behind a dynamic() the strike beat
// starts a second or more after the headline has finished, and the two halves of
// the opening decorrelate. It is a client island either way.
import { HeroForge } from '@/components/hero-forge';
import { ScrollJourney } from '@/components/journey/scroll-journey';
import { GlobalSecurityRadar } from '@/components/ui/radar';
import { SecurityPassportForge } from '@/components/ui/passport-forge';
import { ShieldDoodle, CurlyArrowDoodle, ScribbleUnderline, PodcastMicDoodle, BroadcastTowerDoodle, HeadphonesDoodle } from '@/components/ui/security-doodles';
import { SecurityVisionGrid } from '@/components/ui/security-vision';
import { YouTubePlayer } from '@/components/ui/youtube-player';

export const revalidate = 30;

const TIER_LABEL: Record<string, string> = {
  DIAMOND: 'Diamond partner',
  GOLD: 'Gold partner',
  SILVER: 'Silver partner',
  COMMUNITY: 'Community partner',
};

/** The four things membership is for, in the order a new member meets them. */
const PILLARS = [
  {
    title: 'Find the right people',
    href: '/directory',
    cta: 'Open the directory',
    body: (c: Record<string, number>) =>
      `Search ${c.members} member profiles by discipline, region, organisation and specialism. Every member decides what is visible; nobody is listed against their will.`,
  },
  {
    title: 'Grow the business',
    href: '/opportunities',
    cta: 'See opportunities',
    body: (c: Record<string, number>) =>
      `${c.opportunities} live listings covering roles, partnerships, tenders, board seats and speaking slots - posted by members and partner organisations.`,
  },
  {
    title: 'Learn from practice',
    href: '/resources',
    cta: 'Browse resources',
    body: (c: Record<string, number>) =>
      `${c.resources} practitioner resources written by people doing the work, plus recorded sessions and written summaries from closed roundtables.`,
  },
  {
    title: 'Turn up in person',
    href: '/events',
    cta: 'See what is on',
    body: (c: Record<string, number>) =>
      `${c.events} events on the calendar and ${c.chapters} regional chapters meeting monthly or quarterly. Conferences, workshops, roundtables and networking evenings.`,
  },
];

export default async function HomePage() {
  let events: any[] = [];
  let opportunities: any[] = [];
  let resources: any[] = [];
  let members: any[] = [];
  let chapters: any[] = [];
  let partners: any[] = [];
  let post: any = null;
  let fields: any[] = [];
  let counts: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];

  try {
    const fetched = await Promise.all([
      prisma.event.findMany({
        where: { status: { in: ['UPCOMING', 'LIVE'] } },
        orderBy: { eventDate: 'asc' },
        take: 3,
        select: {
          id: true,
          slug: true,
          title: true,
          category: true,
          eventDate: true,
          startTime: true,
          location: true,
          locationType: true,
          description: true,
          isPaid: true,
          cpdHours: true,
          maxCapacity: true,
          heroImageUrl: true,
          _count: { select: { registrations: true } },
        },
      }),
      prisma.opportunity.findMany({
        where: { isPublished: true },
        orderBy: { postedAt: 'desc' },
        take: 3,
        select: {
          slug: true,
          title: true,
          org: true,
          type: true,
          locationType: true,
          location: true,
          compensation: true,
          deadline: true,
        },
      }),
      prisma.resource.findMany({
        where: { isPublished: true },
        orderBy: { sortOrder: 'asc' },
        take: 3,
        select: {
          slug: true,
          title: true,
          summary: true,
          level: true,
          emoji: true,
          accent: true,
          estHours: true,
          _count: { select: { modules: true } },
        },
      }),
      prisma.memberProfile.findMany({
        where: { user: { status: 'ACTIVE', role: { not: 'ADMIN' } }, privacy: { is: { isPublic: true, searchableInDirectory: true } } },
        orderBy: { lastActiveAt: 'desc' },
        take: 6,
        select: {
          handle: true,
          fullName: true,
          avatarUrl: true,
          jobTitle: true,
          headline: true,
          org: true,
          field: true,
          location: true,
          specialties: true,
          yearsExperience: true,
          openToMentoring: true,
          openToSpeaking: true,
          openToOpportunities: true,
        },
      }),
      prisma.chapter.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        take: 8,
        select: {
          slug: true,
          name: true,
          region: true,
          city: true,
          country: true,
          emoji: true,
          accent: true,
          meetingCadence: true,
          latitude: true,
          longitude: true,
          _count: { select: { memberships: true } },
        },
      }),
      prisma.sponsor.findMany({
        where: { isPublished: true },
        orderBy: { name: 'asc' },
        take: 8,
        select: { id: true, name: true, logoUrl: true, tier: true },
      }),
      prisma.blogPost.findFirst({
        where: { isPublished: true },
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
        select: {
          slug: true,
          title: true,
          summary: true,
          category: true,
          imageUrl: true,
          authorName: true,
          authorTitle: true,
          authorAvatar: true,
          readTimeMinutes: true,
        },
      }),
      prisma.memberProfile.findMany({ select: { field: true } }),
      Promise.all([
        prisma.memberProfile.count(),
        prisma.chapter.count({ where: { isActive: true } }),
        prisma.event.count({ where: { status: { in: ['UPCOMING', 'LIVE'] } } }),
        prisma.opportunity.count({ where: { isPublished: true } }),
        prisma.resource.count({ where: { isPublished: true } }),
        prisma.memberProfile.count({ where: { openToMentoring: true } }),
      ]),
    ]);

    events = fetched[0];
    opportunities = fetched[1];
    resources = fetched[2];
    members = fetched[3];
    chapters = fetched[4];
    partners = fetched[5];
    post = fetched[6];
    fields = fetched[7];
    counts = fetched[8] as [number, number, number, number, number, number];
  } catch (err) {
    console.error('Homepage DB Error on Serverless:', err);
  }

  const [memberCount, chapterCount, eventCount, opportunityCount, resourceCount, mentoringCount] = counts;
  const tally = {
    members: memberCount,
    chapters: chapterCount,
    events: eventCount,
    opportunities: opportunityCount,
    resources: resourceCount,
  };

  const disciplines = Array.from(new Set(fields.map((row) => row.field))).sort((a, b) => a.localeCompare(b));

  // Only plotted chapters can go on the globe. An unplotted one is simply
  // absent rather than dropped at 0,0 in the Atlantic.
  const journeyPins = chapters
    .filter((chapter) => chapter.latitude !== null && chapter.longitude !== null)
    .map((chapter) => ({
      slug: chapter.slug,
      label: chapter.name,
      city: chapter.city,
      lat: chapter.latitude as number,
      lon: chapter.longitude as number,
      members: chapter._count.memberships,
    }));
  const countryCount = new Set(chapters.map((chapter) => chapter.country)).size;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Business Security Alliance',
    alternateName: 'BSA',
    url: env.appUrl,
    description:
      'A professional association and networking organisation for the security industry: a searchable member directory, regional chapters, industry events, business opportunities and practitioner resources.',
    sameAs: [],
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ==================================================================
 HERO

 No background grid, and nothing tiled: the whole right of the frame is
 one object. The official medallion is read as a relief map and rebuilt
 as several thousand points of metal in real three-dimensional space,
 struck from the centre outward, lit by a light the reader moves with
 the pointer, orbited by the chapters, and pulled apart again under
 scroll. Layout stays deliberately off-centre - the type holds the left
 seven columns, the coin owns the right five, and the figures run along
 a ruled baseline rather than sitting in a row of boxes.
 ================================================================== */}
      <section data-hero-stage className="relative min-h-[180dvh] border-b border-line">
        {/* Pinned for the length of the runway, so the medallion visibly comes
 apart on screen instead of scrolling away mid-animation. */}
        <div className="sticky top-0 flex h-[100dvh] flex-col overflow-hidden">
          <div className="aura-hero absolute inset-0" aria-hidden />
          <HeroForge className="absolute inset-0 h-full w-full" chapterCount={chapterCount} memberCount={memberCount} />
          {/* Below lg the medallion is behind the copy rather than beside it,
 so the type gets a scrim. Above lg there is nothing to scrim: the
 coin owns the right of the frame and the words own the left. */}
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-base/75 via-base/45 to-base/80 lg:hidden"
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-grad-fade" aria-hidden />

          <HeroCopy className="relative mx-auto flex w-full max-w-container-max flex-1 flex-col justify-center px-5 py-20 lg:px-8">
            <div className="grid grid-cols-1 gap-14 lg:grid-cols-12">
              <div className="lg:col-span-7">
                {/* Timed to land as the mark locks onto its vertices */}
                <Reveal direction="down" delay={0.35}>
                  <div className="glass-chip gap-2.5 rounded-full border-cyan/40 px-4 py-1.5">
                    <LiveDot tone="cyan" />
                    <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-cyan">
                      WASHINGTON DC · LONDON · FRANKFURT · GLOBAL HUBS
                    </span>
                  </div>
                </Reveal>

                <h1 className="relative mt-8 tracking-tight font-extrabold uppercase leading-[0.88]">
                  <ShieldDoodle className="absolute -left-12 -top-10 h-16 w-16 text-cyan/70 hidden sm:block rotate-[-12deg]" />
                  <span className="relative inline-block text-4xl sm:text-6xl lg:text-7xl font-extrabold text-3d-pop tracking-tight">
                    CONNECTING PEOPLE,
                    <span className="absolute -right-6 -top-4 text-cyan text-2xl animate-pulse">✦</span>
                  </span>
                  <span className="relative block text-4xl sm:text-6xl lg:text-7xl font-accent font-bold lowercase italic text-3d-pop-cyan -mt-3 sm:-mt-5 lg:-mt-7 rotate-[-2.5deg] drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]">
                    product & technology with business!
                    <span className="absolute -left-6 bottom-2 text-white text-3xl animate-bounce">✦</span>
                  </span>
                </h1>

                <Reveal direction="up" delay={0.9}>
                  <p className="mt-8 max-w-xl border-l-2 border-cyan/40 pl-5 text-base sm:text-lg font-semibold leading-relaxed text-white/90">
                    Where security leaders connect to network & grow more business.{' '}
                    <strong className="font-extrabold text-white">
                      Empowering CEOs, CISOs, integrators & manufacturers across Physical, Electronic, and Cybersecurity.
                    </strong>
                  </p>
                </Reveal>

                <Reveal direction="up" delay={1}>
                  <div className="relative mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                    <CurlyArrowDoodle className="absolute -left-16 -top-10 h-14 w-16 text-cyan hidden lg:block" />
                    <Magnetic className="w-full sm:w-auto">
                      <Button href="/register" tone="magenta" size="lg" className="w-full sm:w-auto font-extrabold shadow-panel" arrow>
                        Get Started & Join Today
                      </Button>
                    </Magnetic>
                    <Button href="/directory" tone="ink" size="lg" className="font-extrabold border border-white/20 text-white hover:border-cyan">
                      Search Member Network
                    </Button>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Sticker tone="lime" rotate={-3}>
                      ✦ PHYSICAL & CYBERSECURITY
                    </Sticker>
                    <Sticker tone="magenta" rotate={3}>
                      🔥 WASHINGTON DC · LONDON · FRANKFURT
                    </Sticker>
                    <Sticker tone="cobalt" rotate={-2}>
                      ⚡ SECURITY LEADER PODCAST
                    </Sticker>
                  </div>
                </Reveal>
              </div>

              {/* The medallion's column. Nothing is stacked over the coin
 except one readout at the foot of it, so the object is never
 competing with a stack of cards for the same space. */}
              <div className="hidden lg:col-span-5 lg:flex lg:min-h-[26rem] lg:flex-col lg:justify-end">
                <Reveal direction="left" delay={1.15}>
                  {/* Frosted, because the medallion is turning directly behind
 it: the readout has to sit on the scene rather than punch a
 hole in it. */}
                  <div className="glass-panel glass-hover ml-auto w-full max-w-[19rem] rounded-2xl border-cyan/30 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cyan">
                        Active this week
                      </p>
                      <LiveDot tone="cyan" />
                    </div>

                    <div className="mt-3.5 flex items-center gap-3">
                      <span className="flex flex-none items-center">
                        {members.slice(0, 5).map((member, i) => (
                          <PhotoHex
                            key={member.handle}
                            src={member.avatarUrl}
                            name={member.fullName}
                            size="sm"
                            ring
                            className={i === 0 ? '' : '-ml-2.5'}
                          />
                        ))}
                      </span>
                      <p className="min-w-0 text-xs leading-snug text-ink-muted">
                        <span className="block truncate font-semibold text-ink">{members[0]?.fullName}</span>
                        and {Math.max(0, memberCount - 1)} others
                      </p>
                    </div>

                    <Link
                      href="/directory"
                      className="mt-4 inline-flex items-center gap-2 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cyan transition-all hover:translate-x-1 hover:text-cyan-bright"
                    >
                      Open the directory <span aria-hidden>→</span>
                    </Link>
                  </div>
                </Reveal>
              </div>
            </div>

            <Reveal direction="up" delay={1.25}>
              {/* The figures are a readout laid over the scene, so they get a
 frosted trough rather than sitting bare on the canvas. */}
              <div className="glass mt-14 max-w-3xl rounded-2xl px-6 pb-6 pt-4 sm:px-8">
                <FigureStrip
                  items={[
                    { value: memberCount, label: 'Members listed' },
                    { value: chapterCount, label: 'Regional chapters' },
                    { value: disciplines.length, label: 'Disciplines' },
                    { value: countryCount, label: 'Countries' },
                    { value: mentoringCount, label: 'Open to mentoring' },
                  ]}
                />
              </div>
            </Reveal>
          </HeroCopy>
        </div>
      </section>

      <Marquee
        tone="ink"
        items={
          disciplines.length > 0
            ? disciplines.map((field) => `✦ ${field.toUpperCase()} ⚡ LIVE EXECUTIVE INTEL`)
            : ['✦ ZERO-TRUST CYBER DEFENSE', '⚡ EXECUTIVE LEADERSHIP']
        }
        separator=" ★ "
      />

      {/* ==================================================================
  ALLIANCE GOAL & VISION DIRECTIVE
  ================================================================== */}
      <section className="relative border-b border-line py-16 lg:py-24 bg-base">
        <div className="mx-auto max-w-container-max px-5 lg:px-8">
          <SecurityVisionGrid />
        </div>
      </section>

      {/* ==================================================================
  INTERACTIVE YOUTH PASSPORT GENERATOR
  ================================================================== */}
      <section className="relative border-b border-line py-16 lg:py-20 bg-surface-inset/40">
        <div className="mx-auto max-w-container-max px-5 lg:px-8">
          <SecurityPassportForge />
        </div>
      </section>

      {/* ==================================================================
 LIVE COUNTS
 ================================================================== */}
      <section className="relative border-b border-line py-20 lg:py-24">
        <EngraveRule className="absolute inset-x-0 top-0" />
        <Spotlight />
        <div className="relative mx-auto max-w-container-max px-5 lg:px-8">
          <SectionHead
            kicker="The alliance right now"
            title={<>The alliance, this morning</>}
            blurb="Queried from the platform database when this page loaded, not typed into a slide two years ago."
            action={
              <Button href="/about" tone="ink" arrow>
                What BSA does
              </Button>
            }
          />

          <RevealGroup className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { value: memberCount, label: 'Members', tone: 'magenta' as const, href: '/directory' },
              { value: chapterCount, label: 'Regional chapters', tone: 'lime' as const, href: '/chapters' },
              { value: eventCount, label: 'Upcoming events', tone: 'violet' as const, href: '/events' },
              {
                value: opportunityCount,
                label: 'Open opportunities',
                tone: 'tangerine' as const,
                href: '/opportunities',
              },
              { value: resourceCount, label: 'Resources', tone: 'lime' as const, href: '/resources' },
            ].map((tile) => (
              <RevealItem key={tile.label} className="h-full">
                <TiltCard strength={12} className="h-full">
                  <Link href={tile.href} className="block h-full">
                    <Stat value={<Counter to={tile.value} />} label={tile.label} tone={tile.tone} className="h-full" />
                  </Link>
                </TiltCard>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ==================================================================
 WHAT MEMBERSHIP IS FOR
 ================================================================== */}
      <section className="relative border-b border-line py-20 lg:py-24">
        <EngraveRule className="absolute inset-x-0 top-0" />
        <div className="aura-violet absolute inset-0 opacity-70" aria-hidden />
        <div className="relative mx-auto max-w-container-max px-5 lg:px-8">
          <SectionHead
            tone="violet"
            title="You can be in the directory before lunch"
            blurb="Security is a small industry that behaves like a large one. Most of the useful information in it sits with a person, not in a document. The alliance exists to shorten the distance to that person."
          />

          <div className="relative">
            <ScrollRail className="left-0 hidden lg:block" />
            <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:pl-10">
              {PILLARS.map((item) => (
                <RevealItem key={item.title} className="h-full">
                  <TiltCard className="h-full" strength={5}>
                    <Card href={item.href} className="group flex h-full flex-col">
                      <CardBody className="flex flex-1 flex-col">
                        <h3 className="text-lg font-semibold leading-snug transition-colors group-hover:text-cyan-bright">
                          {item.title}
                        </h3>
                        <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{item.body(tally)}</p>
                        <p className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-cyan transition-transform duration-300 group-hover:translate-x-1">
                          {item.cta} <span aria-hidden>→</span>
                        </p>
                      </CardBody>
                    </Card>
                  </TiltCard>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>

          <Reveal delay={0.1}>
            <div className="mt-12 grid grid-cols-1 gap-8 items-center lg:grid-cols-12">
              <div className="lg:col-span-6">
                <GlobalSecurityRadar />
              </div>
              <div className="lg:col-span-6 border border-line bg-surface/90 p-8 rounded-2xl shadow-panel backdrop-blur-xl">
                <span className="kicker mb-3">Real-Time Connectivity</span>
                <h3 className="text-display-sm text-ink font-bold">A better-connected industry is the actual output</h3>
                <p className="mt-4 text-body-md leading-relaxed text-ink-soft">
                  Committees, guidance notes, consultation responses and shared research take more than one
                  organisation. That work runs on members volunteering time, and it is the part of the alliance that
                  outlasts any individual event.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button href="/contact?type=general" tone="magenta" size="md">
                    Join a committee
                  </Button>
                  <Button href="/blog" tone="ink" size="md">
                    Read the research
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ==================================================================
  THE SECURITY LEADER PODCAST
  ================================================================== */}
      <section className="relative overflow-hidden border-b border-line bg-surface/95 py-20 lg:py-24">
        <EngraveRule className="absolute inset-x-0 top-0" />
        <div className="aura-hero absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-container-max px-5 lg:px-8">
          <div className="grid grid-cols-1 gap-12 items-center lg:grid-cols-12">
            {/* Podcast Video / Media Card */}
            <div className="lg:col-span-6">
              <Reveal direction="right">
                <TiltCard strength={10}>
                  <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-base p-4 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                    <div className="mb-3.5 flex items-center justify-between">
                      <Sticker tone="lime" rotate={-2}>
                        ✦ OFFICIAL YOUTUBE EPISODE
                      </Sticker>
                      <span className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-cyan">
                        THE SECURITY LEADER PODCAST
                      </span>
                    </div>
                    <YouTubePlayer videoId="ep34kPRQpmg" title="The Security Leader Podcast · Business Security Alliance" />
                    <div className="mt-3.5 flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">
                      <span className="flex items-center gap-1.5 text-cyan">
                        <span className="h-2 w-2 rounded-full bg-cyan animate-pulse" />
                        WATCH FULL EPISODE
                      </span>
                      <span>BUSINESS SECURITY ALLIANCE</span>
                    </div>
                  </div>
                </TiltCard>
              </Reveal>
            </div>

            {/* Podcast Content */}
            <div className="lg:col-span-6">
              <Reveal direction="up">
                <Sticker tone="magenta" rotate={-3} className="mb-4">
                  ✦ OFFICIAL BSA PODCAST
                </Sticker>
                <h2 className="relative tracking-tight font-extrabold uppercase leading-[0.88]">
                  <BroadcastTowerDoodle className="absolute -left-10 top-1/2 h-14 w-14 text-magenta/60 hidden lg:block rotate-[-12deg]" />
                  <span className="relative inline-block text-3xl sm:text-5xl lg:text-6xl font-extrabold text-3d-pop tracking-tight">
                    THE SECURITY LEADER
                  </span>
                  <span className="relative block text-3xl sm:text-5xl lg:text-6xl font-accent font-bold lowercase italic text-3d-pop-cyan -mt-2 sm:-mt-4 rotate-[-2deg]">
                    podcast series!
                  </span>
                </h2>
                <div className="mt-6 space-y-4 text-base font-semibold leading-relaxed text-white/90 sm:text-lg">
                  <p>
                    The Security Leader Podcast brings you authentic, honest, and educational conversations with top Security CEOs,
                    innovators, manufacturers, integrators, security thought leaders, government experts, and those shaping the
                    future of Physical, Electronic, and Cybersecurity.
                  </p>
                  <p className="text-white/80">
                    Hosted by the Business Security Alliance, The Security Leader Podcast delivers powerful insights, emerging
                    trends, leadership lessons, business growth, channel strategy, and the technologies driving next-generation
                    security.
                  </p>
                  <p className="border-l-2 border-cyan/40 pl-4 font-bold text-white">
                    This is your place to learn, grow, lead, and connect. Subscribe Today to learn from the leaders who protect
                    people, property, and assets across the world.
                  </p>
                </div>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Button
                    href="/podcast"
                    tone="magenta"
                    size="lg"
                    className="font-extrabold shadow-panel"
                    arrow
                  >
                    Click to Subscribe to the Security Leader Podcast
                  </Button>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================
 THE DIRECTORY
 ================================================================== */}
      <section className="relative border-b border-line py-20 lg:py-24">
        <EngraveRule className="absolute inset-x-0 top-0" />
        <div className="relative mx-auto max-w-container-max px-5 lg:px-8">
          <SectionHead
            title="Find the person who has already solved it"
            blurb={`One directory, ${disciplines.length} disciplines, ${countryCount} countries. Filter by what someone actually does, read what they are working on, then message them directly. No cold outreach and no guessing who to ask.`}
            action={
              <Button href="/directory" tone="lime" arrow>
                Browse all {memberCount} members
              </Button>
            }
          />

          {members.length === 0 ? (
            <EmptyState
              title="No public profiles yet"
              blurb="Members choose whether to appear in the directory. Nobody has opted in so far."
              action={
                <Button href="/register" tone="magenta">
                  Be the first listing
                </Button>
              }
            />
          ) : (
            <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => {
                const specialties = parseList(member.specialties);
                return (
                  <RevealItem key={member.handle} className="h-full">
                    <TiltCard strength={10} className="h-full">
                      <Link
                        href={`/members/${member.handle}`}
                        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface/90 shadow-panel transition-all duration-300 hover:border-cyan/70 hover:bg-surface-raised"
                      >
                        {/* Top Security ID Pass Header */}
                        <div className="flex items-center justify-between border-b border-line bg-base/90 px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.14em]">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-cyan animate-pulse" />
                            <span className="text-cyan font-extrabold">SECURITY PASS</span>
                          </div>
                          <span className="text-ink-soft">#{member.handle.toUpperCase().slice(0, 7)}</span>
                        </div>

                        <div className="flex flex-1 flex-col p-5">
                          <div className="flex items-start gap-3.5">
                            <PhotoHex src={member.avatarUrl} name={member.fullName} size="lg" ring />
                            <div className="min-w-0 flex-1">
                              <h3 className="text-lg font-extrabold text-ink group-hover:text-cyan transition-colors leading-snug">
                                {member.fullName}
                              </h3>
                              <p className="font-mono text-xs font-bold text-cyan">@{member.handle}</p>
                              <p className="mt-1 text-sm font-semibold text-ink-soft leading-snug">
                                {member.jobTitle || member.headline}
                              </p>
                              <p className="mt-1 text-xs font-medium text-ink-muted">
                                {member.org ? `${member.org} · ` : ''}
                                {member.location}
                              </p>
                            </div>
                          </div>

                          {specialties.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-1.5">
                              {specialties.slice(0, 3).map((specialty) => (
                                <Chip key={specialty} size="sm" tone="ink">
                                  {specialty}
                                </Chip>
                              ))}
                            </div>
                          )}

                          <div className="mt-5 flex items-center justify-between gap-2 border-t border-line pt-3.5">
                            <div className="flex min-w-0 flex-wrap gap-1.5">
                              {member.openToMentoring && (
                                <Chip tone="lime" size="sm" dot>
                                  Mentoring
                                </Chip>
                              )}
                              {member.openToSpeaking && (
                                <Chip tone="violet" size="sm" dot>
                                  Speaking
                                </Chip>
                              )}
                              {member.openToOpportunities && (
                                <Chip tone="tangerine" size="sm" dot>
                                  Open to work
                                </Chip>
                              )}
                              {!member.openToMentoring && !member.openToSpeaking && !member.openToOpportunities && (
                                <span className="text-xs font-semibold text-ink-soft">Verified Member</span>
                              )}
                            </div>
                            <span
                              aria-hidden
                              className="flex-shrink-0 font-mono text-xs font-bold uppercase tracking-[0.12em] text-cyan transition-transform group-hover:translate-x-1"
                            >
                              Pass →
                            </span>
                          </div>
                        </div>
                      </Link>
                    </TiltCard>
                  </RevealItem>
                );
              })}
            </RevealGroup>
          )}

          {/* The one typographic event on the page: a single figure at display
 scale, which is the whole argument for the directory. */}
          <Reveal delay={0.08}>
            <div className="mt-14 grid grid-cols-1 items-end gap-8 border-t border-line pt-12 lg:grid-cols-12">
              <p
                className="tabular font-display text-[5rem] font-bold leading-[0.85] text-ink sm:text-[7rem] lg:col-span-4"
                aria-hidden
              >
                {mentoringCount}
              </p>
              <div className="lg:col-span-8">
                <p className="max-w-2xl text-display-sm text-ink">
                  members have said, in writing, that they are happy to be asked.
                </p>
                <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-soft">
                  Availability is a field on the profile, not something you infer from a job title. {mentoringCount} of{' '}
                  {memberCount} are open to mentoring, and every profile states whether that person is also open to
                  speaking or to new work. Members set their own visibility - a profile can be fully public, listed in
                  the directory only, or hidden entirely while they still use everything else.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ==================================================================
 EVENTS
 ================================================================== */}
      <section className="relative border-b border-line py-20 lg:py-24">
        <EngraveRule className="absolute inset-x-0 top-0" />
        <div className="aura-cyan absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-container-max px-5 lg:px-8">
          <SectionHead
            kicker="What is on"
            tone="magenta"
            title="Conferences, workshops and closed roundtables"
            blurb="Run by the alliance and its chapters, for people with operational responsibility. Some sessions are open to guests, some are members only and held under the Chatham House rule."
            action={
              <Button href="/events" tone="ink" arrow>
                Full calendar
              </Button>
            }
          />

          {events.length === 0 ? (
            <EmptyState
              title="Nothing scheduled at the moment"
              blurb="The next programme is being confirmed with the chapters."
              action={
                <Button href="/contact?type=general" tone="ink">
                  Ask what is coming up
                </Button>
              }
            />
          ) : (
            <RevealGroup className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {events.map((event) => {
                const spotsLeft = event.maxCapacity - event._count.registrations;
                return (
                  <RevealItem key={event.id} className="h-full">
                    <TiltCard strength={12} className="h-full">
                      <Link
                        href={`/events/${event.slug}`}
                        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/20 bg-surface/95 shadow-[0_15px_40px_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-cyan/80 hover:bg-surface-raised hover:shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
                      >
                        {/* Top VIP Pass Header */}
                        <div className="flex items-center justify-between border-b border-line bg-base/90 px-4 py-2.5 font-mono text-[10px] font-extrabold uppercase tracking-[0.18em]">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-cyan animate-pulse" />
                            <span className="text-cyan font-black">SUMMIT PASS</span>
                          </div>
                          <span className="text-cyan font-bold">#{event.category}</span>
                        </div>

                        <PhotoFrame
                          src={event.heroImageUrl}
                          alt=""
                          seed={`${event.title}-${event.slug}`}
                          ratio="wide"
                          className="rounded-none border-0 border-b border-line group-hover:scale-102 transition-transform duration-500"
                        >
                          <span className="glass-chip absolute left-4 top-4 flex h-14 w-14 flex-col items-center justify-center rounded-xl border-2 border-white/30 bg-base/90 backdrop-blur-md shadow-panel">
                            <span className="tabular font-display text-xl font-black leading-none text-white">
                              {formatDay(event.eventDate)}
                            </span>
                            <span className="mt-0.5 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-cyan">
                              {formatMonth(event.eventDate)}
                            </span>
                          </span>
                          <span className="absolute bottom-3 left-4 right-4">
                            <TypeChip value={event.category} size="md" />
                          </span>
                        </PhotoFrame>

                        <CardBody className="flex flex-1 flex-col p-6">
                          <h3 className="text-2xl font-black text-white leading-tight tracking-tight transition-colors group-hover:text-cyan drop-shadow-md">
                            {event.title}
                          </h3>
                          <p className="mt-3 flex-1 text-sm font-medium text-white/80 leading-relaxed">
                            {event.description}
                          </p>

                          <div className="mt-5 flex flex-wrap gap-2">
                            <Chip size="md" tone="lime" className="font-extrabold">
                              {labelFor(event.locationType)}
                            </Chip>
                            {event.cpdHours > 0 && (
                              <Chip tone="violet" size="md" className="font-extrabold">
                                {event.cpdHours} CPD hours
                              </Chip>
                            )}
                            <Chip tone={event.isPaid ? 'tangerine' : 'lime'} size="md" className="font-extrabold">
                              {event.isPaid ? 'Ticketed' : 'Free to members'}
                            </Chip>
                          </div>

                          <div className="mt-6 flex items-center justify-between border-t border-white/15 pt-4 font-mono text-xs font-black uppercase tracking-[0.14em]">
                            <span className="text-cyan font-black">
                              {spotsLeft <= 0 ? 'Waiting list' : `${spotsLeft} PLACES LEFT`}
                            </span>
                            <span className="text-amber font-black transition-transform group-hover:translate-x-1">
                              {relativeTime(event.eventDate).toUpperCase()} →
                            </span>
                          </div>
                        </CardBody>
                      </Link>
                    </TiltCard>
                  </RevealItem>
                );
              })}
            </RevealGroup>
          )}
        </div>
      </section>

      {/* ==================================================================
 OPPORTUNITIES
 ================================================================== */}
      <section className="relative border-b border-line py-20 lg:py-24">
        <EngraveRule className="absolute inset-x-0 top-0" />
        <div className="mx-auto max-w-container-max px-5 lg:px-8">
          <SectionHead
            tone="tangerine"
            title="Work, tenders and board seats"
            blurb="Senior roles, consulting partnerships, invitations to tender, speaking calls and non-executive appointments. Posted by members and partner organisations."
            action={
              <Button href="/opportunities" tone="ink" arrow>
                All {opportunityCount} listings
              </Button>
            }
          />

          {opportunities.length === 0 ? (
            <EmptyState
              title="No listings open right now"
              blurb="Members and partners post here when something is live. New listings usually appear within a fortnight."
              action={
                <Button href="/contact?type=general" tone="ink">
                  Post an opportunity
                </Button>
              }
            />
          ) : (
            <RevealGroup className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {opportunities.map((role) => (
                <RevealItem key={role.slug} className="h-full">
                  <TiltCard strength={10} className="h-full">
                    <Link
                      href={`/opportunities/${role.slug}`}
                      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface/90 shadow-panel transition-all duration-300 hover:border-cyan/70 hover:bg-surface-raised hover:shadow-[0_15px_40px_rgba(0,0,0,0.4)]"
                    >
                      {/* Top Directive Pass Header */}
                      <div className="flex items-center justify-between border-b border-line bg-base/90 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em]">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-cyan animate-pulse" />
                          <span className="text-cyan font-extrabold">{labelFor(role.type)}</span>
                        </div>
                        <span className="text-ink-soft">{labelFor(role.locationType)}</span>
                      </div>

                      <CardBody className="flex h-full flex-col p-6">
                        <div className="flex items-start gap-3">
                          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-cyan/30 bg-cyan/10 font-display text-lg font-bold text-cyan shadow-panel">
                            {role.org.slice(0, 1)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-xl font-extrabold text-white leading-snug tracking-tight transition-colors group-hover:text-cyan">
                              {role.title}
                            </h3>
                            <p className="mt-1 font-mono text-xs font-bold text-cyan">{role.org}</p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-1 flex-wrap content-start gap-2">
                          <Chip size="sm" tone="lime" className="font-bold">
                            {role.location}
                          </Chip>
                          {role.compensation && (
                            <Chip tone="tangerine" size="sm" className="font-bold">
                              {role.compensation}
                            </Chip>
                          )}
                        </div>

                        {role.deadline && (
                          <div className="mt-5 border-t border-line pt-3.5 font-mono text-xs font-bold uppercase tracking-[0.14em]">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-rose font-extrabold animate-pulse">
                                CLOSES {relativeTime(role.deadline).toUpperCase()}
                              </span>
                              <span className="text-amber font-extrabold transition-transform group-hover:translate-x-1">
                                DIRECTIVE →
                              </span>
                            </div>
                          </div>
                        )}
                      </CardBody>
                    </Link>
                  </TiltCard>
                </RevealItem>
              ))}
            </RevealGroup>
          )}
        </div>
      </section>

      {/* ==================================================================
  RESOURCES + INSIGHT
  ================================================================== */}
      <section className="relative border-b border-line py-20 lg:py-24 bg-base">
        <EngraveRule className="absolute inset-x-0 top-0" />
        <div className="mx-auto max-w-container-max px-5 lg:px-8">
          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <Sticker tone="violet" rotate={-2} className="mb-3">
                ✦ PRACTITIONER KNOWLEDGE BASE
              </Sticker>
              <h2 className="relative tracking-tight font-extrabold uppercase leading-[0.88]">
                <span className="relative inline-block text-4xl sm:text-6xl lg:text-7xl font-extrabold text-3d-pop tracking-tight">
                  WRITTEN BY PRACTITIONERS
                  <span className="absolute -right-6 -top-4 text-cyan text-2xl animate-pulse">✦</span>
                </span>
                <span className="relative block text-4xl sm:text-6xl lg:text-7xl font-accent font-bold lowercase italic text-3d-pop-cyan -mt-2 sm:-mt-5 rotate-[-2.5deg]">
                  who have actually done it!
                </span>
              </h2>
              <p className="mt-4 max-w-2xl text-base font-semibold text-white/80 leading-relaxed">
                Structured, module-based guidance on the work security leaders are actually asked to do. Open to members, with your progress recorded against your profile.
              </p>
            </div>
            <Button href="/resources" tone="magenta" size="lg" arrow className="shrink-0 font-extrabold shadow-panel">
              All resources
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              {resources.length === 0 ? (
                <EmptyState
                  title="No resources published yet"
                  blurb="The first set is being reviewed by the committees that commissioned it."
                />
              ) : (
                <RevealGroup className="space-y-4">
                  {resources.map((resource) => (
                    <RevealItem key={resource.slug}>
                      <TiltCard strength={10}>
                        <Link
                          href={`/resources/${resource.slug}`}
                          className="group relative flex flex-col gap-5 sm:flex-row sm:items-center rounded-2xl border border-white/20 bg-surface/95 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-cyan/80 hover:bg-surface-raised hover:shadow-[0_15px_40px_rgba(0,0,0,0.6)]"
                        >
                          <span
                            aria-hidden
                            className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-cyan/40 bg-cyan/10 font-display text-2xl shadow-panel transition-transform duration-300 group-hover:scale-110"
                          >
                            {resource.emoji || '🛡️'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <TypeChip value={resource.level} size="sm" />
                              <Chip size="sm" tone="lime" className="font-extrabold">
                                {resource._count.modules} modules
                              </Chip>
                              <Chip size="sm" tone="violet" className="font-extrabold">
                                ~{resource.estHours}h
                              </Chip>
                            </div>
                            <h3 className="text-xl font-black text-white leading-tight tracking-tight transition-colors group-hover:text-cyan">
                              {resource.title}
                            </h3>
                            <p className="mt-2 text-sm font-semibold text-white/80 leading-relaxed">
                              {resource.summary}
                            </p>
                          </div>
                          <span
                            aria-hidden
                            className="hidden text-2xl text-cyan transition-all duration-300 group-hover:translate-x-2 group-hover:scale-125 sm:block font-black"
                          >
                            →
                          </span>
                        </Link>
                      </TiltCard>
                    </RevealItem>
                  ))}
                </RevealGroup>
              )}
            </div>

            <div className="lg:col-span-4">
              {post && (
                <ClipReveal className="h-full">
                  <TiltCard strength={12} className="h-full">
                    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/20 bg-surface/95 shadow-[0_15px_40px_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-cyan/80 hover:bg-surface-raised hover:shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
                      <PhotoFrame
                        src={post.imageUrl}
                        alt=""
                        seed={post.slug}
                        ratio="wide"
                        className="rounded-none border-0 border-b border-white/15 group-hover:scale-102 transition-transform duration-500"
                      />
                      <CardBody className="flex flex-1 flex-col p-6">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <Chip size="sm" tone="magenta" className="font-extrabold">
                            {post.category}
                          </Chip>
                          <span className="font-mono text-xs font-bold text-cyan">{post.readTimeMinutes} min read</span>
                        </div>
                        <Link href={`/blog/${post.slug}`}>
                          <h3 className="text-xl font-black text-white leading-snug transition-colors group-hover:text-cyan drop-shadow-md">
                            {post.title}
                          </h3>
                        </Link>
                        <p className="mt-2.5 flex-1 text-sm font-semibold text-white/80 leading-relaxed">
                          {post.summary}
                        </p>
                        <div className="mt-5 flex items-center gap-3 border-t border-white/15 pt-4">
                          <PhotoHex src={post.authorAvatar} name={post.authorName} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-extrabold text-white">{post.authorName}</p>
                            <p className="truncate text-xs font-bold text-cyan">{post.authorTitle}</p>
                          </div>
                        </div>
                        <Button href="/blog" tone="magenta" size="md" className="mt-5 w-full font-extrabold" arrow>
                          Read the insights
                        </Button>
                      </CardBody>
                    </div>
                  </TiltCard>
                </ClipReveal>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================
          THE JOURNEY

          Chapters and partners used to be two card grids. They are now one
          continuous scene: the globe plots every chapter at its real
          coordinates, the camera falls toward the busiest region, the pins
          leave the surface and settle into the member network, and the network
          finally hands off to the partner cards. One scroll, one subject.
      ================================================================== */}
      <ScrollJourney
        pins={journeyPins}
        partners={partners.map((p) => ({ id: p.id, name: p.name, tier: p.tier, logoUrl: p.logoUrl }))}
        counts={{ chapters: chapterCount, countries: countryCount, members: memberCount }}
      />

      {/* ==================================================================
  CONVERSION
  ================================================================== */}
      <section className="relative overflow-hidden py-20 lg:py-28 border-t border-line">
        <div className="mesh-grid absolute inset-0 opacity-25" aria-hidden />

        <ScrollScale className="relative mx-auto max-w-container-max px-5 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan/40 bg-surface-raised px-4 py-1.5 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-cyan">
              JOIN THE ALLIANCE TODAY
            </span>
            <h2 className="mt-6 text-display-lg font-bold text-ink tracking-tight">
              Ready to connect with <span className="text-cyan">global security leaders?</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-body-lg leading-relaxed text-ink-soft">
              Create a profile and you are in the directory the same day. If you would rather understand the membership
              model before committing, send an enquiry and a team member will answer it.
            </p>
          </div>

          <RevealGroup className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
            <RevealItem className="h-full">
              <Card className="flex h-full flex-col border border-line bg-surface hover:border-cyan/50 transition-all duration-300">
                <CardBar tone="magenta">
                  <span className="font-semibold text-cyan">For Individuals</span>
                  <span aria-hidden>→</span>
                </CardBar>
                <CardBody className="flex flex-1 flex-col">
                  <h3 className="text-display-sm font-bold text-ink">Create Your Profile</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">
                    Name, role, organisation, discipline and location. Set your visibility, add your specialisms, and
                    you are searchable by every other member.
                  </p>
                  <Magnetic className="mt-6 block">
                    <Button href="/register" tone="magenta" size="lg" className="w-full" arrow>
                      Join the alliance
                    </Button>
                  </Magnetic>
                </CardBody>
              </Card>
            </RevealItem>

            <RevealItem className="h-full">
              <Card className="flex h-full flex-col border border-line bg-surface hover:border-violet/50 transition-all duration-300">
                <CardBar tone="violet">
                  <span className="font-semibold text-violet-bright">For Organisations</span>
                  <span aria-hidden>→</span>
                </CardBar>
                <CardBody className="flex flex-1 flex-col">
                  <h3 className="text-display-sm font-bold text-ink">Talk To Us First</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">
                    Membership enquiries, group arrangements for a security team, chapter proposals and partnership
                    conversations all go to the same inbox and get a written answer.
                  </p>
                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Button href="/contact?type=membership" tone="ink" className="w-full">
                      Membership enquiry
                    </Button>
                    <Button href="/contact?type=sponsor" tone="ink" className="w-full">
                      Partner with BSA
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </RevealItem>
          </RevealGroup>
        </ScrollScale>
      </section>
    </div>
  );
}
