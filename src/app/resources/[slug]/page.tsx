import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardBar, CardBody } from '@/components/ui/card';
import { Chip } from '@/components/ui/badge';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/reveal';
import { ProgressMeter, SectionHead, Sticker } from '@/components/ui/misc';
import { accentClasses, accentFor, percent, type Accent } from '@/lib/utils';
import { ResourceModules } from './resource-client';

/* Reads the session cookie, so this page is rendered per request. */
export const revalidate = 0;

const ACCENT_KEYS: readonly string[] = ['lime', 'magenta', 'violet', 'tangerine', 'cobalt'];

function resolveAccent(stored: string, seed: string): Accent {
  return ACCENT_KEYS.includes(stored) ? (stored as Accent) : accentFor(seed);
}

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

/** Matches <Button tone="lime" size="md" className="w-full"> for the in-page resume anchor. */
const RESUME_LINK_CLASSES =
  'inline-flex w-full items-center justify-center gap-2 border border-line bg-cyan/12 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-ink shadow-panel panel-hover select-none';

const LEVEL_BLURB: Record<string, string> = {
  FOUNDATION: 'Assumes no prior grounding in the topic.',
  PRACTITIONER: 'Written for people doing the work day to day.',
  EXECUTIVE: 'Written for people accountable for the function.',
};

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const resource = await prisma.resource.findUnique({
      where: { slug: params.slug },
      select: { title: true, summary: true, isPublished: true },
    });

    if (!resource || !resource.isPublished) {
      return { title: 'Resource not found', description: 'That resource is not in the library.' };
    }

    return { title: resource.title, description: resource.summary };
  } catch (err) {
    return { title: 'BSA Resource', description: 'Practical written guidance for security professionals.' };
  }
}

