import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardBar, CardBody } from '@/components/ui/card';
import { PhotoFrame } from '@/components/ui/photo';
import { Chip, LiveDot } from '@/components/ui/badge';
import { Marquee } from '@/components/ui/marquee';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/reveal';
import { Counter } from '@/components/ui/counter';
import { Avatar, EmptyState, SectionHead, Sticker, Stat } from '@/components/ui/misc';
import { accentClasses, accentFor, type Accent } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Regional chapters',
  description:
    'BSA chapters are regional peer groups for working security professionals. Each one covers a defined region, meets on a published cadence, and is run by a chair drawn from the membership.',
};

const ACCENT_KEYS: readonly string[] = ['lime', 'magenta', 'violet', 'tangerine', 'cobalt'];

/** Chapters store their accent as a plain string - fall back to a hashed one. */
function resolveAccent(stored: string, seed: string): Accent {
  return ACCENT_KEYS.includes(stored) ? (stored as Accent) : accentFor(seed);
}

const WHAT_A_CHAPTER_IS = [
  {
    n: '01',
    tone: 'lime' as const,
    emoji: '',
    title: 'Peers within travelling distance',
    body: 'People doing your job, in other organisations, close enough to meet in person. Most members join the chapter covering the region they work in, not the one they live nearest.',
  },
  {
    n: '02',
    tone: 'magenta' as const,
    emoji: '',
    title: 'A published cadence',
    body: 'Every chapter states how often it meets. You can put it in the diary a year out and plan around it, rather than waiting for an invitation that may not come.',
  },
  {
    n: '03',
    tone: 'violet' as const,
    emoji: '',
    title: 'Regional problems, regional answers',
    body: 'Regulation, policing relationships, supplier quality and the local labour market all differ by region. A national answer is often the wrong one.',
  },
  {
    n: '04',
    tone: 'tangerine' as const,
    emoji: '',
    title: 'A way into the wider association',
    body: 'Chapters feed the events programme, the committees and the member directory. Turning up locally is the shortest route to the rest of it.',
  },
];

const CHAPTER_ROLES = [
  { role: 'Chair', emoji: '👑', body: 'Runs the chapter, sets the programme and represents it to the association.' },
  { role: 'Committee', emoji: '🤝', body: 'A small group who organise sessions, host meetings and bring in speakers.' },
  { role: 'Member', emoji: '🛡️', body: 'Everyone else. Attend what is useful, skip what is not, no obligation to hold office.' },
];

