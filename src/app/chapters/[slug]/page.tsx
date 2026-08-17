import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardBar, CardBody } from '@/components/ui/card';
import { Chip, LiveDot } from '@/components/ui/badge';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/reveal';
import { Avatar, EmptyState, SectionHead, Sticker, Stat } from '@/components/ui/misc';
import { accentClasses, accentFor, cn, formatDate, formatDay, formatMonth, relativeTime, type Accent } from '@/lib/utils';
import { JoinChapter } from './join-client';

export const revalidate = 0;

const ACCENT_KEYS: readonly string[] = ['lime', 'magenta', 'violet', 'tangerine', 'cobalt'];

function resolveAccent(stored: string, seed: string): Accent {
  return ACCENT_KEYS.includes(stored) ? (stored as Accent) : accentFor(seed);
}

const ROLE_RANK: Record<string, number> = { CHAIR: 0, COMMITTEE: 1, MEMBER: 2 };

const ROLE_LABEL: Record<string, string> = {
  CHAIR: 'Chair',
  COMMITTEE: 'Committee',
  MEMBER: 'Member',
};

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const chapter = await prisma.chapter.findUnique({
    where: { slug: params.slug },
    select: { name: true, region: true, city: true, country: true, description: true },
  });

  if (!chapter) {
    return { title: 'Chapter not found', description: 'That chapter is not listed.' };
  }

  return {
    title: `${chapter.name} · ${chapter.region}`,
    description: `${chapter.city}, ${chapter.country}. ${chapter.description}`,
  };
}

