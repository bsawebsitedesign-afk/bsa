import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardBar, CardBody } from '@/components/ui/card';
import { Chip } from '@/components/ui/badge';
import { Marquee } from '@/components/ui/marquee';
import { Reveal } from '@/components/ui/reveal';
import { Sticker } from '@/components/ui/misc';

export const metadata: Metadata = {
  title: '404 · route not found',
  description:
    'That page does not exist on the BSA site. Here is the rest of the map: the member directory, events calendar, opportunities board and regional chapters.',
  robots: { index: false, follow: true },
};

/** Real routes, used as the "known good targets" list - no dead links here. */
const KNOWN_GOOD = [
  { href: '/resources', label: 'Resources' },
  { href: '/events', label: 'Events' },
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/chapters', label: 'Chapters' },
  { href: '/directory', label: 'Directory' },
  { href: '/blog', label: 'Insights' },
];

export default function NotFound() {
  return (
    <div className="overflow-x-hidden">
      {/* ==================================================================
 404
 ================================================================== */}
      <section className="relative border-b border-line bg-base py-14 lg:py-20">
        <div className="absolute inset-0 mesh-grid" aria-hidden />

        <div className="relative mx-auto grid max-w-container-max grid-cols-1 items-start gap-10 px-4 lg:grid-cols-12 lg:gap-12 lg:px-10">
          <div className="lg:col-span-7">
            <Reveal direction="down">
              <div className="mb-6 inline-flex flex-wrap items-center gap-2 border border-line bg-surface px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] shadow-panel">
                <span
                  aria-hidden
                  className="inline-block h-2 w-2 animate-caret-blink border border-line bg-violet/15"
                />
                HTTP 404 · host up, page never existed
              </div>
            </Reveal>

            <Reveal direction="up" delay={0.05}>
              <p
                aria-hidden
                className="relative select-none font-display leading-[0.78] tracking-[-0.04em] text-[6.5rem] sm:text-[9rem] lg:text-[11rem]"
              >
                <span className="absolute left-2 top-2 text-ink">404</span>
                <span className="relative text-gradient">404</span>
              </p>
            </Reveal>

            <Reveal direction="up" delay={0.1}>
              <h1 className="text-display-lg mt-4">
                <span className="block">RECON CAME</span>
                <span className="relative inline-block">
                  <span className="relative z-10">BACK EMPTY.</span>
                  <span aria-hidden className="absolute -bottom-1 left-0 h-4 w-full -rotate-1 bg-cyan/12 sm:h-6" />
                </span>
              </h1>
            </Reveal>

            <Reveal direction="up" delay={0.16}>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
                You probed a URL that is not on this box. Either the link rotted, a slug got renamed, or a character
                went missing somewhere between your brain and the address bar. It happens to everyone who types URLs by
                hand, which around here is everyone.
              </p>
            </Reveal>

            <Reveal direction="up" delay={0.22}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Button href="/directory" tone="magenta" size="lg">
                  ▶ Open the member directory
                </Button>
                <Button href="/events" tone="paper" size="lg">
                  See what's on
                </Button>
                <Button href="/" tone="paper" size="lg">
                  Home
                </Button>
              </div>
            </Reveal>

            <Reveal direction="up" delay={0.28}>
              <div className="mt-9 border-t border-dashed border-line pt-5">
                <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink-muted">
                  Known good targets
                </p>
                <div className="flex flex-wrap gap-2">
                  {KNOWN_GOOD.map((target) => (
                    <Link key={target.href} href={target.href} className="panel-hover inline-block">
                      <Chip tone="paper" className="shadow-panel">
                        {target.label}
                      </Chip>
                    </Link>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>

          {/* Scan output */}
          <div className="lg:col-span-5">
            <Reveal direction="left" delay={0.15}>
              <div className="relative">
                <Sticker tone="tangerine" rotate={-9} className="absolute -left-2 -top-5 z-20 text-[10px]">
                  not a honeypot
                </Sticker>

                <div className="border border-line bg-surface-inset shadow-panel-lg">
                  <div className="flex items-center justify-between gap-2 border-b border-line-bright/25 px-3 py-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink/60">
                      bsa - route-lookup.log
                    </span>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-violet-bright">
                      0 hits
                    </span>
                  </div>

                  <div className="space-y-1.5 p-4 font-mono text-[12px] leading-relaxed text-ink sm:text-[13px]">
                    <p>
                      <span className="text-cyan">$</span> bsa recon --target requested-url
                    </p>
                    <p className="text-ink/60">[*] resolving route table ....... ok</p>
                    <p className="text-ink/60">[*] enumerating public pages .... ok</p>
                    <p className="text-ink/60">[*] matching requested path ..... none</p>
                    <p className="text-ink/60">[*] fuzzing near misses ......... none</p>
                    <p className="pt-2 text-rose">[!] nothing listening on that path</p>
                    <p className="text-ink/60">→ no shell for you today</p>
                    <p className="pt-2">
                      <span className="text-cyan">$</span>
                      <span
                        aria-hidden
                        className="ml-1 inline-block h-3.5 w-2 animate-caret-blink bg-cyan/12 align-middle"
                      />
                    </p>
                  </div>

                  <div className="border-t border-line-bright/25 p-4">
                    <p className="font-mono text-[11px] leading-relaxed text-ink/70">
                      If you tried <span className="text-ink">/admin</span> on the off-chance: bold, and we respect it.
                      The links below all go somewhere real.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <Marquee tone="lime" speed="fast" items={['404', 'ROUTE NOT FOUND', 'THE REST OF THE SITE IS FINE']} />

      {/* ==================================================================
 SOMEWHERE ELSE
 ================================================================== */}
      <section className="border-b border-line bg-surface py-14 lg:py-16">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <div className="mb-8 max-w-2xl">
            <span className="mb-3 inline-block border border-line bg-violet/15 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink shadow-panel">
              Somewhere else
            </span>
            <h2 className="text-display-md">These pages definitely exist</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">
              Since you are already here, you may as well leave with something.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              {
                href: '/directory',
                bar: ' Member directory',
                tone: 'magenta' as const,
                title: 'Find a practitioner',
                blurb:
                  'Search the membership by discipline, region and specialism. The fastest way to reach someone who has already solved your problem.',
                cta: 'Open the directory →',
              },
              {
                href: '/resources',
                bar: ' Resources',
                tone: 'violet' as const,
                title: 'Practitioner guidance',
                blurb:
                  'Written guidance from the membership on building a function, convergence, third-party risk and board reporting.',
                cta: 'Browse resources →',
              },
              {
                href: '/chapters',
                bar: ' Regional chapters',
                tone: 'tangerine' as const,
                title: 'Find your region',
                blurb: 'Local peer groups that meet on a stated cadence, run by members in your part of the world.',
                cta: 'Find a chapter →',
              },
            ].map((door, i) => (
              <Card key={door.href} href={door.href} className="group h-full" tilt={(i === 1 ? 2 : 1) as 1 | 2}>
                <CardBar tone={door.tone}>
                  <span>{door.bar}</span>
                </CardBar>
                <CardBody className="flex h-full flex-col">
                  <h3 className="text-2xl leading-tight transition-colors group-hover:text-violet-bright">
                    {door.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">{door.blurb}</p>
                  <p className="mt-4 border-t border-dashed border-line pt-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-violet-bright transition-transform group-hover:translate-x-1">
                    {door.cta}
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center gap-4 border border-dashed border-line bg-cyan/10 p-5 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-sm leading-relaxed text-ink-soft">
              <strong className="font-bold">Pretty sure this page used to exist?</strong> Send us the link. Broken URLs
              are our bug, not yours, and they are quick to fix.
            </p>
            <Button href="/contact" tone="ink" className="flex-shrink-0">
              Report the dead link →
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