export default async function ResourcePage({ params }: { params: { slug: string } }) {
  let resource: any = null;
  let session: any = null;
  const completedModuleIds = new Set<string>();

  try {
    const fetched = await Promise.all([
      prisma.resource.findUnique({
        where: { slug: params.slug },
        select: {
          id: true,
          slug: true,
          title: true,
          summary: true,
          description: true,
          level: true,
          accent: true,
          emoji: true,
          estHours: true,
          isPublished: true,
          modules: {
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              title: true,
              summary: true,
              content: true,
              minutes: true,
              resourceUrl: true,
            },
          },
        },
      }),
      getSession(),
    ]);

    resource = fetched[0];
    session = fetched[1];

    if (resource && session) {
      const moduleIds = resource.modules.map((m: any) => m.id);
      const rows = await prisma.resourceProgress.findMany({
        where: { userId: session.userId, moduleId: { in: moduleIds } },
        select: { moduleId: true },
      });
      for (const row of rows) completedModuleIds.add(row.moduleId);
    }
  } catch (err) {
    console.error('Resource Detail DB Error on Serverless:', err);
  }

  if (!resource || !resource.isPublished) notFound();

  const completedSet = completedModuleIds;
  const completedIds = Array.from(completedSet);

  const accent = resolveAccent(resource.accent, resource.slug);
  const tint = accentClasses[accent];

  const totalModules = resource.modules.length;
  const doneModules = resource.modules.filter((m: any) => completedSet.has(m.id)).length;
  const pct = percent(doneModules, totalModules);
  const totalMinutes = resource.modules.reduce((sum: number, m: any) => sum + m.minutes, 0);
  const remainingMinutes = resource.modules
    .filter((m: any) => !completedSet.has(m.id))
    .reduce((sum: number, m: any) => sum + m.minutes, 0);

  const firstIncomplete = resource.modules.find((m: any) => !completedSet.has(m.id)) ?? null;
  const firstIncompleteIndex = firstIncomplete ? resource.modules.indexOf(firstIncomplete) : -1;

  const others = await prisma.resource.findMany({
    where: { isPublished: true, slug: { not: resource.slug } },
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
  });

  return (
    <div className="overflow-x-hidden">
      {/* ==================================================================
 HEADER
 ================================================================== */}
      <section className={`relative border-b border-line ${tint.bg} ${tint.text}`}>
        <div className="absolute inset-0 mesh-dots opacity-25" aria-hidden />

        <div className="relative mx-auto max-w-container-max px-4 py-10 lg:px-10 lg:py-16">
          <Link
            href="/resources"
            className="inline-flex items-center gap-2 border border-line bg-surface px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink shadow-panel transition-transform hover:-translate-x-1"
          >
            ← All resources
          </Link>

          <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <Reveal direction="up">
                <div className="flex items-start gap-5">
                  <span
                    aria-hidden
                    className="flex h-20 w-20 flex-shrink-0 items-center justify-center border border-line bg-surface text-4xl shadow-panel-lg animate-float sm:h-24 sm:w-24 sm:text-5xl"
                  >
                    {resource.emoji}
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-cyan">
                      {resource.level} · {totalModules} {totalModules === 1 ? 'module' : 'modules'} · ~
                      {resource.estHours}h
                    </p>
                    <h1 className="relative mt-2 text-4xl sm:text-6xl font-black uppercase tracking-tight text-white text-3d-pop drop-shadow-lg leading-tight">
                      {resource.title}
                    </h1>
                  </div>
                </div>
              </Reveal>

              <Reveal direction="up" delay={0.08}>
                <p className="mt-6 max-w-2xl text-lg font-black leading-snug text-white drop-shadow-md sm:text-xl">{resource.summary}</p>
                <p className="mt-3 max-w-2xl text-base font-medium leading-relaxed text-white/85 sm:text-lg">{resource.description}</p>
              </Reveal>

              <Reveal direction="up" delay={0.14}>
                <div className="mt-7 flex flex-wrap gap-2">
                  <Chip tone="lime" className="font-extrabold">{resource.level}</Chip>
                  <Chip tone="violet" className="font-extrabold">{totalMinutes} min of reading</Chip>
                  <Chip tone="tangerine" className="font-extrabold">Written by members</Chip>
                  <Chip tone="cobalt" className="font-extrabold">No vendor content</Chip>
                </div>
                <p className="mt-4 max-w-xl text-xs font-semibold leading-relaxed text-white/80">
                  {LEVEL_BLURB[resource.level] ?? 'Written for practising members.'}
                </p>
              </Reveal>
            </div>

            <div className="lg:col-span-4">
              <Reveal direction="left" delay={0.1}>
                <div className="relative">
                  <Sticker
                    tone={accent === 'lime' || accent === 'tangerine' ? 'violet' : 'lime'}
                    rotate={-8}
                    className="absolute -left-2 -top-5 z-20 text-[10px]"
                  >
                    read in any order
                  </Sticker>

                  <div className="border border-white/20 bg-surface/95 p-6 text-white shadow-panel-lg rounded-2xl">
                    <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-cyan">
                      In this resource
                    </p>
                    <ol className="mt-4 space-y-3">
                      {(resource.modules ?? []).map((m: any, i: number) => (
                        <li key={m.id} className="flex items-start gap-3">
                          <span
                            aria-hidden
                            className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border border-white/20 font-mono text-[10px] font-black ${
                              completedSet.has(m.id) ? 'bg-cyan/20 text-cyan border-cyan/40' : 'bg-base text-white'
                            }`}
                          >
                            {completedSet.has(m.id) ? '✓' : i + 1}
                          </span>
                          <a
                            href={`#module-${m.id}`}
                            className="text-xs font-semibold leading-relaxed text-white/90 underline decoration-cyan/40 underline-offset-4 transition-colors hover:text-cyan hover:decoration-cyan"
                          >
                            {m.title}
                          </a>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================
  MODULES + PROGRESS
  ================================================================== */}
      <section className="border-b border-line bg-base py-16 lg:py-20">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            {/* Modules */}
            <div className="order-2 lg:order-1 lg:col-span-8">
              <div className="mb-8">
                <span className="mb-3 inline-block border border-cyan/40 bg-cyan/10 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-cyan shadow-panel rounded">
                  The modules
                </span>
                <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">Read it in order, or take the one you need.</h2>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-white/80">
                  Modules build on each other, but each one stands up on its own. Open a module to read it in full.
                </p>
              </div>

              <ResourceModules
                slug={resource.slug}
                resourceTitle={resource.title}
                modules={resource.modules}
                completedIds={completedIds}
                isSignedIn={Boolean(session)}
              />
            </div>

            {/* Progress - sits above the reading on small screens. */}
            <div className="order-1 lg:order-2 lg:col-span-4">
              <div className="sticky top-24 space-y-6">
                <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md shadow-panel-lg overflow-hidden">
                  <div className="flex items-center justify-between border-b border-line bg-surface-inset/80 px-6 py-4">
                    <span className="text-base font-extrabold text-white">{session ? 'Your Progress' : 'Resource Overview'}</span>
                    <span className="rounded-full bg-cyan/20 border border-cyan/40 px-3 py-1 font-mono text-xs font-bold text-cyan">{totalMinutes} min</span>
                  </div>

                  <div className="space-y-6 p-6">
                    {session ? (
                      <>
                        <div className="flex items-end justify-between gap-3">
                          <span className="font-display text-5xl font-black leading-none text-white">{pct}%</span>
                          <span className="pb-1 text-right font-mono text-xs font-extrabold uppercase tracking-wider text-cyan">
                            {doneModules} of {totalModules} Modules Read
                          </span>
                        </div>

                        <ProgressMeter done={doneModules} total={totalModules} tone={METER_TONE[accent]} />

                        <dl className="space-y-3 border-t border-line pt-4 font-mono text-xs font-bold uppercase tracking-wider">
                          <div className="flex items-center justify-between gap-2">
                            <dt className="text-ink-muted">Total Reading</dt>
                            <dd className="text-white font-extrabold">{totalMinutes} min</dd>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <dt className="text-ink-muted">Left To Read</dt>
                            <dd className={remainingMinutes === 0 ? 'text-white/50' : 'text-cyan font-extrabold'}>
                              {remainingMinutes === 0 ? 'Nothing' : `${remainingMinutes} min`}
                            </dd>
                          </div>
                        </dl>

                        {firstIncomplete ? (
                          <div className="pt-2">
                            <a
                              href={`#module-${firstIncomplete.id}`}
                              className="w-full rounded-full bg-cyan/20 border border-cyan/40 px-5 py-3 font-mono text-xs font-bold text-cyan text-center block hover:bg-cyan/30 transition-all uppercase tracking-wider shadow-sm"
                            >
                              {doneModules === 0
                                ? 'Start Module 01'
                                : `Resume at Module ${String(firstIncompleteIndex + 1).padStart(2, '0')}`}
                            </a>
                            <p className="mt-2.5 text-center text-xs font-semibold leading-snug text-white/80">
                              {firstIncomplete.title}
                            </p>
                          </div>
                        ) : (
                          <div className="animate-fade-up border border-cyan/40 bg-cyan/10 p-4 text-center shadow-panel rounded-xl">
                            <p className="font-display text-base font-extrabold uppercase leading-tight text-white">Resource Complete</p>
                            <p className="mt-1.5 text-xs font-semibold leading-relaxed text-cyan">
                              Every module is marked as read.
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-end justify-between gap-3">
                          <span className="font-display text-5xl font-black leading-none text-white">{totalModules}</span>
                          <span className="pb-1 text-right font-mono text-xs font-black uppercase tracking-wider text-cyan">
                            Modules
                            <br />
                            {totalMinutes} min total
                          </span>
                        </div>

                        <p className="border-t border-line pt-4 text-sm font-medium leading-relaxed text-ink-soft">
                          The full text is open to everyone. Sign in and the site keeps a record of which modules you
                          have read, so a long resource survives being put down for a fortnight.
                        </p>

                        <div className="space-y-3">
                          <Button
                            href={`/login?redirect=/resources/${resource.slug}`}
                            tone="lime"
                            size="md"
                            className="w-full font-extrabold"
                          >
                            Sign in to track progress
                          </Button>
                          <Button href="/membership" tone="paper" size="md" className="w-full font-extrabold">
                            How membership works
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg space-y-3">
                  <p className="font-mono text-xs font-extrabold uppercase tracking-wider text-cyan">
                    💡 Stuck On The Specifics?
                  </p>
                  <p className="text-xs font-medium leading-relaxed text-ink-soft">
                    The directory lists members by discipline and organisation. Someone in it has already handled the
                    version of this problem you are looking at.
                  </p>
                  <Button href="/directory" tone="paper" size="sm" className="w-full mt-2">
                    Search the directory →
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================
 OTHER RESOURCES
 ================================================================== */}
      {others.length > 0 && (
        <section className="border-b border-line bg-surface py-20">
          <div className="mx-auto max-w-container-max px-4 lg:px-10">
            <SectionHead
              kicker="Also in the library"
              tone="tangerine"
              title="What to read next"
              blurb="Members tend to read across these rather than through one. They were written to be picked up in any order."
              action={
                <Button href="/resources" tone="ink" size="sm">
                  All resources →
                </Button>
              }
            />

            <RevealGroup className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {others.map((other) => {
                const otherAccent = resolveAccent(other.accent, other.slug);
                return (
                  <RevealItem key={other.slug}>
                    <Card href={`/resources/${other.slug}`} className="group h-full">
                      <CardBar tone={otherAccent}>
                        <span className="truncate">{other.level}</span>
                        <span className="flex-shrink-0">{other._count.modules} modules</span>
                      </CardBar>
                      <CardBody className="flex h-full flex-col">
                        <div className="flex items-center gap-3">
                          <span aria-hidden className="text-2xl">
                            {other.emoji}
                          </span>
                          <h3 className="text-lg leading-tight transition-colors group-hover:text-violet-bright">
                            {other.title}
                          </h3>
                        </div>
                        <p className="mt-3 flex-1 text-xs leading-relaxed text-ink-muted">{other.summary}</p>
                        <p className="mt-4 flex items-center justify-between border-t border-dashed border-line pt-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em]">
                          <span className="text-ink-muted">~{other.estHours}h</span>
                          <span className="text-violet-bright transition-transform group-hover:translate-x-1">
                            Read it →
                          </span>
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
                Found a gap?
              </span>
              <h2 className="text-display-md text-ink">This was written by a member. You can correct it.</h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/75">
                If your experience of {resource.title.toLowerCase()} differs, that is worth capturing. Tell us what is
                missing and we will get it in front of the author, or help you write the next resource yourself.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Button href="/contact" tone="lime" size="lg">
                Send a correction
              </Button>
              <Button href="/events" tone="paper" size="lg">
                Discuss it at an event
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