export default async function ChapterPage({ params }: { params: { slug: string } }) {
  let chapter: any = null;
  let session: any = null;
  let cityEvents: any[] = [];
  let others: any[] = [];

  try {
    const fetched = await Promise.all([
      prisma.chapter.findUnique({
        where: { slug: params.slug },
        select: {
          id: true,
          slug: true,
          name: true,
          region: true,
          city: true,
          country: true,
          description: true,
          emoji: true,
          accent: true,
          foundedYear: true,
          meetingCadence: true,
          linkedinUrl: true,
          contactEmail: true,
          isActive: true,
          memberships: {
            orderBy: { joinedAt: 'asc' },
            select: {
              id: true,
              role: true,
              userId: true,
              joinedAt: true,
              user: {
                select: {
                  profile: {
                    select: {
                      handle: true,
                      fullName: true,
                      headline: true,
                      jobTitle: true,
                      org: true,
                      field: true,
                      location: true,
                      avatarUrl: true,
                      openToMentoring: true,
                      openToSpeaking: true,
                      privacy: { select: { isPublic: true, showOrg: true } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      getSession(),
    ]);

    chapter = fetched[0];
    session = fetched[1];

    if (chapter) {
      const eventsFetched = await Promise.all([
        prisma.event.findMany({
          where: {
            status: { in: ['UPCOMING', 'LIVE'] },
            eventDate: { gte: new Date() },
            location: { contains: chapter.city },
          },
          orderBy: { eventDate: 'asc' },
          take: 3,
          select: {
            slug: true,
            title: true,
            category: true,
            eventDate: true,
            startTime: true,
            location: true,
            locationType: true,
            venueName: true,
            cpdHours: true,
            isPaid: true,
          },
        }),
        prisma.chapter.findMany({
          where: { isActive: true, slug: { not: chapter.slug } },
          orderBy: { region: 'asc' },
          take: 3,
          select: {
            slug: true,
            name: true,
            region: true,
            city: true,
            country: true,
            emoji: true,
            accent: true,
            description: true,
            meetingCadence: true,
            _count: { select: { memberships: true } },
          },
        }),
      ]);
      cityEvents = eventsFetched[0];
      others = eventsFetched[1];
    }
  } catch (err) {
    console.error('Chapter Detail DB Error on Serverless:', err);
  }

  if (!chapter) notFound();

  const accent = resolveAccent(chapter.accent, chapter.slug);
  const tint = accentClasses[accent];

  const totalMembers = chapter.memberships.length;

  /* Privacy: only members who keep a public profile appear on the roster. */
  const roster = chapter.memberships
    .filter((m: any) => m.user.profile?.privacy?.isPublic)
    .map((m: any) => ({ id: m.id, role: m.role, profile: m.user.profile! }))
    .sort((a: any, b: any) => {
      const byRole = (ROLE_RANK[a.role] ?? 9) - (ROLE_RANK[b.role] ?? 9);
      return byRole !== 0 ? byRole : a.profile.fullName.localeCompare(b.profile.fullName);
    });

  const hiddenCount = totalMembers - roster.length;
  const chairCount = chapter.memberships.filter((m: any) => m.role === 'CHAIR').length;
  const committeeCount = chapter.memberships.filter((m: any) => m.role === 'COMMITTEE').length;
  const myMembership = session ? (chapter.memberships.find((m: any) => m.userId === session.userId) ?? null) : null;

  const yearsRunning = Math.max(0, new Date().getFullYear() - chapter.foundedYear);

  return (
    <div className="overflow-x-hidden">
      {/* ==================================================================
 HEADER
 ================================================================== */}
      <section className="relative border-b border-white/10 bg-[#070A12] text-white">
        <div className="absolute inset-0 mesh-dots opacity-25" aria-hidden />

        <div className="relative mx-auto max-w-container-max px-4 py-10 lg:px-10 lg:py-16">
          <Link
            href="/chapters"
            className="inline-flex items-center gap-2 border border-white/20 bg-white/10 px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-panel transition-all hover:border-cyan/50 hover:text-cyan"
            style={{ color: '#FFFFFF' }}
          >
            ← All chapters
          </Link>

          <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Reveal direction="up">
                <div className="flex items-start gap-5">
                  <span
                    aria-hidden
                    className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-cyan/40 bg-cyan/15 text-4xl shadow-panel-lg sm:h-24 sm:w-24 sm:text-5xl"
                  >
                    {chapter.emoji && chapter.emoji !== '⬡' ? chapter.emoji : '📍'}
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-black uppercase tracking-wider text-cyan">
                      {chapter.region}
                    </p>
                    <h1 className="text-display-lg mt-2 text-white font-black" style={{ color: '#FFFFFF' }}>{chapter.name}</h1>
                    <p className="mt-3 font-mono text-xs font-bold uppercase tracking-wider text-slate-200" style={{ color: '#E2E8F0' }}>
                      📍 {chapter.city} · {chapter.country}
                    </p>
                  </div>
                </div>
              </Reveal>

              <Reveal direction="up" delay={0.08}>
                <p
                  className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-white font-medium whitespace-pre-line"
                  style={{ color: '#FFFFFF' }}
                >
                  {chapter.description}
                </p>
              </Reveal>

              <Reveal direction="up" delay={0.14}>
                <div className="mt-7 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1 font-mono text-xs font-bold text-white shadow-sm">
                    {chapter.isActive ? <span className="h-2 w-2 rounded-full bg-lime animate-pulse" /> : '⏸'}{' '}
                    {chapter.isActive ? 'Active' : 'Paused'}
                  </span>
                  <span className="inline-flex items-center rounded-lg border border-white/20 bg-white/10 px-3 py-1 font-mono text-xs font-bold text-white shadow-sm">
                    Meets {chapter.meetingCadence.toLowerCase()}
                  </span>
                  <span className="inline-flex items-center rounded-lg border border-white/20 bg-white/10 px-3 py-1 font-mono text-xs font-bold text-white shadow-sm">
                    Founded {chapter.foundedYear}
                  </span>
                  <span className="inline-flex items-center rounded-lg border border-cyan/40 bg-cyan/15 px-3 py-1 font-mono text-xs font-bold text-cyan shadow-sm">
                    {totalMembers} {totalMembers === 1 ? 'member' : 'members'}
                  </span>
                  {chairCount > 0 && (
                    <span className="inline-flex items-center rounded-lg border border-white/20 bg-white/10 px-3 py-1 font-mono text-xs font-bold text-white shadow-sm">
                      {chairCount === 1 ? '1 chair' : `${chairCount} chairs`}
                    </span>
                  )}
                  {committeeCount > 0 && (
                    <span className="inline-flex items-center rounded-lg border border-white/20 bg-white/10 px-3 py-1 font-mono text-xs font-bold text-white shadow-sm">
                      {committeeCount === 1 ? '1 committee member' : `${committeeCount} committee members`}
                    </span>
                  )}
                </div>
              </Reveal>

              {(chapter.contactEmail || chapter.linkedinUrl) && (
                <Reveal direction="up" delay={0.2}>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {chapter.contactEmail && (
                      <a
                        href={`mailto:${chapter.contactEmail}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-cyan/50 bg-cyan/20 px-4 py-2 font-mono text-xs font-bold text-cyan transition-all hover:bg-cyan hover:text-black shadow-panel"
                      >
                        ✉️ {chapter.contactEmail}
                      </a>
                    )}
                    {chapter.linkedinUrl && (
                      <a
                        href={chapter.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 font-mono text-xs font-bold text-white transition-all hover:border-cyan/50 hover:text-cyan shadow-panel"
                      >
                        LinkedIn ↗
                      </a>
                    )}
                  </div>
                </Reveal>
              )}
            </div>

            {/* Join panel */}
            <div className="lg:col-span-5">
              <Reveal direction="left" delay={0.1}>
                <div className="rounded-2xl border border-white/10 bg-[#0B0F19] shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between border-b border-white/10 bg-[#111726] px-6 py-4">
                    <span className="text-base font-extrabold text-white flex items-center gap-2">📍 Chapter Membership</span>
                    <span className="rounded-full bg-cyan/20 border border-cyan/40 px-3 py-1 font-mono text-xs font-bold text-cyan">{chapter.region}</span>
                  </div>

                  <div className="p-6">
                    <div className="mb-6 grid grid-cols-2 gap-4">
                      <Stat value={totalMembers} label="Members" tone="paper" />
                      <Stat
                        value={yearsRunning === 0 ? 'New' : `${yearsRunning}y`}
                        label={yearsRunning === 0 ? 'Opened this year' : 'Years running'}
                        tone="lime"
                      />
                    </div>

                    <JoinChapter
                      slug={chapter.slug}
                      chapterName={chapter.name}
                      region={chapter.region}
                      cadence={chapter.meetingCadence}
                      contactEmail={chapter.contactEmail}
                      isSignedIn={Boolean(session)}
                      isMember={Boolean(myMembership)}
                      role={myMembership?.role ?? null}
                      isActive={chapter.isActive}
                    />

                    {myMembership && (
                      <p className="mt-5 border-t border-white/10 pt-3 font-mono text-xs font-bold uppercase tracking-wider text-cyan">
                        You joined {formatDate(myMembership.joinedAt)}
                      </p>
                    )}
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================
  AT A GLANCE
  ================================================================== */}
      <section className="border-b border-white/10 bg-[#070A12] py-16">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              {
                emoji: '🗓️',
                title: `Meets ${chapter.meetingCadence.toLowerCase()}`,
                body: `Sessions are held in and around ${chapter.city}. Dates appear on the events page as they are confirmed.`,
                badgeTone: 'bg-cyan/20 border-cyan/40 text-cyan',
              },
              {
                emoji: '📍',
                title: `Covers ${chapter.region}`,
                body: `Members are spread across ${chapter.region}, based in and around ${chapter.city}, ${chapter.country}. Attend the chapter that matches where you work.`,
                badgeTone: 'bg-violet/20 border-violet/40 text-violet-bright',
              },
              {
                emoji: '🛡️',
                title: totalMembers === 1 ? '1 member on the register' : `${totalMembers} members on the register`,
                body:
                  chairCount > 0
                    ? 'The chair and committee are drawn from this chapter’s own membership, not from association staff.'
                    : 'This chapter currently has no chair listed. Committee roles are open to members who want one.',
                badgeTone: 'bg-magenta/20 border-magenta/40 text-magenta',
              },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 0.08}>
                <div className="rounded-2xl border border-white/10 bg-[#0B0F19] p-6 shadow-xl flex flex-col justify-between h-full hover:border-cyan/50 transition-colors">
                  <div>
                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs font-bold ${item.badgeTone}`}>
                      <span>{item.emoji}</span> Overview
                    </span>
                    <h3 className="mt-4 text-lg font-extrabold text-white leading-tight">{item.title}</h3>
                    <p className="mt-2 text-xs sm:text-sm font-medium leading-relaxed text-slate-200">{item.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================================
 UPCOMING IN THIS CITY
 ================================================================== */}
      {cityEvents.length > 0 && (
        <section className="border-b border-line bg-base py-20">
          <div className="mx-auto max-w-container-max px-4 lg:px-10">
            <SectionHead
              kicker={`In ${chapter.city}`}
              tone="tangerine"
              title="Next dates in the diary"
              blurb={`Events on the calendar taking place in ${chapter.city}. Registration is handled on the event page.`}
              action={
                <Button href="/events" tone="paper" size="sm">
                  Full programme →
                </Button>
              }
            />

            <RevealGroup className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {cityEvents.map((event) => (
                <RevealItem key={event.slug}>
                  <Link
                    href={`/events/${event.slug}`}
                    className="group flex h-full flex-col justify-between rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg transition-all hover:border-cyan/50"
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
                        <span className="rounded-full bg-cyan/20 border border-cyan/40 px-3 py-1 font-mono text-xs font-bold text-cyan">
                          {event.category.replace(/_/g, ' ')}
                        </span>
                        <span className="font-mono text-xs font-bold text-ink-soft">{relativeTime(event.eventDate)}</span>
                      </div>

                      <div className="flex items-start gap-4">
                        <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-cyan/40 bg-cyan/15 text-white">
                          <span className="font-display text-lg font-black leading-none">{formatDay(event.eventDate)}</span>
                          <span className="mt-0.5 font-mono text-[10px] font-extrabold uppercase text-cyan">
                            {formatMonth(event.eventDate)}
                          </span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-extrabold text-white leading-snug group-hover:text-cyan transition-colors">
                            {event.title}
                          </h3>
                          <p className="mt-1 font-mono text-xs font-semibold text-ink-soft">
                            {event.startTime} · {event.venueName ?? event.location}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Chip size="sm" tone="paper">
                          {event.locationType.replace(/_/g, ' ')}
                        </Chip>
                        {event.cpdHours > 0 && (
                          <Chip size="sm" tone="lime">
                            {event.cpdHours} CPD {event.cpdHours === 1 ? 'hour' : 'hours'}
                          </Chip>
                        )}
                        <Chip size="sm" tone="paper">
                          {event.isPaid ? 'Ticketed' : 'No charge'}
                        </Chip>
                      </div>
                    </div>

                    <p className="mt-5 border-t border-line pt-3 font-mono text-xs font-extrabold uppercase tracking-wider text-cyan flex items-center justify-between">
                      <span>Event details</span>
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </p>
                  </Link>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>
      )}

      {/* ==================================================================
  ROSTER
  ================================================================== */}
      <section className="border-b border-line bg-base py-20">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <SectionHead
            kicker="The register"
            tone="violet"
            title={
              <>
                Who you would <span className="text-cyan px-1 font-black">actually</span> meet
              </>
            }
            blurb={
              hiddenCount > 0
                ? `${roster.length} of ${totalMembers} members keep a public profile. The rest are on the register but not listed here.`
                : 'The chair sets the programme, the committee organise the sessions, and everyone else turns up and contributes.'
            }
            action={
              <Button href="/directory" tone="paper" size="sm">
                Full member directory →
              </Button>
            }
          />

          {roster.length === 0 ? (
            <EmptyState
              title={totalMembers > 0 ? 'Every member here is private' : 'No members on the register yet'}
              blurb={
                totalMembers > 0
                  ? 'Everyone in this chapter has set their profile to private, which is their choice. Members decide what is visible; everything else stays off the page.'
                  : `${chapter.name} has just opened. The register fills as members in ${chapter.region} join.`
              }
              action={
                session ? undefined : (
                  <Button href={`/login?redirect=/chapters/${chapter.slug}`} tone="magenta">
                    Sign in to join
                  </Button>
                )
              }
            />
          ) : (
            <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {roster.map((member: any) => {
                const isChair = member.role === 'CHAIR';
                const isCommittee = member.role === 'COMMITTEE';
                const showOrg = member.profile.privacy?.showOrg && member.profile.org;

                return (
                  <RevealItem key={member.id}>
                    <Link
                      href={`/members/${member.profile.handle}`}
                      className="group flex h-full flex-col justify-between rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg transition-all hover:border-cyan/50"
                    >
                      <div>
                        <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
                          <span className={cn('rounded-full px-3 py-1 font-mono text-xs font-bold border', isChair ? 'bg-cyan/20 border-cyan/40 text-cyan' : isCommittee ? 'bg-violet/20 border-violet/40 text-violet-bright' : 'bg-surface border-line text-ink-soft')}>
                            👑 {ROLE_LABEL[member.role] ?? member.role}
                          </span>
                          <span className="font-mono text-xs font-bold text-ink-soft truncate max-w-[120px]">{member.profile.field}</span>
                        </div>

                        <div className="flex items-center gap-4">
                          <Avatar name={member.profile.fullName} src={member.profile.avatarUrl} size="md" />
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-base font-extrabold text-white leading-tight group-hover:text-cyan transition-colors">
                              {member.profile.fullName}
                            </h3>
                            <p className="truncate font-mono text-xs font-bold text-cyan mt-0.5">
                              @{member.profile.handle}
                            </p>
                          </div>
                        </div>

                        <p className="mt-3 text-xs font-semibold leading-snug text-white">
                          {member.profile.jobTitle || member.profile.headline}
                        </p>
                        {showOrg && <p className="mt-1 text-xs font-medium leading-snug text-ink-soft">{member.profile.org}</p>}

                        <div className="mt-4 flex flex-wrap items-center gap-1.5">
                          {!isChair && !isCommittee && <Chip size="sm">{member.profile.field}</Chip>}
                          {member.profile.openToMentoring && (
                            <Chip size="sm" tone="lime">
                              Mentors
                            </Chip>
                          )}
                          {member.profile.openToSpeaking && (
                            <Chip size="sm" tone="violet">
                              Speaks
                            </Chip>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-line pt-3 font-mono text-xs font-bold uppercase tracking-wider">
                        <span className="truncate text-ink-soft">📍 {member.profile.location}</span>
                        <span className="text-cyan transition-transform group-hover:translate-x-1">
                          Profile →
                        </span>
                      </div>
                    </Link>
                  </RevealItem>
                );
              })}
            </RevealGroup>
          )}

          {hiddenCount > 0 && roster.length > 0 && (
            <Reveal delay={0.1}>
              <p className="mt-6 border border-dashed border-line bg-surface-inset/50 px-4 py-3 text-center font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                {hiddenCount} further {hiddenCount === 1 ? 'member is' : 'members are'} on this register with a private
                profile. Members control what appears here.
              </p>
            </Reveal>
          )}
        </div>
      </section>

      {/* ==================================================================
 OTHER CHAPTERS
 ================================================================== */}
      {others.length > 0 && (
        <section className="border-b border-line bg-surface py-20">
          <div className="mx-auto max-w-container-max px-4 lg:px-10">
            <SectionHead
              tone="tangerine"
              title="Chapters elsewhere"
              blurb="Chapters are organised by region. If your work takes you somewhere else regularly, look at who is already meeting there."
              action={
                <Button href="/chapters" tone="ink" size="sm">
                  All chapters →
                </Button>
              }
            />

            <RevealGroup className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {others.map((other) => {
                const otherAccent = resolveAccent(other.accent, other.slug);
                return (
                  <RevealItem key={other.slug}>
                    <Card href={`/chapters/${other.slug}`} className="group h-full">
                      <CardBar tone={otherAccent}>
                        <span className="truncate">{other.region}</span>
                        <span className="flex-shrink-0">{other._count.memberships} members</span>
                      </CardBar>
                      <CardBody className="flex h-full flex-col">
                        <div className="flex items-center gap-3">
                          <span aria-hidden className="text-2xl">
                            {other.emoji}
                          </span>
                          <h3 className="text-lg leading-tight transition-colors group-hover:text-violet-bright">
                            {other.name}
                          </h3>
                        </div>
                        <p className="mt-3 flex-1 text-xs leading-relaxed text-ink-muted">{other.description}</p>
                        <p className="mt-4 flex items-center justify-between border-t border-dashed border-line pt-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em]">
                          <span className="text-ink-muted">Meets {other.meetingCadence.toLowerCase()}</span>
                          <span className="text-violet-bright">{other.city} →</span>
                        </p>
                      </CardBody>
                    </Card>
                  </RevealItem>
                );
              })}
            </RevealGroup>
          </div>
        </section>
      )}

      {/* ==================================================================
 CTA
 ================================================================== */}
      <section className="relative overflow-hidden border-b border-line bg-surface-inset py-20 text-ink">
        <div className="absolute inset-0 mesh-grid opacity-10" aria-hidden />
        <div className="relative mx-auto max-w-container-max px-4 lg:px-10">
          <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <span className="mb-4 inline-block border border-line-bright bg-cyan/12 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink">
                Not your region?
              </span>
              <h2 className="text-display-md text-ink">{chapter.region} is covered. Yours may not be.</h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/75">
                Chapters are convened by members who want one where they work. If nothing is running near you, tell us
                the region and the cadence you could hold.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Button href="/contact?type=chapter" tone="lime" size="lg">
                Propose a chapter
              </Button>
              <Button href="/chapters" tone="paper" size="lg">
                See every region
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
