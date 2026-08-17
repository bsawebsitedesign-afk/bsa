import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardBar, CardBody } from '@/components/ui/card';
import { Chip, LiveDot, categoryEmoji } from '@/components/ui/badge';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/reveal';
import { SectionHead, Sticker } from '@/components/ui/misc';
import { formatDate, parseList, relativeTime } from '@/lib/utils';
import { ApplyPanel, type ApplyPrefill } from './apply-client';

/* --------------------------------------------------------------------------
 * Taxonomy - kept local. A Server Component cannot import values from a
 * 'use client' module and use them at render time on the server.
 * ----------------------------------------------------------------------- */

type TypeTone = 'cobalt' | 'lime' | 'tangerine' | 'violet' | 'magenta';

const TYPE_TONE: Record<string, TypeTone> = {
  ROLE: 'cobalt',
  PARTNERSHIP: 'lime',
  RFP: 'tangerine',
  SPEAKING: 'violet',
  BOARD_POSITION: 'magenta',
};

const TYPE_LABEL: Record<string, string> = {
  ROLE: 'Senior role',
  PARTNERSHIP: 'Partnership',
  RFP: 'Tender',
  SPEAKING: 'Speaking call',
  BOARD_POSITION: 'Board appointment',
};

const TYPE_EMOJI: Record<string, string> = {
  ROLE: '💼',
  PARTNERSHIP: '🤝',
  RFP: '📑',
  SPEAKING: '🎙️',
  BOARD_POSITION: '🏛️',
};

function typeEmoji(type: string): string {
  const kit = categoryEmoji(type);
  return kit === '▪' ? (TYPE_EMOJI[type] ?? kit) : kit;
}

const TYPE_LINE: Record<string, string> = {
  ROLE: 'A senior appointment, posted by the organisation doing the hiring.',
  PARTNERSHIP: 'A commercial approach: the organisation below is looking for a partner, not an employee.',
  RFP: 'An open procurement. Read the requirements before you spend time on a bid.',
  SPEAKING: 'A call for speakers. Proposals go to the programme team behind the event.',
  BOARD_POSITION: 'A board, advisory or committee vacancy. Time commitment matters as much as the background.',
};

const BODY_HEADING: Record<string, string> = {
  ROLE: 'The role',
  PARTNERSHIP: 'The partnership',
  RFP: 'The tender',
  SPEAKING: 'The call',
  BOARD_POSITION: 'The appointment',
};

const REQ_HEADING: Record<string, string> = {
  ROLE: 'What they are looking for',
  PARTNERSHIP: 'Partner criteria',
  RFP: 'Bidder requirements',
  SPEAKING: 'What a proposal needs',
  BOARD_POSITION: 'Candidate criteria',
};

const PLACE_LINE: Record<string, string> = {
  REMOTE: 'Delivered remotely',
  HYBRID: 'Hybrid working',
  ONSITE: 'On site',
};

/* --------------------------------------------------------------------------
 * **bold** inside a paragraph, without pulling in a markdown parser.
 * ----------------------------------------------------------------------- */

function renderRich(text: string): React.ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-bold text-ink">
        {part}
      </strong>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
}

async function loadOpportunity(slug: string) {
  return prisma.opportunity.findUnique({
    where: { slug },
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
      postedAt: true,
      isPublished: true,
      _count: { select: { applications: true } },
    },
  });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const opportunity = await loadOpportunity(params.slug);

  if (!opportunity || !opportunity.isPublished) {
    return { title: 'Listing not found', description: 'That listing is no longer on the board.' };
  }

  const first =
    opportunity.description
      .split(/\n{2,}/)[0]
      ?.replace(/\*\*/g, '')
      .replace(/\s+/g, ' ')
      .trim() ?? '';

  return {
    title: `${opportunity.title} - ${opportunity.org}`,
    description: first.length > 155 ? `${first.slice(0, 152).trimEnd()}…` : first,
    openGraph: {
      title: `${opportunity.title} · ${opportunity.org}`,
      description: `${TYPE_LABEL[opportunity.type] ?? opportunity.type} · ${opportunity.location}${
        opportunity.compensation ? ` · ${opportunity.compensation}` : ''
      }`,
    },
  };
}

