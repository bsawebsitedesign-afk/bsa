import React from 'react';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardBar, CardBody } from '@/components/ui/card';
import { Chip, LiveDot, categoryEmoji } from '@/components/ui/badge';
import { Marquee } from '@/components/ui/marquee';
import { Counter } from '@/components/ui/counter';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/reveal';
import { SectionHead, Stat, Sticker } from '@/components/ui/misc';
import { OpportunitiesBoard, type BoardListing } from './opportunities-client';

export const revalidate = 30;

/* --------------------------------------------------------------------------
 * Listing taxonomy. Deliberately duplicated in the client module rather than
 * shared across the boundary - a Server Component cannot call a function that
 * lives in a 'use client' file.
 * ----------------------------------------------------------------------- */

const OPPORTUNITY_TYPES = ['ROLE', 'PARTNERSHIP', 'RFP', 'SPEAKING', 'BOARD_POSITION'] as const;

const TYPE_LABEL: Record<string, string> = {
  ROLE: 'Senior role',
  PARTNERSHIP: 'Partnership',
  RFP: 'Tender',
  SPEAKING: 'Speaking call',
  BOARD_POSITION: 'Board appointment',
};

const TYPE_TONE: Record<string, 'lime' | 'magenta' | 'violet' | 'tangerine' | 'cobalt'> = {
  ROLE: 'cobalt',
  PARTNERSHIP: 'lime',
  RFP: 'tangerine',
  SPEAKING: 'violet',
  BOARD_POSITION: 'magenta',
};

/** The shared kit does not yet carry the new listing types; fall back locally. */
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

export const metadata: Metadata = {
  title: 'Opportunities',
  description:
    'Senior appointments, partnership approaches, invitations to tender, calls for speakers and board vacancies - posted by BSA members and partner organisations.',
  openGraph: {
    title: 'Business opportunities · BSA',
    description:
      'One board for the commercial side of the security industry: roles, partnerships, tenders, speaking calls and board appointments.',
  },
};

/** What each listing type actually means, so nobody has to guess. */
const TYPE_NOTE: Record<string, string> = {
  ROLE: 'Permanent and interim appointments at senior and head-of-function level, posted by the hiring organisation.',
  PARTNERSHIP: 'Approaches from firms looking for delivery partners, referral arrangements or white-label capability.',
  RFP: 'Invitations to tender and requests for proposal, including infrastructure and public-sector work.',
  SPEAKING: 'Calls for speakers, panellists and session chairs at conferences, roundtables and member events.',
  BOARD_POSITION: 'Non-executive directorships, advisory seats and committee vacancies. Paid and voluntary.',
};

/** First paragraph, trimmed - cards only ever show two lines of it. */
function blurbOf(description: string): string {
  const first =
    description
      .split(/\n{2,}/)[0]
      ?.replace(/\s+/g, ' ')
      .trim() ?? '';
  return first.length > 165 ? `${first.slice(0, 162).trimEnd()}…` : first;
}

