import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Route skeletons.
 *
 * Deliberately not a spinner: each one draws the shape of the page that is
 * about to arrive, in ink-bordered blocks, so the layout does not jump when the
 * real content lands.
 *
 * These are only wired up on routes that are dynamic *and* slow - the signed-in
 * dashboard, the admin console and the directory search. They are not placed at
 * the root, because a Suspense boundary above a detail page flushes the
 * response before `notFound()` can set a 404 status, and a nonexistent event
 * would then be served as a perfectly indexable 200.
 */

/** One skeleton block. `delay` staggers the pulse so the page breathes. */
export function Block({
  className,
  delay = 0,
  tone = 'sand',
}: {
  className?: string;
  delay?: number;
  tone?: 'sand' | 'clay' | 'lime' | 'ink';
}) {
  const tones = {
    sand: 'bg-sand',
    clay: 'bg-clay',
    lime: 'bg-lime-wash',
    ink: 'bg-ink/10',
  };

  return (
    <span
      aria-hidden
      style={{ animationDelay: `${delay}ms` }}
      className={cn('block animate-pulse border-2 border-ink', tones[tone], className)}
    />
  );
}

function Shell({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="overflow-x-hidden" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Header band with a headline, a line of copy and a row of stat tiles. */
function HeaderBand({ tiles = 3 }: { tiles?: number }) {
  return (
    <section className="relative border-b-3 border-ink bg-bone py-14 lg:py-20">
      <div className="absolute inset-0 paper-grid" aria-hidden />

      <div className="relative mx-auto max-w-container-max px-4 lg:px-10">
        <p className="mb-6 inline-flex items-center gap-2 border-2 border-ink bg-paper px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] shadow-hard">
          Loading…
          <span aria-hidden className="inline-block h-3 w-2 animate-blink bg-magenta align-middle" />
        </p>

        <div className="max-w-3xl space-y-3">
          <Block className="h-11 w-[78%] sm:h-14" />
          <Block className="h-11 w-[52%] sm:h-14" delay={90} tone="clay" />
        </div>

        <div className="mt-7 max-w-xl space-y-2.5">
          <Block className="h-3.5 w-full" delay={200} tone="clay" />
          <Block className="h-3.5 w-[76%]" delay={250} tone="clay" />
        </div>

        <div className="mt-9 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: tiles }).map((_, i) => (
            <div key={i} className="border-2 border-ink bg-paper p-4 shadow-hard">
              <Block className="h-7 w-3/4" delay={320 + i * 80} tone={i === 0 ? 'lime' : 'sand'} />
              <Block className="mt-3 h-2.5 w-full" delay={360 + i * 80} tone="clay" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Indeterminate hazard bar - the progress that genuinely cannot be measured. */
function HazardBar() {
  return <div aria-hidden className="h-6 border-b-3 border-ink stripes animate-stripe-slide" />;
}

function CardGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border-2 border-ink bg-paper shadow-hard-md">
          <div
            aria-hidden
            style={{ animationDelay: `${i * 70}ms` }}
            className={cn(
              'h-9 animate-pulse border-b-2 border-ink',
              i % 4 === 0 ? 'bg-lime' : i % 4 === 1 ? 'bg-violet-wash' : i % 4 === 2 ? 'bg-tangerine-wash' : 'bg-sand',
            )}
          />
          <div className="space-y-2.5 p-5">
            <Block className="h-5 w-20" delay={i * 70 + 40} tone="clay" />
            <Block className="h-6 w-[80%]" delay={i * 70 + 90} />
            <Block className="h-3 w-full" delay={i * 70 + 140} tone="clay" />
            <Block className="h-3 w-[65%]" delay={i * 70 + 190} tone="clay" />
            <div className="flex items-center justify-between gap-3 border-t-2 border-dashed border-ink pt-3">
              <Block className="h-3 w-16" delay={i * 70 + 240} tone="clay" />
              <Block className="h-3 w-14" delay={i * 70 + 280} tone="clay" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Filter bar plus a grid of result cards. For the directory. */
export function ListSkeleton() {
  return (
    <Shell label="Loading the member directory">
      <HeaderBand tiles={4} />
      <HazardBar />

      <section className="bg-paper py-12 lg:py-16">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <div className="mb-8 grid grid-cols-1 gap-3 border-2 border-ink bg-bone p-4 shadow-hard sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Block key={i} className="h-11 w-full" delay={i * 60} />
            ))}
          </div>

          <CardGrid count={8} />

          <p className="mt-10 text-center font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink-3">
            Pulling this together
            <span aria-hidden className="ml-1.5 inline-block h-3 w-2 animate-blink bg-violet align-middle" />
          </p>
        </div>
      </section>
    </Shell>
  );
}

/** Sidebar plus stacked panels. For the dashboard and the admin console. */
export function ConsoleSkeleton({ label = 'Loading your dashboard' }: { label?: string }) {
  return (
    <Shell label={label}>
      <HeaderBand tiles={4} />
      <HazardBar />

      <section className="bg-paper py-12 lg:py-16">
        <div className="mx-auto grid max-w-container-max grid-cols-1 gap-6 px-4 lg:grid-cols-12 lg:px-10">
          {/* Section nav */}
          <div className="lg:col-span-3">
            <div className="space-y-2 border-2 border-ink bg-bone p-3 shadow-hard">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Block key={i} className="h-9 w-full" delay={i * 70} tone={i === 0 ? 'lime' : 'sand'} />
              ))}
            </div>
          </div>

          {/* Panels */}
          <div className="space-y-5 lg:col-span-9">
            {[0, 1, 2].map((panel) => (
              <div key={panel} className="border-2 border-ink bg-paper shadow-hard-md">
                <div
                  aria-hidden
                  style={{ animationDelay: `${panel * 120}ms` }}
                  className={cn(
                    'h-9 animate-pulse border-b-2 border-ink',
                    panel === 0 ? 'bg-lime' : panel === 1 ? 'bg-violet-wash' : 'bg-tangerine-wash',
                  )}
                />
                <div className="space-y-3 p-5">
                  <Block className="h-6 w-[45%]" delay={panel * 120 + 60} />
                  {[0, 1, 2].map((row) => (
                    <div key={row} className="flex items-center gap-3 border-2 border-dashed border-clay p-3">
                      <Block className="h-10 w-10 flex-shrink-0" delay={panel * 120 + row * 60 + 120} tone="clay" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Block className="h-3.5 w-[55%]" delay={panel * 120 + row * 60 + 160} tone="clay" />
                        <Block className="h-3 w-[80%]" delay={panel * 120 + row * 60 + 200} tone="clay" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Shell>
  );
}
