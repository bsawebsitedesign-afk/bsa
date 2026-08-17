import React from 'react';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardBar, CardBody } from '@/components/ui/card';
import { PhotoFrame } from '@/components/ui/photo';
import { Chip, LiveDot, type ChipTone } from '@/components/ui/badge';
import { Marquee } from '@/components/ui/marquee';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/reveal';
import { Counter } from '@/components/ui/counter';
import { EmptyState, ProgressMeter, SectionHead, Sticker, Stat } from '@/components/ui/misc';
import { TiltCard } from '@/components/ui/scroll';
import { accentFor, percent, type Accent } from '@/lib/utils';

/* Reads the session cookie, so this page is rendered per request. */
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Resources',
  description:
    'Practical written guidance from BSA members on building a security function, convergence, third-party risk and reporting to a board. No vendor content.',
};

const ACCENT_KEYS: readonly string[] = ['lime', 'magenta', 'violet', 'tangerine', 'cobalt'];

function resolveAccent(stored: string, seed: string): Accent {
  return ACCENT_KEYS.includes(stored) ? (stored as Accent) : accentFor(seed);
}

/** Tailwind cannot build class names at runtime, so the tints are mapped. */
const ACCENT_WASH: Record<Accent, string> = {
  lime: 'bg-cyan/10',
  magenta: 'bg-rose/10',
  violet: 'bg-violet/12',
  tangerine: 'bg-amber/10',
  cobalt: 'bg-violet-deep/15',
};

/** ProgressMeter has no cobalt tone - it falls back to the nearest one. */
const METER_TONE: Record<Accent, 'lime' | 'magenta' | 'violet' | 'tangerine'> = {
  lime: 'lime',
  magenta: 'magenta',
  violet: 'violet',
  tangerine: 'tangerine',
  cobalt: 'violet',
};

const LEVEL_TONE: Record<string, ChipTone> = {
  FOUNDATION: 'lime',
  PRACTITIONER: 'cobalt',
  EXECUTIVE: 'magenta',
};

const LEVEL_BLURB: Record<string, string> = {
  FOUNDATION: 'Assumes no prior grounding in the topic.',
  PRACTITIONER: 'For people doing the work day to day.',
  EXECUTIVE: 'For people accountable for the function.',
};