export default async function OpportunitiesPage({ searchParams }: { searchParams?: { type?: string | string[] } }) {
  let rows: any[] = [];

  try {
    rows = await prisma.opportunity.findMany({
      where: { isPublished: true },
      orderBy: { postedAt: 'desc' },
      select: {
        slug: true,
        title: true,
        org: true,
        logoUrl: true,
        type: true,
        locationType: true,
        location: true,
        compensation: true,
        description: true,
        deadline: true,
        postedAt: true,
        _count: { select: { applications: true } },
      },
    });
  } catch (err) {
    console.error('Opportunities DB Error on Serverless:', err);
  }

  const listings: BoardListing[] = rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    org: row.org,
    logoUrl: row.logoUrl,
    type: row.type,
    locationType: row.locationType,
    location: row.location,
    compensation: row.compensation,
    deadline: row.deadline ? row.deadline.toISOString() : null,
    postedAt: row.postedAt.toISOString(),
    responses: row._count.applications,
    blurb: blurbOf(row.description),
  }));

  // ?type=SPEAKING - the footer links straight to the speaking calls.
  const rawType = Array.isArray(searchParams?.type) ? searchParams?.type[0] : searchParams?.type;
  const requested = (rawType ?? '').toUpperCase();
  const initialType = (OPPORTUNITY_TYPES as readonly string[]).includes(requested) ? requested : 'ALL';

  const now = Date.now();
  const orgCount = new Set(listings.map((listing) => listing.org)).size;
  const flexibleCount = listings.filter((listing) => listing.locationType !== 'ONSITE').length;
  const closingSoon = listings.filter((listing) => {
    if (!listing.deadline) return false;
    const days = (new Date(listing.deadline).getTime() - now) / 86_400_000;
    return days >= 0 && days <= 14;
  }).length;

  const typeCounts: Record<string, number> = {};
  for (const type of OPPORTUNITY_TYPES) typeCounts[type] = 0;
  for (const listing of listings) {
    if (typeCounts[listing.type] !== undefined) typeCounts[listing.type] += 1;
  }
  const peak = Math.max(1, ...Object.values(typeCounts));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'BSA business opportunities',
    numberOfItems: listings.length,
    itemListElement: listings.slice(0, 10).map((listing, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `${listing.title} - ${listing.org}`,
      url: `/opportunities/${listing.slug}`,
    })),
  };

  return (
    <div className="overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ==================================================================
 HERO
 ================================================================== */}
      <section className="relative border-b border-line bg-base">
        <div className="absolute inset-0 mesh-grid" aria-hidden />

        <div className="relative mx-auto grid max-w-container-max grid-cols-1 items-center gap-12 px-4 py-16 lg:grid-cols-12 lg:px-10 lg:py-20">
          <div className="lg:col-span-7">
            <Reveal direction="down">
              <div className="mb-6 inline-flex items-center gap-2 border border-line bg-amber/12 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink shadow-panel">
                Grow · the opportunities board
              </div>
            </Reveal>

            <Reveal direction="up" delay={0.05}>
              <h1 className="relative tracking-tight font-extrabold uppercase leading-[0.88]">
                <span className="relative inline-block text-5xl sm:text-7xl lg:text-8xl font-extrabold text-3d-pop tracking-tight">
                  SENIOR APPOINTMENTS &
                  <span className="absolute -right-6 -top-4 text-cyan text-2xl animate-pulse">✦</span>
                </span>
                <span className="relative block text-5xl sm:text-7xl lg:text-8xl font-accent font-bold lowercase italic text-3d-pop-cyan -mt-3 sm:-mt-6 lg:-mt-8 rotate-[-3.5deg] drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]">
                  live opportunities!
                  <span className="absolute -left-6 bottom-2 text-white text-3xl animate-bounce">✦</span>
                </span>
              </h1>
            </Reveal>

            <Reveal direction="up" delay={0.12}>
              <p className="mt-7 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
                {listings.length} live {listings.length === 1 ? 'listing' : 'listings'} from {orgCount}{' '}
                {orgCount === 1 ? 'organisation' : 'organisations'}: senior appointments, partnership approaches,
                invitations to tender, calls for speakers and board vacancies. Posted by{' '}
                <strong className="text-amber px-0.5 font-bold">members and partner organisations</strong>, not scraped
                from anywhere.
              </p>
            </Reveal>

            <Reveal direction="up" delay={0.18}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button href="#board" tone="magenta" size="lg">
                  ↓ Open the board
                </Button>
                <Button href="/contact" tone="paper" size="lg">
                  Post an opportunity
                </Button>
              </div>
            </Reveal>

            <Reveal direction="up" delay={0.24}>
              <div className="mt-10 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat value={<Counter to={listings.length} />} label="Live listings" tone="lime" />
                <Stat value={<Counter to={orgCount} />} label="Organisations" tone="paper" />
                <Stat value={<Counter to={flexibleCount} />} label="Remote or hybrid" tone="paper" />
                <Stat
                  value={<Counter to={closingSoon} />}
                  label="Close within 14 days"
                  tone={closingSoon > 0 ? 'magenta' : 'paper'}
                />
              </div>
            </Reveal>
          </div>

          {/* Board index - the live shape of the board, straight from the data. */}
          <div className="lg:col-span-5">
            <Reveal direction="left" delay={0.15}>
              <div>
                <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md shadow-panel-lg overflow-hidden">
                  <div className="flex items-center justify-between border-b border-line bg-surface-inset/80 px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg font-extrabold text-white">Board Index</span>
                      <span className="rounded-full bg-cyan/20 border border-cyan/40 px-2.5 py-0.5 font-mono text-[10px] font-bold text-cyan uppercase tracking-wider">
                        ✦ Live
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-cyan flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-cyan animate-pulse" /> By Listing Type
                    </span>
                  </div>

                  <ul className="divide-y divide-line/60 px-6 py-2">
                    {OPPORTUNITY_TYPES.map((type) => (
                      <li key={type} className="py-3.5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-white flex items-center gap-2">
                            <span className="text-base">{typeEmoji(type)}</span>
                            {TYPE_LABEL[type]}
                          </span>
                          <span className="rounded-full bg-cyan/20 border border-cyan/40 px-3 py-0.5 font-mono text-xs font-bold text-cyan">
                            {typeCounts[type]}
                          </span>
                        </div>
                        <div className="mt-2.5 h-2 w-full rounded-full bg-surface-raised overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan/40 to-cyan transition-all duration-500"
                            style={{ width: `${Math.max(4, Math.round((typeCounts[type] / peak) * 100))}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center justify-between border-t border-line bg-cyan/15 px-6 py-4 font-mono text-xs font-bold uppercase tracking-wider text-cyan">
                    <span>💡 {listings.length} Open Listings</span>
                    <span>{closingSoon} Closing Soon</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <Marquee
        tone="lime"
        items={[
          'SENIOR APPOINTMENTS',
          'PARTNERSHIP APPROACHES',
          'INVITATIONS TO TENDER',
          'CALLS FOR SPEAKERS',
          'BOARD VACANCIES',
          'POSTED BY MEMBERS',
        ]}
      />

      {/* ==================================================================
 WHAT GETS POSTED HERE
 ================================================================== */}
      <section className="border-b border-line bg-surface py-16 lg:py-20">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <SectionHead
            kicker="What this board is"
            tone="violet"
            title={
              <>
                Business, not <span className="text-gradient">job ads</span>
              </>
            }
            blurb="Most of what passes through a security network never reaches a public listing. This is where members and partner organisations put the parts that can be shared."
            action={
              <Button href="#board" tone="ink">
                Jump to listings →
              </Button>
            }
          />

          <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {OPPORTUNITY_TYPES.map((type, i) => (
              <RevealItem key={type}>
                <Card className="h-full" tilt={(i % 3 === 1 ? 2 : 0) as 0 | 2} interactive>
                  <CardBar tone={TYPE_TONE[type]}>
                    <span>
                      {typeEmoji(type)} {TYPE_LABEL[type]}
                    </span>
                    <span className="tabular-nums opacity-80">{typeCounts[type]} live</span>
                  </CardBar>
                  <CardBody>
                    <p className="text-sm leading-relaxed text-ink-soft">{TYPE_NOTE[type]}</p>
                  </CardBody>
                </Card>
              </RevealItem>
            ))}

            <RevealItem>
              <div className="flex h-full flex-col justify-between gap-4 border border-line bg-cyan/10 p-5 shadow-panel">
                <div>
                  <p className="font-display text-sm uppercase leading-tight">Who sees your response</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    Whatever you send goes to the organisation that posted the listing. BSA records it against the
                    listing so the board stays accountable, and does not pass it anywhere else.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Chip tone="lime" size="sm">
                    Members and partners post
                  </Chip>
                  <Chip size="sm">One response per email</Chip>
                </div>
              </div>
            </RevealItem>
          </RevealGroup>
        </div>
      </section>

      {/* ==================================================================
 THE BOARD
 ================================================================== */}
      <section id="board" className="scroll-mt-24 border-b border-line bg-base py-16 lg:py-20">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <OpportunitiesBoard listings={listings} initialType={initialType} />
        </div>
      </section>

      {/* ==================================================================
 WHAT HAPPENS NEXT
 ================================================================== */}
      <section className="border-b border-line bg-surface py-20">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <SectionHead
            tone="tangerine"
            title={
              <>
                Four fields, then a <span className="text-gradient">real</span> conversation
              </>
            }
            blurb="Responding takes about two minutes. There is no document upload, no scoring, and no portal to keep a password for."
          />

          <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: '01',
                t: 'Send your details',
                d: 'Name, email, your organisation, a profile link and a short note if the listing warrants one.',
                tone: 'lime' as const,
                emoji: '',
              },
              {
                n: '02',
                t: 'It reaches the poster',
                d: 'Your response goes to the organisation behind the listing, tagged as having come through BSA.',
                tone: 'tangerine' as const,
                emoji: '',
              },
              {
                n: '03',
                t: 'They come back to you',
                d: 'Any conversation after that is directly between you and them. BSA does not sit in the middle of it.',
                tone: 'violet' as const,
                emoji: '',
              },
              {
                n: '04',
                t: 'Your profile backs it up',
                d: 'Most people look you up before replying. A current directory profile does more work than a covering letter.',
                tone: 'magenta' as const,
                emoji: '',
              },
            ].map((step, i) => (
              <RevealItem key={step.n}>
                <Card className="h-full" tilt={(i % 2 === 0 ? 1 : 2) as 1 | 2} interactive>
                  <CardBar tone={step.tone}>
                    <span>Step {step.n}</span>
                    <span aria-hidden className="text-base">
                      {step.emoji}
                    </span>
                  </CardBar>
                  <CardBody>
                    <h3 className="text-xl leading-tight">{step.t}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.d}</p>
                  </CardBody>
                </Card>
              </RevealItem>
            ))}
          </RevealGroup>

          <Reveal delay={0.1}>
            <div className="mt-8 flex flex-col gap-4 border border-dashed border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <Chip tone="ink">Before you respond</Chip>
                <p className="text-sm text-ink-muted">
                  Check your directory entry says what you do now, not what you did three roles ago.
                </p>
              </div>
              <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row">
                <Button href="/directory" tone="paper" size="sm">
                  See the directory
                </Button>
                <Button href="/dashboard" tone="violet" size="sm">
                  Update my profile →
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ==================================================================
 FOR POSTERS
 ================================================================== */}
      <section className="relative overflow-hidden border-b border-line bg-violet/15 py-20 text-ink">
        <div className="absolute inset-0 mesh-dots opacity-20" aria-hidden />
        <div className="relative mx-auto grid max-w-container-max grid-cols-1 items-start gap-10 px-4 lg:grid-cols-12 lg:px-10">
          <div className="lg:col-span-7">
            <span className="mb-4 inline-block rounded-full bg-cyan/20 border border-cyan/40 px-4 py-1.5 font-mono text-xs font-bold text-cyan">
              ✦ Post An Opportunity
            </span>
            <h2 className="text-display-md text-white">Put it in front of the right room.</h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
              The people reading this board run security functions, advise on them, build the systems and sell into
              them. If you are appointing a head of security, shortlisting bidders, looking for a delivery partner or
              filling a conference panel, send us the detail and we will list it.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button href="/contact" tone="lime" size="lg">
                Send us a listing
              </Button>
              <Button href="/sponsors" tone="paper" size="lg">
                Partner with BSA
              </Button>
            </div>

            <div className="mt-8 rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel">
              <p className="mb-2 font-mono text-xs font-extrabold uppercase tracking-wider text-cyan flex items-center gap-2">
                <span>✦</span> Member Posting Privileges & Policy
              </p>
              <p className="text-sm leading-relaxed text-ink-soft">
                Listings are published free of charge for verified BSA members and partner organisations. Submissions are reviewed by the executive team within 24 hours and remain active on the board for up to 60 days.
              </p>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg overflow-hidden">
              <div className="border-b border-line pb-4 mb-4">
                <p className="text-base font-extrabold text-white">What A Listing Needs</p>
                <p className="text-xs text-ink-muted mt-1">Ensure your listing includes these core details before submitting.</p>
              </div>
              <ul className="space-y-3.5">
                {[
                  'The organisation behind it, named.',
                  'Type: role, partnership, tender, speaking or board.',
                  'Location, and whether remote or hybrid works.',
                  'Compensation, fee basis or contract value.',
                  'A closing date, or say that it is rolling.',
                  'A named contact who will read the responses.',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-3 rounded-xl border border-line bg-base p-3">
                    <span
                      aria-hidden
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan/20 border border-cyan/40 font-mono text-xs font-extrabold text-cyan"
                    >
                      ✓
                    </span>
                    <span className="text-sm font-medium leading-relaxed text-white">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