export default async function ChaptersPage() {
  let chapters: any[] = [];
  let chairs: any[] = [];
  let totalMembers = 0;

  try {
    const fetched = await Promise.all([
      prisma.chapter.findMany({
        where: { isActive: true },
        orderBy: [{ region: 'asc' }, { city: 'asc' }],
        select: {
          slug: true,
          name: true,
          region: true,
          city: true,
          country: true,
          description: true,
          imageUrl: true,
          emoji: true,
          accent: true,
          foundedYear: true,
          meetingCadence: true,
          _count: { select: { memberships: true } },
        },
      }),
      prisma.chapterMembership.findMany({
        where: {
          role: 'CHAIR',
          chapter: { isActive: true },
          user: { profile: { privacy: { isPublic: true } } },
        },
        orderBy: { joinedAt: 'asc' },
        take: 8,
        select: {
          id: true,
          chapter: { select: { emoji: true, region: true } },
          user: {
            select: {
              profile: {
                select: { handle: true, fullName: true, avatarUrl: true, jobTitle: true, org: true },
              },
            },
          },
        },
      }),
      prisma.chapterMembership.count({ where: { chapter: { isActive: true } } }),
    ]);
    chapters = fetched[0];
    chairs = fetched[1];
    totalMembers = fetched[2];
  } catch (err) {
    console.error('Chapters DB Error on Serverless:', err);
  }

  const regions = Array.from(new Set(chapters.map((c) => c.region))).sort((a, b) => a.localeCompare(b));
  const countries = Array.from(new Set(chapters.map((c) => c.country)));

  /** First chapter in each region - the region index chips scroll to these. */
  const regionIndex = regions.map((region) => {
    const inRegion = chapters.filter((c) => c.region === region);
    return { region, count: inRegion.length, anchor: inRegion[0].slug };
  });

  const cadenceBoard = chapters.slice(0, 6);
  const cadenceOverflow = chapters.length - cadenceBoard.length;

  return (
    <div className="overflow-x-hidden">
      {/* ==================================================================
 HERO
 ================================================================== */}
      <section className="relative border-b border-line bg-base">
        <div className="absolute inset-0 mesh-grid" aria-hidden />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-10 hidden h-64 w-64 border border-line bg-violet/12 lg:block "
        />

        <div className="relative mx-auto grid max-w-container-max grid-cols-1 items-center gap-12 px-4 py-16 lg:grid-cols-12 lg:px-10 lg:py-24">
          <div className="lg:col-span-7">
            <Reveal direction="down">
              <div className="mb-6 inline-flex flex-wrap items-center gap-2 border border-line bg-surface px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] shadow-panel">
                {chapters.length} active {chapters.length === 1 ? 'chapter' : 'chapters'} · {regions.length}{' '}
                {regions.length === 1 ? 'region' : 'regions'} · {totalMembers} members
              </div>
            </Reveal>

            <Reveal direction="up" delay={0.05}>
              <h1 className="relative tracking-tight font-extrabold uppercase leading-[0.88]">
                <span className="relative inline-block text-5xl sm:text-7xl lg:text-8xl font-extrabold text-3d-pop tracking-tight">
                  A LOCAL PEER GROUP
                  <span className="absolute -right-6 -top-4 text-cyan text-2xl animate-pulse">✦</span>
                </span>
                <span className="relative block text-5xl sm:text-7xl lg:text-8xl font-accent font-bold lowercase italic text-3d-pop-cyan -mt-3 sm:-mt-6 lg:-mt-8 rotate-[-3.5deg] drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]">
                  in your region!
                  <span className="absolute -left-6 bottom-2 text-white text-3xl animate-bounce">✦</span>
                </span>
              </h1>
            </Reveal>

            <Reveal direction="up" delay={0.12}>
              <p className="mt-7 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
                A chapter is a standing group of security professionals covering one region, meeting on a stated
                cadence. Different organisations, comparable problems, close enough to meet in person.{' '}
                <strong className="text-cyan px-0.5 font-bold">
                  You bring a live problem, someone in the room has already handled it.
                </strong>
              </p>
            </Reveal>

            <Reveal direction="up" delay={0.18}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button href="#chapter-list" tone="violet" size="lg">
                  Find your chapter
                </Button>
                <Button href="/contact?type=chapter" tone="paper" size="lg">
                  Start one in your region
                </Button>
              </div>
            </Reveal>

            <Reveal direction="up" delay={0.24}>
              <div className="mt-10 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat value={<Counter to={chapters.length} />} label="Chapters" tone="lime" />
                <Stat value={<Counter to={regions.length} />} label="Regions" tone="paper" />
                <Stat value={<Counter to={countries.length} />} label="Countries" tone="paper" />
                <Stat value={<Counter to={totalMembers} />} label="Members" tone="paper" />
              </div>
            </Reveal>
          </div>

          {/* Live register: who meets where, and how often */}
          <div className="lg:col-span-5">
            <Reveal direction="left" delay={0.15}>
              <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md shadow-panel-lg overflow-hidden">
                <div className="flex items-center justify-between border-b border-line bg-surface-inset/80 px-6 py-4">
                  <span className="text-base font-extrabold text-white flex items-center gap-2">📍 Chapter Register</span>
                  <span className="rounded-full bg-cyan/20 border border-cyan/40 px-3 py-1 font-mono text-xs font-bold text-cyan">
                    ✦ Live
                  </span>
                </div>

                <div className="p-6">
                  {cadenceBoard.length === 0 ? (
                    <p className="py-4 text-xs leading-relaxed text-ink-muted">
                      No chapters are active at the moment. The register fills as regions come online.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {cadenceBoard.map((chapter) => (
                        <li key={chapter.slug} className="flex items-center justify-between gap-4 rounded-xl border border-line bg-base p-4 transition-colors hover:border-cyan/40">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan/15 border border-cyan/30 text-lg">
                              {chapter.emoji && chapter.emoji !== '⬡' ? chapter.emoji : '📍'}
                            </span>
                            <div className="min-w-0">
                              <span className="block truncate text-sm font-extrabold text-white leading-tight">
                                {chapter.region}
                              </span>
                              <span className="block truncate text-xs font-medium text-ink-soft mt-0.5">
                                {chapter.city}
                              </span>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full bg-violet/20 border border-violet/40 px-3 py-1 font-mono text-xs font-bold text-violet-bright">
                            {chapter.meetingCadence}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="border-t border-line bg-surface-inset/80 px-6 py-4">
                  <p className="font-mono text-xs font-extrabold uppercase tracking-wider text-cyan flex items-center gap-2">
                    <span>🗓️</span>
                    {cadenceOverflow > 0
                      ? `+ ${cadenceOverflow} More ${cadenceOverflow === 1 ? 'Region' : 'Regions'} Listed Below`
                      : 'Meeting Dates Are Published On The Events Page'}
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <Marquee
        tone="ink"
        speed="slow"
        items={
          chapters.length
            ? chapters.map((c) => `${c.emoji} ${c.region.toUpperCase()}`)
            : ['YOUR REGION', 'YOUR CITY', 'YOUR PEERS']
        }
      />

      {/* ==================================================================
 WHAT A CHAPTER IS
 ================================================================== */}
      <section className="border-b border-line bg-surface py-20">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <SectionHead
            kicker="What you are joining"
            title={
              <>
                Not a mailing list. A <span className="text-gradient">room</span>
              </>
            }
            blurb="Chapters exist because the useful part of an association is proximity. Four things a chapter gives a working professional that a national body cannot."
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-8">
              {WHAT_A_CHAPTER_IS.map((item, i) => (
                <RevealItem key={item.n}>
                  <Card className="h-full" tilt={(i % 2 === 0 ? 1 : 2) as 1 | 2} interactive>
                    <CardBar tone={item.tone}>
                      <span>{item.n}</span>
                      <span aria-hidden className="text-base">
                        {item.emoji}
                      </span>
                    </CardBar>
                    <CardBody>
                      <h3 className="text-xl leading-tight">{item.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.body}</p>
                    </CardBody>
                  </Card>
                </RevealItem>
              ))}
            </RevealGroup>

            <Reveal direction="right" delay={0.1} className="lg:col-span-4">
              <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg space-y-5">
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <span className="text-base font-extrabold text-white flex items-center gap-2">⚙️ How A Chapter Is Run</span>
                  <span className="rounded-full bg-cyan/20 border border-cyan/40 px-3 py-1 font-mono text-xs font-bold text-cyan">Roles</span>
                </div>

                <div className="space-y-3">
                  {CHAPTER_ROLES.map((entry) => (
                    <div
                      key={entry.role}
                      className="rounded-xl border border-line bg-base p-4 transition-colors hover:border-cyan/40"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{entry.emoji}</span>
                        <span className="text-xs font-extrabold text-white uppercase tracking-wider">
                          {entry.role}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-medium leading-relaxed text-ink-soft">{entry.body}</p>
                    </div>
                  ))}
                </div>

                <p className="border-t border-line pt-4 text-xs font-medium leading-relaxed text-ink-muted">
                  Chapter roles are held by members, not by association staff. Joining a chapter carries no obligation
                  to take one on.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ==================================================================
 THE CHAPTERS
 ================================================================== */}
      <section id="chapter-list" className="scroll-mt-24 border-b border-line bg-base py-20">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <SectionHead
            tone="violet"
            title={
              <>
                Chapters <span className="text-cyan px-1">already meeting</span>
              </>
            }
            blurb="Each chapter covers a defined region, meets in a stated city, and publishes its own cadence. Pick the one that matches where you work."
            action={
              <Button href="/contact?type=chapter" tone="ink">
                Add your region →
              </Button>
            }
          />

          {chapters.length === 0 ? (
            <EmptyState
              title="No chapters are active right now"
              blurb="Nothing is running at the moment. If you would take on a region, this is the point at which it is easiest to shape one."
              action={
                <Button href="/contact?type=chapter" tone="magenta">
                  Register your interest
                </Button>
              }
            />
          ) : (
            <>
              {/* Region index */}
              <Reveal>
                <div className="mb-8 flex items-stretch gap-0 overflow-x-auto border border-line bg-surface shadow-panel no-scrollbar">
                  <span className="flex flex-shrink-0 items-center border-r border-line bg-surface-inset px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink">
                    {regions.length} {regions.length === 1 ? 'region' : 'regions'}
                  </span>
                  {regionIndex.map((entry) => (
                    <a
                      key={entry.region}
                      href={`#chapter-${entry.anchor}`}
                      className="flex flex-shrink-0 items-center gap-2 border-r border-dashed border-line px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition-colors last:border-r-0 hover:bg-cyan/12"
                    >
                      {entry.region}
                      {entry.count > 1 && (
                        <span className="border border-line bg-surface-inset px-1 text-[9px]">{entry.count}</span>
                      )}
                    </a>
                  ))}
                </div>
              </Reveal>

              <RevealGroup className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {chapters.map((chapter) => {
                  const accent = resolveAccent(chapter.accent, chapter.slug);
                  const members = chapter._count.memberships;

                  return (
                    <RevealItem key={chapter.slug}>
                      <div id={`chapter-${chapter.slug}`} className="h-full scroll-mt-28">
                        <Card href={`/chapters/${chapter.slug}`} className="group h-full overflow-hidden">
                          <PhotoFrame
                            src={chapter.imageUrl}
                            alt=""
                            seed={`${chapter.city}-${chapter.slug}`}
                            ratio="wide"
                            className="rounded-none border-0 border-b border-line"
                          >
                            <span className="glass-chip absolute bottom-3 left-4 rounded px-2 py-1 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink">
                              {chapter.city}
                            </span>
                          </PhotoFrame>
                          <CardBar tone={accent}>
                            <span className="truncate">{chapter.region}</span>
                            <span className="flex-shrink-0">Est. {chapter.foundedYear}</span>
                          </CardBar>
                          <CardBody className="flex h-full flex-col">
                            <div className="flex items-start gap-4">
                              <span
                                aria-hidden
                                className={`flex h-14 w-14 flex-shrink-0 items-center justify-center border border-line text-2xl shadow-panel ${accentClasses[accent].bg}`}
                              >
                                {chapter.emoji}
                              </span>
                              <div className="min-w-0 flex-1">
                                <h3 className="text-xl leading-tight transition-colors group-hover:text-violet-bright">
                                  {chapter.name}
                                </h3>
                                <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300">
                                  {chapter.city} · {chapter.country}
                                </p>
                              </div>
                            </div>

                            <p className="mt-4 flex-1 text-xs leading-relaxed text-slate-200 font-normal">{chapter.description}</p>

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              <Chip size="sm" tone="paper">
                                Meets {chapter.meetingCadence.toLowerCase()}
                              </Chip>
                              <Chip size="sm" tone="paper">
                                {members} {members === 1 ? 'member' : 'members'}
                              </Chip>
                            </div>

                            <div className="mt-4 flex items-center justify-between border-t border-dashed border-line pt-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em]">
                              <span className="text-ink-muted">{chapter.region}</span>
                              <span className="text-violet-bright transition-transform group-hover:translate-x-1">
                                View chapter →
                              </span>
                            </div>
                          </CardBody>
                        </Card>
                      </div>
                    </RevealItem>
                  );
                })}

                {/* Start-a-chapter card - deliberately unfinished-looking */}
                <RevealItem>
                  <Link
                    href="/contact?type=chapter"
                    className="group flex h-full min-h-[19rem] flex-col justify-between border border-dashed border-line bg-surface-inset/40 p-6 transition-all hover:-translate-y-1 hover:bg-cyan/10 hover:shadow-panel-lg"
                  >
                    <div>
                      <span
                        aria-hidden
                        className="flex h-14 w-14 items-center justify-center border border-dashed border-line bg-surface font-display text-2xl transition-transform group-hover:rotate-12"
                      >
                        +
                      </span>
                      <h3 className="mt-4 text-xl leading-tight">Your region is not listed</h3>
                      <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                        Chapters open where there are members willing to convene one. Tell us the region you would
                        cover, roughly how many professionals you already know locally, and the cadence you could
                        sustain.
                      </p>
                    </div>

                    <div className="mt-6">
                      <div className="mb-4 space-y-1.5 border-t border-dashed border-line pt-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                        <p>Region and city</p>
                        <p>Cadence you can hold</p>
                        <p>Who else is interested</p>
                      </div>
                      <span className="inline-flex items-center gap-2 border border-line bg-grad-brand-soft px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink shadow-panel transition-transform group-hover:translate-x-1">
                        Start a chapter →
                      </span>
                    </div>
                  </Link>
                </RevealItem>
              </RevealGroup>
            </>
          )}
        </div>
      </section>

      {/* ==================================================================
 CHAIRS
 ================================================================== */}
      {chairs.length > 0 && (
        <section className="border-b border-line bg-violet/15 py-20 text-ink">
          <div className="mx-auto max-w-container-max px-4 lg:px-10">
            <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <span className="mb-3 inline-block border border-line bg-cyan/12 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink shadow-panel">
                  Who chairs them
                </span>
                <h2 className="text-display-md text-ink">Practitioners, not staff</h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/75">
                  Each chapter has a chair drawn from its own membership. They set the regional programme, and their
                  public profile is the fastest way to work out whether the room is relevant to you.
                </p>
              </div>
              <Button href="/directory" tone="lime">
                Browse the directory →
              </Button>
            </div>

            <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {chairs.map((chair) => {
                const profile = chair.user.profile;
                if (!profile) return null;

                return (
                  <RevealItem key={chair.id}>
                    <Link
                      href={`/members/${profile.handle}`}
                      className="flex h-full flex-col gap-3 border border-line bg-surface p-4 text-ink shadow-panel panel-hover"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={profile.fullName} src={profile.avatarUrl} size="md" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold leading-tight">{profile.fullName}</p>
                          <p className="truncate font-mono text-[11px] font-bold text-ink-muted">@{profile.handle}</p>
                        </div>
                      </div>
                      <Chip tone="magenta" size="sm" className="self-start">
                        Chair
                      </Chip>
                      <p className="line-clamp-2 text-xs leading-relaxed text-ink-muted">
                        {profile.jobTitle || profile.headline}
                        {profile.org ? ` · ${profile.org}` : ''}
                      </p>
                      <p className="mt-auto border-t border-dashed border-line pt-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em]">
                        {chair.chapter.emoji} {chair.chapter.region}
                      </p>
                    </Link>
                  </RevealItem>
                );
              })}
            </RevealGroup>
          </div>
        </section>
      )}

      {/* ==================================================================
 STARTING ONE
 ================================================================== */}
      <section className="border-b border-line bg-surface py-20">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <SectionHead
            tone="tangerine"
            title="If your region is missing, propose it"
            blurb="Chapters are convened by members who want one where they work. Send the detail below and it reaches the people who decide."
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Reveal direction="up">
              <div className="border border-dashed border-line bg-amber/10 p-5">
                <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink-muted">
                  Placeholder · client content required
                </p>
                <p className="text-sm leading-relaxed text-ink-soft">
                  The formal criteria for opening a chapter, the approval process and timeline, and what the association
                  provides to a new chapter (budget, venue support, speaker access, governance documents). Supply the
                  current wording and this block becomes the real answer.
                </p>
              </div>
            </Reveal>

            <Reveal direction="up" delay={0.08}>
              <div className="flex h-full flex-col justify-between rounded-2xl border border-white/20 bg-surface/95 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-white drop-shadow-sm">What to put in the enquiry</h3>
                  <ul className="mt-4 space-y-3">
                    {[
                      'The region and the city you would meet in.',
                      'How many security professionals you already know locally.',
                      'The cadence you could realistically hold for a year.',
                      'Whether you have access to a venue, or need one found.',
                    ].map((line) => (
                      <li key={line} className="flex items-center gap-3 text-xs font-semibold leading-relaxed text-white/90">
                        <span aria-hidden className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border border-cyan/40 bg-cyan/10 font-mono text-[10px] font-black text-cyan">
                          ✦
                        </span>
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button href="/contact?type=chapter" tone="magenta" className="font-extrabold shadow-panel" arrow>
                    Propose a chapter
                  </Button>
                  <Button href="/membership" tone="ink" className="font-extrabold border border-white/20 text-white hover:border-cyan">
                    Membership first
                  </Button>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ==================================================================
  CTA
  ================================================================== */}
      <section className="relative overflow-hidden border-b border-line bg-base py-20 text-white">
        <div className="absolute inset-0 mesh-dots opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-container-max px-4 text-center lg:px-10">
          <Reveal>
            <Sticker tone="lime" rotate={-4} className="mb-6">
              ✦ ATTEND ONE FIRST
            </Sticker>
            <h2 className="relative tracking-tight font-extrabold uppercase leading-[0.88]">
              <span className="relative inline-block text-3xl sm:text-5xl lg:text-6xl font-extrabold text-3d-pop tracking-tight">
                THE PEOPLE YOU NEED
              </span>
              <span className="relative block text-3xl sm:text-5xl lg:text-6xl font-accent font-bold lowercase italic text-3d-pop-cyan -mt-2 sm:-mt-4 rotate-[-2deg]">
                are already local!
              </span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-base font-semibold leading-relaxed text-white/85 sm:text-lg">
              Join the chapter covering the region you work in, or look at what it has coming up before you decide.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button href="#chapter-list" tone="magenta" size="lg" className="font-extrabold shadow-panel" arrow>
                See the chapters
              </Button>
              <Button href="/events" tone="ink" size="lg" className="font-extrabold border border-white/20 text-white hover:border-cyan">
                Upcoming sessions
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
