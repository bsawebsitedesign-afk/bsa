import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardBar, CardBody } from '@/components/ui/card';
import { Chip, LiveDot } from '@/components/ui/badge';
import { Marquee } from '@/components/ui/marquee';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/reveal';
import { Counter } from '@/components/ui/counter';
import { EmptyState, SectionHead, Sticker, Stat } from '@/components/ui/misc';
import { accentFor, type Accent } from '@/lib/utils';

import { SecurityVisionGrid } from '@/components/ui/security-vision';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'About the alliance',
  description:
    'The Business Security Alliance is a professional association for the security industry. What it does, who it is for, how the member directory and regional chapters work, and how it is funded.',
};

const TIER_RANK: Record<string, number> = { DIAMOND: 0, GOLD: 1, SILVER: 2, COMMUNITY: 3 };
const TIER_TONE: Record<string, 'violet' | 'lime' | 'tangerine' | 'cobalt'> = {
  DIAMOND: 'violet',
  GOLD: 'lime',
  SILVER: 'tangerine',
  COMMUNITY: 'cobalt',
};

const ACCENTS: Accent[] = ['lime', 'magenta', 'violet', 'tangerine', 'cobalt'];

function accentOf(stored: string, seed: string): Accent {
  return (ACCENTS as string[]).includes(stored) ? (stored as Accent) : accentFor(seed);
}

/**
 * Editorial note for institutional copy the client still has to supply.
 *
 * Development only. In production it renders nothing - a visitor should never be
 * told in a highlighted box that the organisation has not written its own
 * history. The gap is better left silent than advertised.
 */
function Placeholder({ title, children }: { title: string; children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className="rounded-lg border border-dashed border-amber/40 bg-amber/[0.07] p-5">
      <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-amber">
        Editorial note · not rendered in production
      </p>
      <p className="text-base font-semibold leading-snug text-ink">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{children}</p>
    </div>
  );
}

const AUDIENCE = [
  {
    title: 'Security professionals',
    tone: 'lime' as const,
    body: 'People with day-to-day operational responsibility: security managers, operations leads, analysts, investigators, architects and assurance specialists. The largest group in the directory.',
  },
  {
    title: 'Security leaders',
    tone: 'violet' as const,
    body: 'Heads of security, directors, CISOs and anyone accountable to a board for security risk. Roundtables and executive resources are aimed here.',
  },
  {
    title: 'Consultants and independent practices',
    tone: 'magenta' as const,
    body: 'Independent advisers and small practices who need visibility, referrals and a route to work that does not depend on one former employer.',
  },
  {
    title: 'Vendors, integrators and service providers',
    tone: 'tangerine' as const,
    body: 'Companies that make, install or operate security systems and services. In the directory as practitioners, not as advertisements.',
  },
  {
    title: 'Organisations',
    tone: 'cobalt' as const,
    body: 'Employers who want their security function connected to the wider industry, and who use the alliance for benchmarking, recruitment and professional development.',
  },
  {
    title: 'Partners and sponsors',
    tone: 'ink' as const,
    body: 'Organisations funding the programme - the conference, the chapter network and the research the alliance publishes.',
  },
];