export default async function OpportunityPage({ params }: { params: { slug: string } }) {
  const opportunity = await loadOpportunity(params.slug);

  if (!opportunity || !opportunity.isPublished) notFound();

  const session = await getSession();

  const [profile, existing, nearby] = await Promise.all([
    session
      ? prisma.memberProfile.findUnique({
          where: { userId: session.userId },
          select: { fullName: true, org: true, linkedinUrl: true },
        })
      : Promise.resolve(null),
    session
      ? prisma.application.findUnique({
          where: { opportunityId_email: { opportunityId: opportunity.id, email: session.email } },
          select: { id: true },
        })
      : Promise.resolve(null),
    prisma.opportunity.findMany({
      where: { isPublished: true, slug: { not: opportunity.slug } },
      orderBy: { postedAt: 'desc' },
      take: 9,
      select: {
        slug: true,
        title: true,
        org: true,
        logoUrl: true,
        type: true,
        location: true,
        compensation: true,
        deadline: true,
      },
    }),
  ]);

  // Same kind of listing first, then whatever else is newest.
  const related = [...nearby]
    .sort((a, b) => Number(b.type === opportunity.type) - Number(a.type === opportunity.type))
    .slice(0, 3);

  const prefill: ApplyPrefill | null = session
    ? {
        name: profile?.fullName ?? '',
        email: session.email,
        org: profile?.org ?? '',
        profileUrl: profile?.linkedinUrl ?? '',
      }
    : null;

  const paragraphs = opportunity.description
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const requirements = parseList(opportunity.requirements);

  const deadlineMs = opportunity.deadline ? opportunity.deadline.getTime() : null;
  const closed = deadlineMs !== null && deadlineMs < Date.now();
  const daysLeft = deadlineMs !== null ? Math.max(0, Math.ceil((deadlineMs - Date.now()) / 86_400_000)) : null;
  const closingSoon = !closed && daysLeft !== null && daysLeft <= 14;
  const deadlineLabel = opportunity.deadline ? formatDate(opportunity.deadline) : null;

  const tone = TYPE_TONE[opportunity.type] ?? 'cobalt';
  const typeLabel = TYPE_LABEL[opportunity.type] ?? opportunity.type;

  const isAppointment = opportunity.type === 'ROLE' || opportunity.type === 'BOARD_POSITION';

  const jsonLd = isAppointment
    ? {
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        title: opportunity.title,
        description: opportunity.description,
        datePosted: opportunity.postedAt.toISOString(),
        ...(opportunity.deadline ? { validThrough: opportunity.deadline.toISOString() } : {}),
        employmentType: opportunity.type === 'BOARD_POSITION' ? 'PART_TIME' : 'FULL_TIME',
        hiringOrganization: { '@type': 'Organization', name: opportunity.org },
        ...(opportunity.locationType === 'REMOTE' ? { jobLocationType: 'TELECOMMUTE' } : {}),
        jobLocation: {
          '@type': 'Place',
          address: { '@type': 'PostalAddress', addressLocality: opportunity.location },
        },
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: `${opportunity.title} - ${opportunity.org}`,
        description: opportunity.description.split(/\n{2,}/)[0]?.replace(/\*\*/g, '') ?? '',
        datePublished: opportunity.postedAt.toISOString(),
      };

  return (
    <div className="overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ==================================================================
 HEADER
 ================================================================== */}
      <section className="relative border-b border-line bg-base">
        <div className="absolute inset-0 mesh-grid" aria-hidden />

        <div className="relative mx-auto max-w-container-max px-4 py-10 lg:px-10 lg:py-14">
          <Reveal direction="down">
            <Link
              href="/opportunities"
              className="inline-flex items-center gap-2 border border-line bg-surface px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] shadow-panel panel-hover"
            >
              ← All listings
            </Link>
          </Reveal>

          {opportunity.coverImageUrl && (
            <Reveal direction="down">
              <div className="mb-6 overflow-hidden border border-line bg-surface shadow-panel">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={opportunity.coverImageUrl}
                  alt={`${opportunity.title} Cover`}
                  className="h-48 sm:h-64 w-full object-cover"
                />
              </div>
            </Reveal>
          )}

          <div className="mt-7 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <Reveal direction="up" delay={0.05}>
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <Chip tone={tone}>
                    {typeEmoji(opportunity.type)} {typeLabel}
                  </Chip>
                  <Chip tone="ink">{PLACE_LINE[opportunity.locationType] ?? opportunity.locationType}</Chip>
                  {closed ? (
                    <Chip tone="paper" className="text-ink-muted">
                      Closed
                    </Chip>
                  ) : closingSoon ? (
                    <Chip tone="magenta">
                      <LiveDot tone="lime" /> Closes {relativeTime(opportunity.deadline as Date)}
                    </Chip>
                  ) : (
                    <Chip tone="lime">Open</Chip>
                  )}
                </div>
              </Reveal>

              <Reveal direction="up" delay={0.1}>
                <div className="flex items-start gap-4">
                  {opportunity.logoUrl && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={opportunity.logoUrl}
                        alt={`${opportunity.org} logo`}
                        loading="lazy"
                        className="hidden h-16 w-16 flex-shrink-0 border border-line bg-surface object-cover shadow-panel sm:block"
                      />
                    </>
                  )}
                  <h1 className="text-display-lg">{opportunity.title}</h1>
                </div>
              </Reveal>

              <Reveal direction="up" delay={0.16}>
                <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                  <span className="text-ink">{opportunity.org}</span>
                  <span aria-hidden className="text-ink-muted">
                    /
                  </span>
                  <span> {opportunity.location}</span>
                  <span aria-hidden className="text-ink-muted">
                    /
                  </span>
                  <span>{PLACE_LINE[opportunity.locationType] ?? opportunity.locationType}</span>
                  {opportunity.compensation && (
                    <>
                      <span aria-hidden className="text-ink-muted">
                        /
                      </span>
                      <span className="text-cyan px-1 text-ink">{opportunity.compensation}</span>
                    </>
                  )}
                </p>
              </Reveal>

              <Reveal direction="up" delay={0.2}>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
                  {TYPE_LINE[opportunity.type] ??
                    'Posted on the BSA opportunities board by the organisation named above.'}
                </p>
              </Reveal>
            </div>

            {/* Countdown */}
            <div className="lg:col-span-4">
              <Reveal direction="left" delay={0.12}>
                <div className="relative">
                  {closingSoon && !closed && (
                    <Sticker tone="magenta" rotate={-8} className="absolute -left-2 -top-4 z-20 text-[10px]">
                      closing soon
                    </Sticker>
                  )}

                  <div
                    className={`border border-line p-5 shadow-panel-lg ${
                      closed ? 'bg-surface-inset' : closingSoon ? 'bg-grad-brand-soft text-ink' : 'bg-surface'
                    }`}
                  >
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">
                      {closed ? 'Responses closed' : deadlineLabel ? 'Responses close' : 'Deadline'}
                    </p>

                    <p className="mt-2 font-display text-5xl leading-none">
                      {closed ? 'CLOSED' : daysLeft === null ? 'OPEN' : daysLeft === 0 ? 'TODAY' : daysLeft}
                    </p>

                    <p className="mt-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em]">
                      {closed
                        ? `Closed ${deadlineLabel}`
                        : daysLeft === null
                          ? 'Rolling - reviewed as they arrive'
                          : daysLeft === 0
                            ? 'Final day to respond'
                            : `days left · ${deadlineLabel}`}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-dashed border-current pt-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em]">
                      <span>Posted {relativeTime(opportunity.postedAt)}</span>
                      <span>
                        {opportunity._count.applications === 0
                          ? 'No responses yet'
                          : `${opportunity._count.applications} responded`}
                      </span>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================
 BODY
 ================================================================== */}
      <section className="border-b border-line bg-surface py-14 lg:py-20">
        <div className="mx-auto grid max-w-container-max grid-cols-1 gap-10 px-4 lg:grid-cols-12 lg:px-10">
          {/* Rail - first on small screens so responding is never a scroll hunt */}
          <div className="order-1 lg:order-2 lg:col-span-4">
            <div className="space-y-5 lg:sticky lg:top-24">
              <ApplyPanel
                slug={opportunity.slug}
                title={opportunity.title}
                org={opportunity.org}
                type={opportunity.type}
                applyUrl={opportunity.applyUrl}
                compensation={opportunity.compensation}
                location={opportunity.location}
                deadlineLabel={deadlineLabel}
                daysLeft={daysLeft}
                closed={closed}
                responses={opportunity._count.applications}
                prefill={prefill}
                alreadyApplied={Boolean(existing)}
              />

              {/* Organisation card */}
              <Card>
                <CardBar tone="ink">
                  <span>Posted by</span>
                  <span className="opacity-70">{typeLabel}</span>
                </CardBar>
                <CardBody className="space-y-4">
                  <div className="flex items-center gap-3">
                    {opportunity.logoUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={opportunity.logoUrl}
                          alt=""
                          loading="lazy"
                          className="h-14 w-14 flex-shrink-0 border border-line bg-surface object-cover shadow-panel"
                        />
                      </>
                    ) : (
                      <span
                        aria-hidden
                        className="flex h-14 w-14 flex-shrink-0 items-center justify-center border border-line bg-surface-inset font-display text-xl shadow-panel"
                      >
                        {opportunity.org.slice(0, 1)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-display text-base uppercase leading-tight">{opportunity.org}</p>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                        {opportunity.location}
                      </p>
                    </div>
                  </div>

                  <dl className="space-y-2 border-t border-dashed border-line pt-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em]">
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-ink-muted">Listing type</dt>
                      <dd className="text-right">{typeLabel}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-ink-muted">Arrangement</dt>
                      <dd className="text-right">{PLACE_LINE[opportunity.locationType] ?? opportunity.locationType}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-ink-muted">Compensation</dt>
                      <dd className="text-right">{opportunity.compensation ?? 'On application'}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-ink-muted">Posted</dt>
                      <dd className="text-right">{formatDate(opportunity.postedAt)}</dd>
                    </div>
                  </dl>

                  <p className="border-t border-dashed border-line pt-3 text-xs leading-relaxed text-ink-muted">
                    Listings are posted by BSA members and partner organisations. Your response goes to them directly.
                  </p>
                </CardBody>
              </Card>

              {/* Cross-sell */}
              <div className="border border-line bg-violet/15 p-5 text-ink shadow-panel">
                <p className="font-display text-sm uppercase leading-tight">Do your homework first</p>
                <p className="mt-2 text-xs leading-relaxed text-ink/75">
                  Someone in the directory has probably worked with {opportunity.org}, bid against them, or sat on the
                  other side of a table from them. Ask before you write.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <Button href="/directory" tone="lime" size="sm" className="w-full">
                    Search the directory
                  </Button>
                  <Button href="/events" tone="paper" size="sm" className="w-full">
                    Where people meet
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Main column */}
          <div className="order-2 lg:order-1 lg:col-span-8">
            <Reveal>
              <h2 className="text-display-md">{BODY_HEADING[opportunity.type] ?? 'The detail'}</h2>
              <div className="mt-5 space-y-5 border-l border-line pl-5">
                {paragraphs.map((paragraph, i) => (
                  <p key={i} className="text-base leading-relaxed text-ink-soft">
                    {renderRich(paragraph)}
                  </p>
                ))}
              </div>
            </Reveal>

            {requirements.length > 0 && (
              <Reveal delay={0.06}>
                <div className="mt-12">
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <h2 className="text-display-md">{REQ_HEADING[opportunity.type] ?? 'Requirements'}</h2>
                    <span className="border border-line bg-cyan/12 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] shadow-panel">
                      {requirements.length} {requirements.length === 1 ? 'point' : 'points'}
                    </span>
                  </div>

                  <RevealGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {requirements.map((requirement) => (
                      <RevealItem key={requirement}>
                        <div className="flex h-full items-start gap-3 rounded-xl border border-line bg-surface/90 p-4 shadow-panel transition-all hover:border-cyan/40">
                          <span
                            aria-hidden
                            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan/20 border border-cyan/40 font-mono text-xs font-extrabold text-cyan"
                          >
                            ✓
                          </span>
                          <span className="text-sm font-medium leading-relaxed text-white">{requirement}</span>
                        </div>
                      </RevealItem>
                    ))}
                  </RevealGroup>

                  <p className="mt-4 border border-dashed border-line bg-amber/10 p-4 text-sm leading-relaxed text-ink-soft">
                    <strong className="font-bold">Read this list as the shortlist criteria.</strong> If you meet most of
                    it, say so plainly in your note and be specific about the parts you do not. Vague responses are the
                    ones that go unanswered.
                  </p>
                </div>
              </Reveal>
            )}

            {/* Responding well */}
            <Reveal delay={0.08}>
              <div className="mt-12">
                <h2 className="text-display-md text-white">Writing a response worth reading</h2>
                <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
                  {[
                    {
                      k: 'Lead with the closest match',
                      d: 'One piece of comparable work, named and dated. Not a summary of your whole career.',
                      badgeTone: 'bg-cyan/20 border-cyan/40 text-cyan',
                      borderHover: 'hover:border-cyan/40',
                    },
                    {
                      k: 'Link something checkable',
                      d: 'Your LinkedIn, your firm, your BSA profile. Anything they can open in five seconds.',
                      badgeTone: 'bg-violet/20 border-violet/40 text-violet-bright',
                      borderHover: 'hover:border-violet/40',
                    },
                    {
                      k: 'Be clear on availability',
                      d: 'Start date, capacity, notice period, or the days a year you can genuinely give.',
                      badgeTone: 'bg-magenta/20 border-magenta/40 text-magenta',
                      borderHover: 'hover:border-magenta/40',
                    },
                  ].map((tip, i) => (
                    <div
                      key={tip.k}
                      className={`rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg transition-all duration-200 ${tip.borderHover}`}
                    >
                      <span className={`inline-block rounded-full border px-3 py-1 font-mono text-xs font-bold ${tip.badgeTone}`}>
                        0{i + 1}
                      </span>
                      <p className="mt-4 text-base font-extrabold text-white leading-snug">{tip.k}</p>
                      <p className="mt-2 text-xs font-medium leading-relaxed text-ink-soft">{tip.d}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ==================================================================
 RELATED
 ================================================================== */}
      {related.length > 0 && (
        <section className="border-b border-line bg-base py-16 lg:py-20">
          <div className="mx-auto max-w-container-max px-4 lg:px-10">
            <SectionHead
              kicker="Also on the board"
              tone="tangerine"
              title="Worth a look while you are here"
              blurb="Other live listings, closest in kind to this one first."
              action={
                <Button href="/opportunities" tone="ink" arrow>
                  Back to the board
                </Button>
              }
            />

            <RevealGroup className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {related.map((listing) => (
                <RevealItem key={listing.slug}>
                  <Card href={`/opportunities/${listing.slug}`} className="group h-full">
                    <CardBar tone={TYPE_TONE[listing.type] ?? 'cobalt'}>
                      <span>
                        {typeEmoji(listing.type)} {TYPE_LABEL[listing.type] ?? listing.type}
                      </span>
                    </CardBar>
                    <CardBody className="flex h-full flex-col">
                      <div className="flex items-start gap-3">
                        {listing.logoUrl && (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={listing.logoUrl}
                              alt=""
                              loading="lazy"
                              className="h-10 w-10 flex-shrink-0 border border-line bg-surface object-cover"
                            />
                          </>
                        )}
                        <div className="min-w-0">
                          <h3 className="text-base leading-tight transition-colors group-hover:text-violet-bright">
                            {listing.title}
                          </h3>
                          <p className="mt-1 truncate font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                            {listing.org}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-1 flex-wrap content-end items-end gap-2">
                        <Chip size="sm"> {listing.location}</Chip>
                        {listing.compensation && (
                          <Chip tone="lime" size="sm">
                            {listing.compensation}
                          </Chip>
                        )}
                      </div>

                      {listing.deadline && (
                        <p className="mt-3 border-t border-dashed border-line pt-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                          Closes {relativeTime(listing.deadline)}
                        </p>
                      )}
                    </CardBody>
                  </Card>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>
      )}
    </div>
  );
}
