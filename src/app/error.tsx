'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardBar, CardBody } from '@/components/ui/card';
import { Chip } from '@/components/ui/badge';
import { Sticker } from '@/components/ui/misc';

/**
 * Route-level crash screen.
 *
 * Two rules here: never leak an exception message to a production visitor
 * (it goes to the server log instead), and always give the person a way out
 * that is more useful than the back button.
 */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const pathname = usePathname();
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  // Inlined at build time, so the message branch below is never shipped to prod.
  const showDetail = process.env.NODE_ENV !== 'production';

  useEffect(() => {
    console.error('[bsa] route crashed', {
      path: pathname,
      digest: error.digest ?? null,
      message: error.message,
    });
  }, [error, pathname]);

  useEffect(() => {
    if (copyState === 'idle') return;
    const timer = window.setTimeout(() => setCopyState('idle'), 2200);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  async function copyDigest() {
    if (!error.digest) return;
    try {
      await navigator.clipboard.writeText(error.digest);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  const copyLabel = copyState === 'copied' ? 'Copied ' : copyState === 'failed' ? 'Copy blocked' : 'Copy id';

  return (
    <div className="overflow-x-hidden">
      {/* ==================================================================
 CRASH PANEL
 ================================================================== */}
      <section className="relative border-b border-line bg-base py-14 lg:py-20">
        <div className="absolute inset-0 mesh-grid" aria-hidden />

        <div className="relative mx-auto grid max-w-container-max grid-cols-1 items-start gap-10 px-4 lg:grid-cols-12 lg:gap-12 lg:px-10">
          <div className="lg:col-span-7">
            <div className="mb-6 inline-flex flex-wrap items-center gap-2 border border-line bg-grad-brand-soft px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink shadow-panel">
              <span
                aria-hidden
                className="inline-block h-2 w-2 animate-caret-blink border border-line-bright bg-surface"
              />
              Unhandled exception · this page stopped rendering
            </div>

            <h1 className="text-display-lg relative">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 translate-x-[3px] animate-glow-breathe text-rose"
              >
                <span className="block">SOMETHING</span>
                <span className="block">BROKE.</span>
              </span>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-[3px] animate-glow-breathe text-violet-bright [animation-delay:-0.16s]"
              >
                <span className="block">SOMETHING</span>
                <span className="block">BROKE.</span>
              </span>
              <span className="relative block">
                <span className="block">SOMETHING</span>
                <span className="block">BROKE.</span>
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
              Not your fault, and almost certainly not something you typed. A piece of this page threw an error before
              it finished rendering, so we stopped instead of showing you half a page.{' '}
              <strong className="text-cyan px-0.5 font-bold">Nothing you have earned is affected.</strong>
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button tone="magenta" size="lg" onClick={() => reset()}>
                ↻ Try that again
              </Button>
              <Button href="/" tone="paper" size="lg">
                Back to home
              </Button>
            </div>

            <p className="mt-6 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
              Keeps happening?{' '}
              <Link href="/contact" className="text-violet-bright underline decoration-2 underline-offset-4">
                Tell us what you clicked
              </Link>
            </p>
          </div>

          {/* Crash report cabinet */}
          <div className="lg:col-span-5">
            <div className="relative animate-shake">
              <Sticker tone="lime" rotate={-9} className="absolute -left-2 -top-5 z-20 text-[10px]">
                logged, not lost
              </Sticker>

              <div className="border border-line bg-surface-inset shadow-panel-lg">
                <div className="flex items-center justify-between gap-2 border-b border-line-bright/25 px-3 py-2">
                  <span className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink/60">
                    bsa - crash-report.log
                  </span>
                  <span className="flex-shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-rose">
                    exit 1
                  </span>
                </div>

                <div className="space-y-1.5 p-4 font-mono text-[12px] leading-relaxed text-ink sm:text-[13px]">
                  <p className="break-all">
                    <span className="text-cyan">$</span> bsa render {pathname || '/'}
                  </p>
                  <p className="text-rose"> the page threw before it finished</p>
                  <p className="text-ink/60">→ your account and saved data are untouched</p>
                  <p className="text-ink/60">→ the retry button re-runs just this route</p>
                </div>

                <div className="space-y-3 border-t border-line-bright/25 p-4">
                  {error.digest ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink/60">
                        Crash id
                      </span>
                      <code className="min-w-0 flex-1 break-all border border-line-bright/30 bg-surface/10 px-2 py-1 font-mono text-[11px] font-bold text-cyan">
                        {error.digest}
                      </code>
                      <button
                        type="button"
                        onClick={copyDigest}
                        aria-live="polite"
                        className="flex-shrink-0 border border-line-bright/40 bg-surface px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink panel-hover"
                      >
                        {copyLabel}
                      </button>
                    </div>
                  ) : (
                    <p className="font-mono text-[11px] leading-relaxed text-ink/60">
                      No crash id on this one - it broke in the browser rather than on the server.
                    </p>
                  )}

                  {showDetail ? (
                    <div>
                      <Chip tone="tangerine" size="sm" className="mb-2">
                        dev only
                      </Chip>
                      <pre className="max-h-40 overflow-auto border border-line-bright/30 bg-surface/5 p-2 font-mono text-[11px] leading-relaxed text-ink/85">
                        {error.message || 'No message attached to this error.'}
                      </pre>
                    </div>
                  ) : (
                    <p className="font-mono text-[11px] leading-relaxed text-ink/60">
                      The full message stays in the server log where it belongs. Quote the crash id and we can pull it
                      up.
                    </p>
                  )}

                  <p className="font-mono text-[11px] text-ink/70">
                    <span className="text-cyan">$</span>
                    <span
                      aria-hidden
                      className="ml-1 inline-block h-3 w-2 animate-caret-blink bg-cyan/12 align-middle"
                    />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div aria-hidden className="h-5 border-b border-line mesh-grid opacity-40" />

      {/* ==================================================================
 WHAT NOW
 ================================================================== */}
      <section className="border-b border-line bg-surface py-14 lg:py-16">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <div className="mb-8 max-w-2xl">
            <span className="mb-3 inline-block border border-line bg-cyan/12 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] shadow-panel">
              What now
            </span>
            <h2 className="text-display-md">Try this first</h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {[
              {
                n: '01',
                t: 'Hit retry once',
                d: 'A good share of these are a dropped connection or a slow query timing out. One retry fixes it more often than it has any right to.',
                tone: 'lime' as const,
              },
              {
                n: '02',
                t: 'Your progress is fine',
                d: 'Profile changes, module completions and event registrations are written on the server the moment they happen. A render crash cannot undo them.',
                tone: 'violet' as const,
              },
              {
                n: '03',
                t: 'Then tell us',
                d: 'If the same page breaks twice, send the crash id from this screen with a note about what you clicked. That is genuinely enough to find it.',
                tone: 'magenta' as const,
              },
            ].map((step, i) => (
              <Card key={step.n} className="h-full" tilt={(i % 2 === 0 ? 1 : 2) as 1 | 2}>
                <CardBar tone={step.tone}>
                  <span>Step {step.n}</span>
                </CardBar>
                <CardBody>
                  <h3 className="text-xl">{step.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.d}</p>
                </CardBody>
              </Card>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center gap-4 border border-dashed border-line bg-cyan/10 p-5 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-sm leading-relaxed text-ink-soft">
              <strong className="font-bold">Want something that definitely works?</strong> The member directory is about
              as simple as this site gets. Try that while we clean this up.
            </p>
            <Button href="/directory" tone="ink" className="flex-shrink-0">
              Open the directory →
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
