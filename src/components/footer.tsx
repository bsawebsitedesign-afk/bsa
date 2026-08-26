import React from 'react';
import Link from 'next/link';
import { Logo } from './logo';
import { Marquee } from './ui/marquee';

const COLUMNS = [
  {
    title: 'Connect',
    links: [
      { label: 'Member directory', href: '/directory' },
      { label: 'Regional chapters', href: '/chapters' },
      { label: 'Find a mentor', href: '/directory?mentors=1' },
      { label: 'Events', href: '/events' },
    ],
  },
  {
    title: 'Grow',
    links: [
      { label: 'Opportunities', href: '/opportunities' },
      { label: 'Speaking calls', href: '/opportunities?type=SPEAKING' },
      { label: 'Membership', href: '/membership' },
      { label: 'Partner with BSA', href: '/sponsors' },
    ],
  },
  {
    title: 'Learn & Legal',
    links: [
      { label: 'Resources', href: '/resources' },
      { label: 'Industry insights', href: '/blog' },
      { label: 'About the alliance', href: '/about' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Contact Office', href: '/contact' },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-line bg-surface-inset">
      <div className="pointer-events-none absolute inset-0 aura-violet opacity-60" aria-hidden />
      <div className="pointer-events-none absolute inset-0 mesh-grid opacity-25" aria-hidden />

      <Marquee
        tone="ink"
        items={[
          'CONNECT · GROW · LEARN',
          'A PROFESSIONAL ALLIANCE',
          'FOR THE SECURITY INDUSTRY',
          'MEMBERS · CHAPTERS · EVENTS',
        ]}
        separator=""
        className="relative border-t-0"
      />

      <div className="relative mx-auto max-w-container-max px-5 py-16 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Logo subtitle />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink-soft">
              A professional association for the security industry. We connect practitioners, leaders, consultants and
              organisations so the whole industry gets stronger.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {['LinkedIn', 'Newsletter', 'Events'].map((social) => (
                <span
                  key={social}
                  className="rounded border border-line bg-surface/60 px-2.5 py-1 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-ink-muted"
                >
                  {social}
                </span>
              ))}
            </div>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="kicker mb-5">{column.title}</h3>
              {/* The gap moved into the links themselves: at 20px tall with a
                  12px gap these were both small and close together, which is the
                  combination that makes a footer unusable with a thumb. Same
                  pitch down the column, twice the target. */}
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group inline-flex min-h-[44px] items-center gap-2 py-1 text-sm text-ink-soft transition-colors hover:text-cyan-bright"
                    >
                      <span aria-hidden className="h-px w-0 bg-cyan transition-all duration-300 group-hover:w-3" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-line pt-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan animate-pulse" />
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-cyan">
              ALL ALLIANCE SYSTEMS OPERATIONAL · TELEMETRY ACTIVE
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/terms"
              className="inline-flex min-h-[44px] items-center font-mono text-xs font-semibold text-ink-soft transition-colors hover:text-cyan"
            >
              Terms of Service
            </Link>
            <span className="text-white/20">·</span>
            <Link
              href="/privacy"
              className="inline-flex min-h-[44px] items-center font-mono text-xs font-semibold text-ink-soft transition-colors hover:text-cyan"
            >
              Privacy Policy
            </Link>
            <span className="text-white/20">·</span>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
              © {year} Business Security Alliance.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