export default async function ResourcesPage() {
  const session = await getSession();

  const resources = await prisma.resource.findMany({
    where: { isPublished: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      description: true,
      imageUrl: true,
      level: true,
      accent: true,
      emoji: true,
      estHours: true,
      modules: { select: { minutes: true } },
    },
  });

  /* How many modules of each resource this member has already read. */
  const doneByResource = new Map<string, number>();
  if (session) {
    const rows = await prisma.resourceProgress.findMany({
      where: { userId: session.userId },
      select: { module: { select: { resourceId: true } } },
    });
    for (const row of rows) {
      const id = row.module.resourceId;
      doneByResource.set(id, (doneByResource.get(id) ?? 0) + 1);
    }
  }

  const totalModules = resources.reduce((sum, r) => sum + r.modules.length, 0);
  const totalMinutes = resources.reduce((sum, r) => sum + r.modules.reduce((m, mod) => m + mod.minutes, 0), 0);
  const totalDone = Array.from(doneByResource.values()).reduce((a, b) => a + b, 0);

  const levelsPresent = Array.from(new Set(resources.map((r) => r.level)));

  return (
    <div className="overflow-x-hidden">
      {/* ==================================================================
 HERO
 ================================================================== */}
      <section className="relative border-b border-line bg-base">
        <div className="absolute inset-0 mesh-grid" aria-hidden />

        <div className="relative mx-auto grid max-w-container-max grid-cols-1 items-end gap-12 px-4 py-16 lg:grid-cols-12 lg:px-10 lg:py-24">
          <div className="lg:col-span-7">
            <Reveal direction="down">
              <div className="mb-6 inline-flex items-center gap-2 border border-line bg-surface px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] shadow-panel">
                Written by members · no vendor content
              </div>
            </Reveal>

            <Reveal direction="up" delay={0.05}>
              <h1 className="relative tracking-tight font-extrabold uppercase leading-[0.88]">
                <span className="relative inline-block text-5xl sm:text-7xl lg:text-8xl font-extrabold text-3d-pop tracking-tight">
                  WHAT GOOD
                  <span className="absolute -right-6 -top-4 text-cyan text-2xl animate-pulse">✦</span>
                </span>
                <span className="relative block text-5xl sm:text-7xl lg:text-8xl font-accent font-bold lowercase italic text-3d-pop-cyan -mt-3 sm:-mt-6 lg:-mt-8 rotate-[-3.5deg] drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]">
                  practice looks like!
                  <span className="absolute -left-6 bottom-2 text-white text-3xl animate-bounce">✦</span>
                </span>
              </h1>
            </Reveal>

            <Reveal direction="up" delay={0.12}>
              <p className="mt-7 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
                Guidance on the parts of the job that are hard to look up: the first ninety days in a new function,
                convergence that survives contact with the organisation, supplier assessment that tells you something,
                twenty minutes in front of a board. Each resource is a short sequence of modules, written by people who
                have done it.
              </p>
            </Reveal>

            <Reveal direction="up" delay={0.18}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                {resources[0] && (
                  <Button href={`/resources/${resources[0].slug}`} tone="magenta" size="lg">
                    Start reading
                  </Button>
                )}
                <Button href={session ? '/dashboard' : '/register'} tone="paper" size="lg">
                  {session ? 'Your reading progress' : 'Create an account'}
                </Button>
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-5">
            <Reveal direction="left" delay={0.14}>
              <div className="relative">
                <Sticker tone="tangerine" rotate={-8} className="absolute -left-3 -top-5 z-20 text-[10px]">
                  free to members
                </Sticker>

                <div className="border border-line bg-surface shadow-panel-lg">
                  <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-inset px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink">
                    <span>The library</span>
                    <span className="text-cyan">Updated by members</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 p-5">
                    <Stat value={<Counter to={resources.length} />} label="Resources" tone="lime" />
                    <Stat value={<Counter to={totalModules} />} label="Modules" tone="paper" />
                    <Stat
                      value={<Counter to={Math.round(totalMinutes / 60)} suffix="h" />}
                      label="Reading"
                      tone="paper"
                    />
                  </div>

                  <div className="border-t border-dashed border-line p-5">
                    {session ? (
                      <ProgressMeter done={totalDone} total={totalModules} label="Modules you have read" tone="lime" />
                    ) : (
                      <p className="text-sm leading-relaxed text-ink-muted">
                        Everything here is readable without an account. Sign in and the site keeps track of which
                        modules you have finished, so you can put a resource down and pick it up later.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {resources.length > 0 && (
        <Marquee tone="ink" items={resources.map((r) => `${r.emoji}  ${r.title.toUpperCase()}`)} speed="slow" />
      )}

      {/* ==================================================================
 WHAT THESE ARE
 ================================================================== */}
      <section className="border-b border-line bg-surface py-20">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <SectionHead
            kicker="What these are"
            tone="violet"
            title={
              <>
                Practitioner writing, <span className="text-cyan px-1">not marketing</span>
              </>
            }
            blurb="Three things worth knowing before you start."
          />

          <RevealGroup className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              {
                emoji: '',
                title: 'Written from the inside',
                body: 'Each resource comes from members who have run the work in a real organisation, including the parts that did not go well. Where the honest answer is "it depends", it says so.',
                tone: 'lime' as const,
              },
              {
                emoji: '',
                title: 'Nothing is sponsored',
                body: 'No product is recommended and no supplier has paid for a mention. Partners support BSA through sponsorship of events and the association, never through this library.',
                tone: 'magenta' as const,
              },
              {
                emoji: '',
                title: 'Progress is a record of study',
                body: 'Mark a module once you have read it. That is all it does - it remembers your place. Nothing is scored, ranked or shown to anyone else.',
                tone: 'violet' as const,
              },
            ].map((item, i) => (
              <RevealItem key={item.title}>
                <Card className="h-full" tilt={(i % 2 === 0 ? 1 : 2) as 1 | 2}>
                  <CardBar tone={item.tone}>
                    <span>0{i + 1}</span>
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
        </div>
      </section>

      {/* ==================================================================
 THE LIBRARY
 ================================================================== */}
      <section className="border-b border-line bg-base py-20">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <SectionHead
            title={
              <>
                {resources.length} resources, <span className="text-gradient">in order</span>
              </>
            }
            blurb="Modules run in sequence and build on each other, but they stand alone well enough to read one on its own."
            action={
              <Button href="/events" tone="paper" size="sm">
                Prefer it live? Events →
              </Button>
            }
          />

          {levelsPresent.length > 1 && (
            <Reveal>
              <div className="mb-8 flex flex-wrap gap-3">
                {levelsPresent.map((lvl) => (
                  <div
                    key={lvl}
                    className="flex items-center gap-2 border border-line bg-surface px-3 py-2 shadow-panel"
                  >
                    <Chip tone={LEVEL_TONE[lvl] ?? 'paper'} size="sm">
                      {lvl}
                    </Chip>
                    <span className="text-xs text-ink-muted">
                      {LEVEL_BLURB[lvl] ?? 'Written for practising members.'}
                    </span>
                  </div>
                ))}
              </div>
            </Reveal>
          )}

          {resources.length === 0 ? (
            <EmptyState
              title="The library is being written"
              blurb="Members are drafting the first resources now. In the meantime, the events programme covers a lot of the same ground in person."
              action={
                <Button href="/events" tone="lime">
                  See what is on →
                </Button>
              }
            />
          ) : (
            <RevealGroup className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {resources.map((resource) => {
                const accent = resolveAccent(resource.accent, resource.slug);
                const moduleCount = resource.modules.length;
                const minutes = resource.modules.reduce((sum, m) => sum + m.minutes, 0);
                const done = doneByResource.get(resource.id) ?? 0;
                const pct = percent(done, moduleCount);

                return (
                  <RevealItem key={resource.id}>
                    <Card href={`/resources/${resource.slug}`} className="group h-full overflow-hidden">
                      <PhotoFrame
                        src={resource.imageUrl}
                        alt=""
                        seed={resource.slug}
                        ratio="wide"
                        className="rounded-none border-0 border-b border-line"
                      />
                      <CardBar tone={accent}>
                        <span>{resource.level}</span>
                        <span>
                          {moduleCount} {moduleCount === 1 ? 'module' : 'modules'}
                        </span>
                      </CardBar>

                      <CardBody className="flex h-full flex-col">
                        <div className="flex items-start gap-4">
                          <span
                            aria-hidden
                            className={`flex h-16 w-16 flex-shrink-0 items-center justify-center border border-line text-3xl shadow-panel transition-transform group-hover:-rotate-6 ${ACCENT_WASH[accent]}`}
                          >
                            {resource.emoji}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-xl leading-tight transition-colors group-hover:text-violet-bright sm:text-2xl">
                              {resource.title}
                            </h3>
                            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{resource.summary}</p>
                          </div>
                        </div>

                        <p className="mt-4 flex-1 text-xs leading-relaxed text-ink-muted">{resource.description}</p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Chip tone={LEVEL_TONE[resource.level] ?? 'paper'} size="sm">
                            {resource.level}
                          </Chip>
                          <Chip size="sm">
                            {moduleCount} {moduleCount === 1 ? 'module' : 'modules'}
                          </Chip>
                          <Chip size="sm">~{resource.estHours}h</Chip>
                          <Chip size="sm">{minutes} min reading</Chip>
                        </div>

                        <div className="mt-5 border-t border-dashed border-line pt-4">
                          {session ? (
                            <>
                              <ProgressMeter
                                done={done}
                                total={moduleCount}
                                label={done >= moduleCount && moduleCount > 0 ? 'Complete' : 'Modules read'}
                                tone={METER_TONE[accent]}
                              />
                              <p className="mt-2.5 flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-[0.14em]">
                                <span className="text-ink-muted">
                                  {done === 0
                                    ? 'Not started'
                                    : done >= moduleCount
                                      ? 'All modules read'
                                      : `${pct}% through`}
                                </span>
                                <span className="text-violet-bright transition-transform group-hover:translate-x-1">
                                  {done === 0 ? 'Open resource →' : done >= moduleCount ? 'Read again →' : 'Resume →'}
                                </span>
                              </p>
                            </>
                          ) : (
                            <p className="flex items-center justify-between gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em]">
                              <span className="text-ink-muted">Readable without an account</span>
                              <span className="text-violet-bright transition-transform group-hover:translate-x-1">
                                Open resource →
                              </span>
                            </p>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  </RevealItem>
                );
              })}
            </RevealGroup>
          )}
        </div>
      </section>

      {/* ==================================================================
  CONTRIBUTE
  ================================================================== */}
      <section className="border-b border-line bg-base py-20 text-white">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Reveal>
                <Sticker tone="lime" rotate={-2} className="mb-4">
                  ✦ WRITE ONE
                </Sticker>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white drop-shadow-md">
                  You have solved something other members are still stuck on.
                </h2>
                <p className="mt-5 max-w-xl text-base font-semibold leading-relaxed text-white/85 sm:text-lg">
                  Every resource here started as one person writing down how they handled a problem. If you have run a
                  convergence programme, rebuilt a supplier assurance process or survived your first board paper, that
                  is a resource. Send us an outline and we will help you shape it.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button href="/contact" tone="magenta" size="lg" className="font-extrabold shadow-panel" arrow>
                    Propose a resource
                  </Button>
                  <Button href="/directory" tone="ink" size="lg" className="font-extrabold border border-white/20 text-white hover:border-cyan">
                    Find someone who has done it
                  </Button>
                </div>
              </Reveal>
            </div>

            <div className="lg:col-span-5">
              <Reveal direction="left" delay={0.1}>
                <TiltCard strength={10}>
                  <div className="rounded-2xl border border-white/20 bg-surface/95 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-cyan/80">
                    <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-cyan">
                      What a resource looks like
                    </p>
                    <ul className="mt-5 space-y-4">
                      {[
                        { n: '01', text: 'Four to six modules, 25 to 40 minutes of reading each.' },
                        { n: '02', text: 'Written in sequence, so someone can follow it from nothing.' },
                        { n: '03', text: 'Specific about what failed, not only what worked.' },
                        { n: '04', text: 'No product names, no supplier recommendations.' },
                      ].map((item) => (
                        <li key={item.n} className="flex items-center gap-3.5">
                          <span aria-hidden className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-cyan/40 bg-cyan/10 font-mono text-xs font-black text-cyan shadow-panel">
                            {item.n}
                          </span>
                          <span className="text-xs font-semibold text-white/90 leading-relaxed">{item.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </TiltCard>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================
  CTA
  ================================================================== */}
      <section className="relative overflow-hidden border-b border-line bg-surface/90 py-20">
        <div className="absolute inset-0 mesh-dots opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-container-max px-4 text-center lg:px-10">
          <Reveal>
            <h2 className="relative tracking-tight font-extrabold uppercase leading-[0.88]">
              <span className="relative inline-block text-3xl sm:text-5xl lg:text-6xl font-extrabold text-3d-pop tracking-tight">
                READING IS THE QUIET HALF.
              </span>
              <span className="relative block text-3xl sm:text-5xl lg:text-6xl font-accent font-bold lowercase italic text-3d-pop-cyan -mt-2 sm:-mt-4 rotate-[-2deg]">
                people are the rest!
              </span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-base font-semibold leading-relaxed text-white/85 sm:text-lg">
              Every resource in this library was written by someone in the member directory. When the writing runs out,
              you can go and ask them directly.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button href="/directory" tone="magenta" size="lg" className="font-extrabold shadow-panel" arrow>
                Search the directory
              </Button>
              <Button href={session ? '/events' : '/membership'} tone="ink" size="lg" className="font-extrabold border border-white/20 text-white hover:border-cyan">
                {session ? 'See upcoming events' : 'How membership works'}
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
