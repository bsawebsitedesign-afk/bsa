import React from 'react';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { LiveDot } from '@/components/ui/badge';
import { Marquee } from '@/components/ui/marquee';
import { Reveal } from '@/components/ui/reveal';
import { Counter } from '@/components/ui/counter';
import { Stat, Sticker } from '@/components/ui/misc';
import { TiltCard } from '@/components/ui/scroll';
import { parseList } from '@/lib/utils';
import { MEMBER_TYPES } from '@/lib/validation';
import { DirectoryClient, type DirectoryMember } from './directory-client';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Member directory',
  description:
    'Search BSA members by discipline, region, specialty and availability. Security practitioners, leaders, consultants, vendors and industry organisations who chose to be listed.',
};

/** Locations are stored as "City, Country" - the last part is the region we filter on. */
function regionOf(location: string): string {
  const parts = location
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return parts[parts.length - 1] ?? location;
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams?: { mentors?: string; type?: string; q?: string };
}) {
  let profiles: any[] = [];
  let chapterCount = 0;

  try {
    const fetched = await Promise.all([
      prisma.memberProfile.findMany({
        where: { user: { status: 'ACTIVE', role: { not: 'ADMIN' } }, privacy: { searchableInDirectory: true, isPublic: true } },
        orderBy: { fullName: 'asc' },
        // Nothing here is private: no email, no phone, no privacy-gated links.
        select: {
          userId: true,
          handle: true,
          fullName: true,
          headline: true,
          jobTitle: true,
          org: true,
          field: true,
          memberType: true,
          location: true,
          avatarUrl: true,
          yearsExperience: true,
          specialties: true,
          skills: true,
          openToOpportunities: true,
          openToMentoring: true,
          openToSpeaking: true,
          lastActiveAt: true,
          createdAt: true,
          privacy: { select: { showOrg: true } },
        },
      }),
      prisma.chapter.count({ where: { isActive: true } }),
    ]);
    profiles = fetched[0];
    chapterCount = fetched[1];
  } catch (err) {
    console.error('Directory DB Error on Serverless:', err);
  }

  const members: DirectoryMember[] = profiles.map((p) => ({
    userId: p.userId,
    handle: p.handle,
    fullName: p.fullName,
    headline: p.headline,
    jobTitle: p.jobTitle,
    org: p.privacy?.showOrg ? p.org : null,
    field: p.field,
    memberType: p.memberType,
    location: p.location,
    region: regionOf(p.location),
    avatarUrl: p.avatarUrl,
    yearsExperience: p.yearsExperience,
    specialties: parseList(p.specialties),
    skills: parseList(p.skills),
    openToOpportunities: p.openToOpportunities,
    openToMentoring: p.openToMentoring,
    openToSpeaking: p.openToSpeaking,
    lastActiveAt: p.lastActiveAt.toISOString(),
    joinedAt: p.createdAt.toISOString(),
  }));

  const fields = Array.from(new Set(members.map((m) => m.field))).sort((a, b) => a.localeCompare(b));
  const regions = Array.from(new Set(members.map((m) => m.region))).sort((a, b) => a.localeCompare(b));
  const mentors = members.filter((m) => m.openToMentoring).length;
  const speakers = members.filter((m) => m.openToSpeaking).length;
  const totalYears = members.reduce((sum, m) => sum + (m.yearsExperience ?? 0), 0);

  const initialMentorsOnly = searchParams?.mentors === '1' || searchParams?.mentors === 'true';
  const requestedType = (searchParams?.type ?? '').toUpperCase();
  const initialTypes = (MEMBER_TYPES as readonly string[]).includes(requestedType) ? [requestedType] : [];
  const initialQuery = typeof searchParams?.q === 'string' ? searchParams.q.slice(0, 80) : '';

  return (
    <div className="overflow-x-hidden">
      {/* ==================================================================
 HERO
 ================================================================== */}
      <section className="relative border-b border-line bg-base py-14 lg:py-20">
        <div className="absolute inset-0 mesh-grid" aria-hidden />
        <div className="relative mx-auto max-w-container-max px-4 lg:px-10">
          <div className="grid grid-cols-1 items-end gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Reveal direction="down">
                <div className="mb-5 inline-flex items-center gap-2 border border-line bg-surface px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] shadow-panel">
                  {members.length} members listed · {fields.length} disciplines · {regions.length} countries
                </div>
              </Reveal>

              <Reveal direction="up" delay={0.05}>
                <h1 className="relative tracking-tight font-extrabold uppercase leading-[0.88]">
                  <span className="relative inline-block text-5xl sm:text-7xl lg:text-8xl font-extrabold text-3d-pop tracking-tight">
                    VERIFIED MEMBER
                    <span className="absolute -right-6 -top-4 text-cyan text-2xl animate-pulse">✦</span>
                  </span>
                  <span className="relative block text-5xl sm:text-7xl lg:text-8xl font-accent font-bold lowercase italic text-3d-pop-cyan -mt-3 sm:-mt-6 lg:-mt-8 rotate-[-3.5deg] drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]">
                    executive directory!
                    <span className="absolute -left-6 bottom-2 text-white text-3xl animate-bounce">✦</span>
                  </span>
                </h1>
              </Reveal>

              <Reveal direction="up" delay={0.12}>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft">
                  The member directory is the reason most people join. Search by discipline, region, specialty or
                  availability, then contact the person directly.{' '}
                  <strong className="text-cyan px-0.5 font-bold">No introductions required.</strong>
                </p>
              </Reveal>

              <Reveal direction="up" delay={0.16}>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">
                  Members set what is visible on their own profile. Everything else stays private.
                </p>
              </Reveal>

              <Reveal direction="up" delay={0.2}>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button href="/directory?mentors=1" tone="violet">
                    Members available to mentor
                  </Button>
                  <Button href="/membership" tone="paper">
                    Join and get listed
                  </Button>
                </div>
              </Reveal>
            </div>

            <div className="lg:col-span-5">
              <Reveal direction="left" delay={0.15}>
                <div className="relative">
                  <Sticker tone="lime" rotate={8} className="absolute -right-2 -top-5 z-20 text-[10px]">
                    opt-in only
                  </Sticker>
                  <div className="grid grid-cols-2 gap-3">
                    <Stat value={<Counter to={members.length} />} label="Members listed" tone="magenta" />
                    <Stat value={<Counter to={fields.length} />} label="Disciplines covered" tone="paper" />
                    <Stat value={<Counter to={mentors} />} label="Available to mentor" tone="paper" />
                    <Stat value={<Counter to={totalYears} suffix=" yrs" />} label="Experience listed" tone="ink" />
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <Marquee
        tone="magenta"
        speed="fast"
        items={[
          `${fields.length} DISCIPLINES`,
          `${regions.length} COUNTRIES`,
          `${mentors} AVAILABLE TO MENTOR`,
          `${speakers} AVAILABLE TO SPEAK`,
          `${chapterCount} REGIONAL CHAPTERS`,
          'MEMBERS CONTROL WHAT IS VISIBLE',
        ]}
      />

      {/* ==================================================================
 SEARCH + RESULTS
 ================================================================== */}
      <DirectoryClient
        members={members}
        fields={fields}
        regions={regions}
        initialQuery={initialQuery}
        initialTypes={initialTypes}
        initialMentorsOnly={initialMentorsOnly}
      />

      {/* ==================================================================
 HOW TO USE IT
 ================================================================== */}
      <section className="border-b border-line bg-base py-16 text-white lg:py-20">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <Sticker tone="lime" rotate={-2} className="mb-3">
                ✦ DIRECTORY PROTOCOL
              </Sticker>
              <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white drop-shadow-md">Contact people well and they answer</h2>
              <p className="mt-4 max-w-md text-base font-semibold leading-relaxed text-white/85">
                Members opted in because they are willing to be contacted about work. The directory keeps its value when
                approaches are specific and reciprocal.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button href="/chapters" tone="magenta" className="font-extrabold shadow-panel" arrow>
                  Meet members in person
                </Button>
                <Button href="/contact" tone="ink" className="font-extrabold border border-white/20 text-white hover:border-cyan">
                  Report a listing
                </Button>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="space-y-4">
                {[
                  {
                    n: '01',
                    t: 'Lead with the specific question',
                    d: '"Twenty minutes on how you structured supplier assurance across eleven markets" gets a reply. "Can I pick your brain" does not.',
                  },
                  {
                    n: '02',
                    t: 'Read the profile first',
                    d: 'Specialties, skills and years in the industry are all on the record. Reference the part that made you get in touch.',
                  },
                  {
                    n: '03',
                    t: 'Answer when it is your turn',
                    d: 'Every member here is findable by every other member. The directory only works while people reply to it.',
                  },
                ].map((rule) => (
                  <TiltCard key={rule.n} strength={8}>
                    <div className="group flex items-start gap-4 rounded-2xl border border-white/20 bg-surface/95 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-cyan/80 hover:bg-surface-raised">
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-cyan/40 bg-cyan/10 font-mono text-sm font-black text-cyan shadow-panel">
                        {rule.n}
                      </span>
                      <div>
                        <h3 className="text-lg font-black text-white leading-tight group-hover:text-cyan transition-colors drop-shadow-sm">{rule.t}</h3>
                        <p className="mt-2 text-xs font-semibold leading-relaxed text-white/80">{rule.d}</p>
                      </div>
                    </div>
                  </TiltCard>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================
  CONVERSION
  ================================================================== */}
      <section className="relative overflow-hidden border-b border-line bg-surface/90 py-16 lg:py-20">
        <div className="absolute inset-0 mesh-dots opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-container-max px-4 lg:px-10">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <Reveal>
                <h2 className="relative tracking-tight font-extrabold uppercase leading-[0.88]">
                  <span className="relative inline-block text-3xl sm:text-5xl font-extrabold text-3d-pop">
                    BEING FINDABLE
                  </span>
                  <span className="relative block text-3xl sm:text-5xl font-accent font-bold lowercase italic text-3d-pop-cyan -mt-2 rotate-[-2deg]">
                    is half of what membership is for!
                  </span>
                </h2>
                <p className="mt-5 max-w-xl text-base font-semibold leading-relaxed text-white/85">
                  A listing puts your discipline, specialties and availability in front of {members.length} peers across{' '}
                  {regions.length} countries. You decide what appears, and you can change it at any time.
                </p>
              </Reveal>
            </div>
            <div className="lg:col-span-4">
              <Reveal direction="left" delay={0.08}>
                <div className="flex flex-col gap-3">
                  <Button href="/membership" tone="magenta" size="lg" className="font-extrabold shadow-panel" arrow>
                    Apply for membership
                  </Button>
                  <Button href="/dashboard" tone="ink" size="lg" className="font-extrabold border border-white/20 text-white hover:border-cyan">
                    Update my listing
                  </Button>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