export default async function AboutPage() {
  let chapters: any[] = [];
  let partners: any[] = [];
  let fields: any[] = [];
  let counts: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  try {
    const fetched = await Promise.all([
      prisma.chapter.findMany({
        where: { isActive: true },
        orderBy: [{ foundedYear: 'asc' }, { name: 'asc' }],
        select: {
          slug: true,
          name: true,
          region: true,
          city: true,
          country: true,
          emoji: true,
          accent: true,
          foundedYear: true,
          meetingCadence: true,
          description: true,
          _count: { select: { memberships: true } },
        },
      }),
      prisma.sponsor.findMany({
        where: { isPublished: true },
        select: { id: true, name: true, tier: true, logoUrl: true, perkText: true, description: true },
      }),
      prisma.memberProfile.findMany({ select: { field: true } }),
      Promise.all([
        prisma.memberProfile.count(),
        prisma.chapter.count({ where: { isActive: true } }),
        prisma.event.count(),
        prisma.event.count({ where: { status: { in: ['UPCOMING', 'LIVE'] } } }),
        prisma.eventRegistration.count(),
        prisma.resource.count({ where: { isPublished: true } }),
        prisma.resourceModule.count(),
        prisma.opportunity.count({ where: { isPublished: true } }),
        prisma.blogPost.count({ where: { isPublished: true } }),
        prisma.chapterMembership.count(),
        prisma.chapterMembership.count({ where: { role: 'CHAIR' } }),
        prisma.chapterMembership.count({ where: { role: 'COMMITTEE' } }),
        prisma.memberProfile.count({ where: { openToMentoring: true } }),
        prisma.memberProfile.count({ where: { openToSpeaking: true } }),
        prisma.memberProfile.count({ where: { openToOpportunities: true } }),
      ]),
    ]);
    chapters = fetched[0];
    partners = fetched[1];
    fields = fetched[2];
    counts = fetched[3];
  } catch (err) {
    console.error('About Page DB Error:', err);
  }

  const [
    memberCount,
    chapterCount,
    eventCount,
    upcomingEventCount,
    registrationCount,
    resourceCount,
    moduleCount,
    opportunityCount,
    postCount,
    chapterMemberCount,
    chairCount,
    committeeCount,
    mentoringCount,
    speakingCount,
    openToWorkCount,
  ] = counts;

  const disciplines = Array.from(new Set(fields.map((row) => row.field))).sort((a, b) => a.localeCompare(b));
  const countryCount = new Set(chapters.map((chapter) => chapter.country)).size;

  const rankedPartners = [...partners].sort(
    (a, b) => (TIER_RANK[a.tier] ?? 9) - (TIER_RANK[b.tier] ?? 9) || a.name.localeCompare(b.name),
  );

  const tierRows = (['DIAMOND', 'GOLD', 'SILVER', 'COMMUNITY'] as const)
    .map((tier) => ({ tier, count: partners.filter((partner) => partner.tier === tier).length }))
    .filter((row) => row.count > 0);

  const PILLARS = [
    {
      n: '01',
      kicker: 'Connect',
      title: 'Help security professionals find each other',
      tone: 'lime' as const,
      body: 'The member directory is the centre of the alliance and the reason most people join. Every member publishes a profile covering their role, organisation, discipline, location and specialisms, and every member can search it.',
      detail: `Security is a small industry with poor internal visibility. Most people can name five peers and have no route to the sixth. The directory replaces that with a searchable list of ${memberCount} people across ${disciplines.length} disciplines, with availability stated up front rather than guessed at.`,
      stat: `${memberCount} profiles`,
      href: '/directory',
      cta: 'Open the directory',
    },
    {
      n: '02',
      kicker: 'Grow',
      title: 'Professional and business growth',
      tone: 'tangerine' as const,
      body: 'Opportunities posted to the alliance cover senior roles, consulting partnerships, invitations to tender, speaking calls and non-executive appointments - the things that reach people through networks rather than job boards.',
      detail: `${opportunityCount} listings are open right now, and ${openToWorkCount} members have marked themselves open to approaches. Consultants and smaller practices get visibility they would otherwise have to buy.`,
      stat: `${opportunityCount} live listings`,
      href: '/opportunities',
      cta: 'See opportunities',
    },
    {
      n: '03',
      kicker: 'Learn',
      title: 'Industry content and practitioner expertise',
      tone: 'violet' as const,
      body: 'Resources are written by members doing the work, in modules you can finish in a sitting. Closed sessions are written up and circulated. Events carry recorded CPD hours against your member profile.',
      detail: `${resourceCount} resources covering ${moduleCount} modules, plus ${postCount} published insight pieces from members and partner researchers.`,
      stat: `${moduleCount} modules`,
      href: '/resources',
      cta: 'Browse resources',
    },
    {
      n: '04',
      kicker: 'Participate',
      title: 'Events, chapters and committees',
      tone: 'magenta' as const,
      body: 'Regional chapters run their own programme of meetings. The alliance runs the annual conference, working sessions, webinars and closed-door roundtables. Committees produce the guidance and consultation responses.',
      detail: `${chapterCount} chapters across ${countryCount} countries, ${eventCount} events on the record and ${registrationCount} member registrations against them.`,
      stat: `${chapterCount} chapters`,
      href: '/chapters',
      cta: 'Find your chapter',
    },
    {
      n: '05',
      kicker: 'Build the industry',
      title: 'A stronger, better-connected security ecosystem',
      tone: 'cobalt' as const,
      body: 'The parts of the job no single organisation can do alone: technical standards, installer and training quality, workforce and succession research, and responses to emerging regulation on connected products.',
      detail:
        'This work runs on members giving time to committees. It is slower than an events programme and it is the reason a professional body exists at all.',
      stat: 'Committee work',
      href: '/blog',
      cta: 'Read the research',
    },
  ];

  return (
    <div className="overflow-x-hidden">
      {/* ==================================================================
 HERO
 ================================================================== */}
      <section className="relative border-b border-line bg-base">
        <div className="absolute inset-0 mesh-grid" aria-hidden />

        <div className="relative mx-auto grid max-w-container-max grid-cols-1 items-start gap-10 px-4 py-14 lg:grid-cols-12 lg:gap-12 lg:px-10 lg:py-20">
          <div className="lg:col-span-7">
            <Reveal direction="down">
              <div className="mb-6 inline-flex flex-wrap items-center gap-2 border border-line bg-surface px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] shadow-panel">
                A professional association for the security industry
              </div>
            </Reveal>

            <Reveal direction="up" delay={0.05}>
              <h1 className="relative tracking-tight font-extrabold uppercase leading-[0.88]">
                <span className="relative inline-block text-5xl sm:text-7xl lg:text-8xl font-extrabold text-3d-pop tracking-tight">
                  WHAT THE
                  <span className="absolute -right-6 -top-4 text-cyan text-2xl animate-pulse">✦</span>
                </span>
                <span className="relative block text-5xl sm:text-7xl lg:text-8xl font-accent font-bold lowercase italic text-3d-pop-cyan -mt-3 sm:-mt-6 lg:-mt-8 rotate-[-3.5deg] drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]">
                  alliance is for!
                  <span className="absolute -left-6 bottom-2 text-white text-3xl animate-bounce">✦</span>
                </span>
              </h1>
            </Reveal>

            <Reveal direction="up" delay={0.12}>
              <p className="mt-7 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
                BSA exists to connect the people who are responsible for security - across corporate and physical
                security, cyber, risk, resilience, investigations, guarding and systems. It is a membership body, not a
                supplier:{' '}
                <strong className="text-cyan px-0.5 font-bold">it does not sell security products or services.</strong>
              </p>
            </Reveal>

            <Reveal direction="up" delay={0.18}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button href="/membership" tone="magenta" size="lg">
                  How membership works
                </Button>
                <Button href="/directory" tone="paper" size="lg">
                  Search the directory
                </Button>
              </div>
            </Reveal>

            <Reveal direction="up" delay={0.24}>
              <div className="mt-10 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat value={<Counter to={memberCount} />} label="Members" tone="lime" />
                <Stat value={<Counter to={chapterCount} />} label="Chapters" tone="paper" />
                <Stat value={<Counter to={countryCount} />} label="Countries" tone="paper" />
                <Stat value={<Counter to={disciplines.length} />} label="Disciplines" tone="paper" />
              </div>
            </Reveal>
          </div>

          {/* At a glance */}
          <div className="lg:col-span-5">
            <Reveal direction="left" delay={0.15}>
              <div className="relative">
                <div className="relative overflow-hidden rounded-3xl border border-cyan/30 bg-surface/90 backdrop-blur-xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] sm:p-7">
                  {/* Subtle Background Glow */}
                  <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan/15 blur-3xl" />

                  <div className="flex items-center justify-between border-b border-line/60 pb-4 mb-5">
                    <span className="inline-flex items-center gap-2 rounded-full border border-cyan/40 bg-cyan/20 px-3.5 py-1 font-mono text-xs font-bold text-cyan shadow-panel">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan" />
                      </span>
                      LIVE METRICS
                    </span>
                    <span className="font-mono text-xs font-extrabold uppercase tracking-wider text-white/80">
                      Platform Status
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-white tracking-tight mb-4">
                    What The Alliance Runs
                  </h3>

                  <div className="space-y-2.5">
                    {[
                      { icon: '👥', label: 'Member Directory', value: `${memberCount} profiles`, href: '/directory' },
                      { icon: '🌐', label: 'Regional Chapters', value: `${chapterCount} active`, href: '/chapters' },
                      { icon: '📅', label: 'Events Programme', value: `${upcomingEventCount} upcoming`, href: '/events' },
                      { icon: '💼', label: 'Opportunities Board', value: `${opportunityCount} open`, href: '/opportunities' },
                      { icon: '📚', label: 'Practitioner Resources', value: `${moduleCount} modules`, href: '/resources' },
                      { icon: '⚡', label: 'Published Insights', value: `${postCount} pieces`, href: '/blog' },
                    ].map((row) => (
                      <Link
                        key={row.label}
                        href={row.href}
                        className="group flex items-center justify-between gap-3 rounded-2xl border border-line/60 bg-base/80 p-3.5 transition-all duration-300 hover:border-cyan/50 hover:bg-surface hover:shadow-lg hover:-translate-y-0.5"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan/30 bg-cyan/10 text-sm shadow-panel">
                            {row.icon}
                          </span>
                          <span className="text-sm font-extrabold text-white transition-colors group-hover:text-cyan">
                            {row.label}
                          </span>
                        </div>
                        <span className="flex items-center gap-1 rounded-full border border-cyan/30 bg-cyan/15 px-3 py-1 font-mono text-xs font-bold text-cyan transition-all duration-300 group-hover:border-cyan group-hover:bg-cyan group-hover:text-black">
                          {row.value} <span className="transition-transform group-hover:translate-x-0.5">→</span>
                        </span>
                      </Link>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-line/60 pt-4 text-xs font-semibold text-ink-soft">
                    <span className="flex items-center gap-2 font-mono text-xs font-extrabold text-cyan">
                      ✓ Synchronized with live database
                    </span>
                    <span className="font-mono text-[10px] font-bold text-white/60">Auto-Refreshed</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <Marquee tone="violet" speed="normal" items={['CONNECT', 'GROW', 'LEARN', 'PARTICIPATE', 'BUILD THE INDUSTRY']} />

      {/* ==================================================================
  ALLIANCE GOAL & VISION DIRECTIVE
  ================================================================== */}
      <section className="relative border-b border-line py-16 lg:py-24 bg-base">
        <div className="mx-auto max-w-container-max px-5 lg:px-8">
          <SecurityVisionGrid />
        </div>
      </section>

      {/* ==================================================================
  WHAT THE ALLIANCE IS
  ================================================================== */}
      <section className="border-b border-line bg-surface/90 py-16 lg:py-20">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-7">
              <Reveal>
                <span className="mb-4 inline-block rounded-full border border-cyan/40 bg-cyan/20 px-4 py-1.5 font-mono text-xs font-bold text-cyan shadow-panel">
                  ⚡ The Short Version
                </span>
                <h2 className="text-display-md font-black text-white">
                  A membership body for people whose job is <span className="text-cyan px-1">security</span>
                </h2>
              </Reveal>

              <Reveal delay={0.08}>
                <div className="mt-6 space-y-5 text-base font-medium leading-relaxed text-white sm:text-lg">
                  <p>
                    Security is not one profession. A head of corporate security, a threat intelligence lead, a systems
                    integrator and an independent consultant all work on the same problem from different sides, usually
                    without knowing each other. The alliance brings them into one membership, one directory and one
                    events programme.
                  </p>
                  <p>
                    Membership is individual. You join as a person, publish a profile, and decide how much of it is
                    visible. Your organisation matters - it is on your profile and it is searchable - but the
                    relationship is with you, and it moves with you when you change jobs.
                  </p>
                  <p>
                    In practice a member does four things: finds people in the directory, joins the chapter covering
                    their region, attends events and working sessions, and uses the resources and opportunities board.
                    Committee work is the fifth, and the one that keeps the industry moving rather than just the
                    individual.
                  </p>
                  <p>
                    What BSA is not: a supplier, a reseller or a recruitment agency. Partner organisations fund the
                    programme and are listed openly with what they support, and what any member shares is set by that
                    member.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={0.14}>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button href="/membership" tone="magenta" size="lg">
                    What membership includes →
                  </Button>
                  <Button href="/contact?type=membership" tone="paper" size="lg">
                    Ask a question
                  </Button>
                </div>
              </Reveal>
            </div>

            <div className="lg:col-span-5">
              <Reveal direction="left" delay={0.12}>
                <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg">
                  <p className="font-mono text-xs font-bold uppercase tracking-wider text-cyan">
                    Disciplines represented in the directory
                  </p>
                  {disciplines.length === 0 ? (
                    <p className="mt-3 text-sm font-medium leading-relaxed text-ink-soft">
                      No member profiles have been published yet.
                    </p>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {disciplines.map((discipline) => (
                        <Chip key={discipline} size="sm">
                          {discipline}
                        </Chip>
                      ))}
                    </div>
                  )}
                  <p className="mt-5 border-t border-line pt-4 text-xs font-semibold leading-relaxed text-ink-soft">
                    Taken from the field each member selected on their own profile, not from a fixed taxonomy.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================
  THE FIVE PILLARS
  ================================================================== */}
      <section className="border-b border-line bg-base py-16 lg:py-20">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <SectionHead
            kicker="What the alliance does"
            tone="violet"
            title="What members actually use, in order"
            blurb="Each one is a working part of this platform rather than a statement of intent. The numbers underneath are live."
            action={
              <Button href="/register" tone="ink">
                Join the alliance →
              </Button>
            }
          />

          <div className="space-y-5">
            {PILLARS.map((pillar, i) => (
              <Reveal key={pillar.n} direction={i % 2 === 0 ? 'right' : 'left'} delay={Math.min(i * 0.04, 0.2)}>
                <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg overflow-hidden">
                  <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
                    <span className="font-mono text-xs font-extrabold uppercase tracking-wider text-cyan">
                      {pillar.n} · {pillar.kicker}
                    </span>
                    <span className="rounded-full bg-cyan/20 border border-cyan/40 px-3 py-1 font-mono text-xs font-bold text-cyan">{pillar.stat}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-center">
                    <div className="lg:col-span-5">
                      <h3 className="text-2xl font-black text-white leading-tight">{pillar.title}</h3>
                      <p className="mt-3 text-sm font-medium leading-relaxed text-white/90">{pillar.body}</p>
                    </div>
                    <div className="lg:col-span-7 lg:border-l lg:border-line lg:pl-6">
                      <p className="text-sm font-medium leading-relaxed text-ink-soft">{pillar.detail}</p>
                      <Button href={pillar.href} tone="paper" size="sm" className="mt-4">
                        {pillar.cta} →
                      </Button>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================================
  WHO IT IS FOR
  ================================================================== */}
      <section className="border-b border-line bg-base py-16 text-white lg:py-20">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <span className="mb-3 inline-block rounded-full border border-cyan/40 bg-cyan/20 px-4 py-1.5 font-mono text-xs font-bold text-cyan shadow-panel">
                Target Membership
              </span>
              <h2 className="text-display-md font-black text-white">Practising professionals, at every level</h2>
              <p className="mt-3 max-w-xl text-base font-medium leading-relaxed text-ink-soft">
                Membership assumes you work in security in some capacity. Beyond that the alliance is deliberately broad
                - the value of the directory comes from having the whole industry in it, not one slice of it.
              </p>
            </div>
            <Button href="/membership" tone="lime" size="lg">
              Membership detail →
            </Button>
          </div>

          <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {AUDIENCE.map((group, i) => (
              <RevealItem key={group.title} className="h-full">
                <div className="flex h-full flex-col justify-between rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg">
                  <div>
                    <span className="inline-block rounded-full bg-cyan/20 border border-cyan/40 px-3 py-1 font-mono text-xs font-bold text-cyan mb-3">
                      🛡️ {group.title}
                    </span>
                    <p className="text-sm font-medium leading-relaxed text-white/90">{group.body}</p>
                  </div>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ==================================================================
  HOW THE DIRECTORY WORKS
  ================================================================== */}
      <section className="border-b border-line bg-surface/90 py-16 lg:py-20">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-6">
              <Reveal>
                <span className="mb-4 inline-block rounded-full border border-cyan/40 bg-cyan/20 px-4 py-1.5 font-mono text-xs font-bold text-cyan shadow-panel">
                  Directory Privacy & Controls
                </span>
                <h2 className="text-display-md font-black text-white">You control what is visible</h2>
                <div className="mt-6 space-y-5 text-base font-medium leading-relaxed text-white sm:text-lg">
                  <p>
                    A profile holds your name, job title, organisation, discipline, location, years in the industry, a
                    short biography, your specialisms and your skills. You choose whether it is public, visible to
                    members only, or hidden while you continue to use everything else.
                  </p>
                  <p>
                    Contact details are separate switches. Email, phone, organisation, LinkedIn and website each have
                    their own visibility setting, so you can be findable without being contactable by every route.
                  </p>
                  <p>
                    Three availability switches do most of the useful work. They are the difference between hoping
                    someone will reply and knowing they are willing to be asked.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Stat value={<Counter to={mentoringCount} />} label="Open to mentoring" tone="lime" />
                  <Stat value={<Counter to={speakingCount} />} label="Open to speaking" tone="violet" />
                  <Stat value={<Counter to={openToWorkCount} />} label="Open to approaches" tone="magenta" />
                </div>
              </Reveal>
            </div>

            <div className="lg:col-span-6">
              <Reveal direction="left" delay={0.08}>
                <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg">
                  <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
                    <span className="text-base font-extrabold text-white">Profile Visibility Settings</span>
                    <span className="rounded-full bg-cyan/20 border border-cyan/40 px-3 py-1 font-mono text-xs font-bold text-cyan">Yours To Change</span>
                  </div>
                  <div>
                    <ul className="space-y-3">
                      {[
                        ['Public profile', 'Whether your profile page is reachable at all.'],
                        ['Listed in the directory', 'Whether you appear in member search results.'],
                        ['Show organisation', 'Some members cannot name their employer publicly.'],
                        ['Show email address', 'Off by default.'],
                        ['Show phone number', 'Off by default.'],
                        ['Show LinkedIn', 'The most-used contact route in practice.'],
                        ['Show website', 'Useful for consultants and independent practices.'],
                      ].map(([label, note]) => (
                        <li key={label} className="flex items-start gap-3">
                          <span
                            aria-hidden
                            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-cyan/40 bg-cyan/20 font-mono text-xs font-bold text-cyan"
                          >✓</span>
                          <span className="min-w-0">
                            <span className="block text-sm font-extrabold leading-snug text-white">{label}</span>
                            <span className="block text-xs font-medium leading-relaxed text-ink-soft">{note}</span>
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6 grid grid-cols-1 gap-3 border-t border-line pt-5 sm:grid-cols-2">
                      <Button href="/directory" tone="magenta" className="w-full">
                        Search the directory
                      </Button>
                      <Button href="/register" tone="paper" className="w-full">
                        Create a profile
                      </Button>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================
 HOW CHAPTERS WORK
 ================================================================== */}
      <section className="border-b border-line bg-base py-16 lg:py-20">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <SectionHead
            tone="tangerine"
            title={
              <>
                {chapterCount} regions, each running its <span className="text-amber px-1">own programme</span>
              </>
            }
            blurb="A chapter is a group of members in one region with a committee, a meeting cadence and a contact address. Joining one is a switch on your profile, and you can belong to more than one."
            action={
              <Button href="/contact?type=chapter" tone="ink">
                Propose a chapter →
              </Button>
            }
          />

          <RevealGroup className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { value: chapterMemberCount, label: 'Chapter memberships', tone: 'paper' as const },
              { value: chairCount, label: 'Chapter chairs', tone: 'lime' as const },
              { value: committeeCount, label: 'Committee members', tone: 'paper' as const },
              { value: countryCount, label: 'Countries', tone: 'ink' as const },
            ].map((tile) => (
              <RevealItem key={tile.label} className="h-full">
                <Stat value={<Counter to={tile.value} />} label={tile.label} tone={tile.tone} className="h-full" />
              </RevealItem>
            ))}
          </RevealGroup>

          {chapters.length === 0 ? (
            <EmptyState
              title="No chapters are listed"
              blurb="Chapters form when enough members in one region ask for one and a committee comes forward."
              action={
                <Button href="/contact?type=chapter" tone="ink">
                  Propose a chapter
                </Button>
              }
            />
          ) : (
            <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {chapters.map((chapter) => (
                <RevealItem key={chapter.slug} className="h-full">
                  <Link
                    href={`/chapters/${chapter.slug}`}
                    className="group flex h-full flex-col justify-between rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg transition-all duration-300 hover:border-cyan/50 hover:shadow-cyan/10 hover:-translate-y-1"
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
                        <span className="font-mono text-xs font-extrabold uppercase tracking-wider text-cyan">
                          {chapter.region}
                        </span>
                        <span aria-hidden className="text-xl">
                          {chapter.emoji}
                        </span>
                      </div>
                      <h3 className="text-lg font-black leading-tight text-white transition-colors group-hover:text-cyan">
                        {chapter.name}
                      </h3>
                      <p className="mt-1 font-mono text-xs font-bold uppercase tracking-wider text-cyan/80">
                        📍 {chapter.city}, {chapter.country}
                      </p>
                      <p className="mt-3 text-xs font-medium leading-relaxed text-white/90">{chapter.description}</p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-1.5 border-t border-line pt-4">
                      <Chip size="sm">{chapter.meetingCadence}</Chip>
                      <Chip size="sm">{chapter._count.memberships} members</Chip>
                      <Chip size="sm">Formed {chapter.foundedYear}</Chip>
                    </div>
                  </Link>
                </RevealItem>
              ))}
            </RevealGroup>
          )}

          <Reveal delay={0.1}>
            <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <div className="h-full rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg">
                  <p className="font-mono text-xs font-bold uppercase tracking-wider text-cyan">
                    Three roles inside a chapter
                  </p>
                  <ul className="mt-4 space-y-3">
                    {[
                      ['Member', 'Attends, hosts occasionally, and appears on the chapter roster.'],
                      ['Committee', 'Plans the programme, finds venues and speakers, and represents the region.'],
                      ['Chair', 'Accountable for the chapter and its reporting into the wider alliance.'],
                    ].map(([role, note]) => (
                      <li key={role} className="flex items-start gap-3">
                        <Chip tone={role === 'Chair' ? 'magenta' : role === 'Committee' ? 'violet' : 'paper'} size="sm">
                          {role}
                        </Chip>
                        <span className="min-w-0 flex-1 text-sm font-medium leading-relaxed text-white">{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="lg:col-span-5">
                <Placeholder title="Office-holders and governance">
                  Named office-holders - the board, the executive team and each chapter chair - are not published here
                  because the client has not supplied them. Provide the list and the governance structure, and it will
                  render in this position with links to the relevant member profiles.
                </Placeholder>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ==================================================================
  HOW IT IS FUNDED
  ================================================================== */}
      <section className="border-b border-line bg-surface/90 py-16 lg:py-20">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-5">
              <Reveal>
                <span className="mb-4 inline-block rounded-full border border-cyan/40 bg-cyan/20 px-4 py-1.5 font-mono text-xs font-bold text-cyan shadow-panel">
                  Funding & Sponsorship Model
                </span>
                <h2 className="text-display-md font-black text-white">Partners pay for the programme</h2>
                <div className="mt-6 space-y-5 text-base font-medium leading-relaxed text-white sm:text-lg">
                  <p>
                    {partners.length} {partners.length === 1 ? 'organisation partners' : 'organisations partner'} with
                    the alliance. Partner funding underwrites the annual conference, the chapter programme, the
                    resources library and the research the alliance publishes.
                  </p>
                  <p>
                    Every partner is listed publicly with what they support, so members can see exactly where the money
                    comes from and what it pays for. Partners appear in the directory as practitioners like anyone else
                    when their people join as members.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="mt-6 flex flex-wrap gap-2">
                  {tierRows.map((row) => (
                    <Chip key={row.tier} tone={TIER_TONE[row.tier] ?? 'paper'}>
                      {row.count} {row.tier}
                    </Chip>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button href="/sponsors" tone="magenta" size="lg">
                    All partners →
                  </Button>
                  <Button href="/contact?type=sponsor" tone="paper" size="lg">
                    Partner with BSA
                  </Button>
                </div>
              </Reveal>
            </div>

            <div className="lg:col-span-7">
              {rankedPartners.length === 0 ? (
                <EmptyState
                  title="No partners listed yet"
                  blurb="Partner organisations appear here once an agreement is confirmed."
                  action={
                    <Button href="/contact?type=sponsor" tone="ink">
                      Talk about partnering
                    </Button>
                  }
                />
              ) : (
                <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {rankedPartners.map((partner) => (
                    <RevealItem key={partner.id} className="h-full">
                      <Link
                        href="/sponsors"
                        className="group flex h-full flex-col justify-between rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg transition-all duration-300 hover:border-cyan/50 hover:shadow-cyan/10 hover:-translate-y-1"
                      >
                        <div>
                          <div className="flex items-center gap-3 border-b border-line pb-4 mb-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={partner.logoUrl}
                              alt=""
                              loading="lazy"
                              className="h-12 w-12 flex-shrink-0 rounded-xl border border-line object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="text-base font-black uppercase leading-tight text-white transition-colors group-hover:text-cyan">
                                {partner.name}
                              </h4>
                              <span className="mt-1 inline-block rounded-full bg-cyan/20 border border-cyan/40 px-2.5 py-0.5 font-mono text-[10px] font-bold text-cyan uppercase tracking-wider">
                                {partner.tier}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs font-medium leading-relaxed text-white/90">
                            {partner.description}
                          </p>
                        </div>
                        {partner.perkText && (
                          <div className="mt-4 border-t border-line pt-3 font-mono text-xs font-bold uppercase tracking-wider text-cyan">
                            ✨ {partner.perkText}
                          </div>
                        )}
                      </Link>
                    </RevealItem>
                  ))}
                </RevealGroup>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================
  CTA
  ================================================================== */}
      <section className="relative overflow-hidden border-b border-line bg-surface/90 py-16 lg:py-24">
        <div className="absolute inset-0 mesh-dots opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-container-max px-4 text-center lg:px-10">
          <Reveal>
            <span className="mb-6 inline-block rounded-full border border-cyan/40 bg-cyan/20 px-4 py-1.5 font-mono text-xs font-bold text-cyan shadow-panel">
              ⚡ {memberCount} Active Members & Counting
            </span>
            <h2 className="text-display-md mx-auto max-w-3xl font-black text-white">
              The industry is <span className="text-cyan px-1">easier</span> with the directory open.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base font-semibold leading-relaxed text-white sm:text-xl">
              Join as a member and you are searchable the same day. If you would rather understand the model first, send
              an enquiry and a person will answer it in writing.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button href="/register" tone="magenta" size="lg">
                Join the alliance →
              </Button>
              <Button href="/contact?type=membership" tone="paper" size="lg">
                Send an enquiry
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
