'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { GlobeCanvas, type GlobePin, type GlobeNode } from './globe-canvas';
import { cn } from '@/lib/utils';

/**
 * One continuous scroll journey.
 *
 * The section pins for its whole runway and a single `scrollYProgress` drives
 * everything inside it: the canvas beats, the copy that changes over them, and
 * the partner cards the nodes hand off to at the end. Nothing plays on a
 * threshold, so scrolling back runs the whole thing in reverse.
 *
 * Three things keep it readable rather than clever.
 *
 * The stage is split. Words live in a column on the left with a scrim behind
 * them; the scene lives in its own circle on the right. They never overlap, at
 * any width, at any point in the runway.
 *
 * The runway is short. Three sentences do not need five screens of scrolling,
 * so it is 340vh: about two and a half flicks of a trackpad, and the reader is
 * through.
 *
 * And the reader is told where they are. A three-step rail names each beat and
 * fills as it plays, so the section reads as "1 of 3, two to go" rather than an
 * indefinite scroll trap.
 *
 * Accessibility. The partner cards are real links; they are hidden from the tab
 * order until the beat that shows them, so nobody tabs into an invisible
 * target. Under `prefers-reduced-motion` the pinning, the canvas motion and the
 * crossfades are all dropped: the reader gets a still globe, all three
 * captions, and the cards laid out normally.
 */

export interface JourneyPartner {
  id: string;
  name: string;
  tier: string;
  logoUrl: string;
}

const TIER_LABEL: Record<string, string> = {
  DIAMOND: 'Diamond partner',
  GOLD: 'Gold partner',
  SILVER: 'Silver partner',
  COMMUNITY: 'Community partner',
};

type Counts = { chapters: number; countries: number; members: number };

/**
 * The three things the journey says, in order. Short sentences, plain words,
 * one idea each: the reader is scrolling, not studying.
 */
const BEATS = [
  {
    step: 'Chapters',
    kicker: 'Where we are',
    title: 'A global network',
    body: (c: Counts) =>
      `${c.chapters} chapters across ${c.countries} countries. Every pin is a city where members meet in person.`,
    link: { href: '/chapters', label: 'Browse chapters' },
    at: [0, 0.38] as const,
  },
  {
    step: 'Members',
    kicker: 'How it connects',
    title: 'One membership',
    body: (c: Counts) => `Join any chapter and you join all of them. ${c.members} members share one directory.`,
    link: { href: '/directory', label: 'Search the directory' },
    at: [0.38, 0.72] as const,
  },
  {
    step: 'Partners',
    kicker: 'Who supports us',
    title: 'Backed by industry',
    body: () => 'The organisations funding our events, the chapter programme and our research.',
    link: { href: '/sponsors', label: 'Meet the partners' },
    at: [0.72, 1] as const,
  },
];

/** Matches a media query without re-rendering on every resize tick. */
function useMedia(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [query]);
  return matches;
}

export function ScrollJourney({
  pins,
  partners,
  counts,
}: {
  pins: GlobePin[];
  partners: JourneyPartner[];
  counts: Counts;
}) {
  const ref = useRef<HTMLElement>(null);
  const wide = useMedia('(min-width: 1024px)');
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  /**
   * `useReducedMotion` reads the media query on the client's first render but
   * returns false during SSR, so branching the tree on it directly hands React
   * markup that does not match what it hydrates - the section is thrown away
   * and rebuilt, and dev logs a mismatch. Waiting a tick costs a reduced-motion
   * reader nothing (the section is far below the fold on arrival) and keeps the
   * first paint honest.
   */
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const reduced = prefersReduced && mounted;

  /** A still frame for the reduced layout: the globe, named, not the graph. */
  const still = useMotionValue(0.05);

  // Four across on a wide screen, two on a phone - and only as many cards as
  // fit above the fold, because a card the reader cannot read is not a card.
  const columns = wide ? 4 : 2;
  const shown = useMemo(() => partners.slice(0, wide ? 8 : 4), [partners, wide]);

  // Card slots, in the same normalised space the canvas uses, so a node can fly
  // to exactly where its card is about to appear.
  const nodes: GlobeNode[] = useMemo(() => {
    const total = Math.min(44, Math.max(30, counts.members));
    return Array.from({ length: total }, (_, i) => {
      const partnerIndex = i < shown.length ? i : -1;
      const col = partnerIndex >= 0 ? partnerIndex % columns : 0;
      const row = partnerIndex >= 0 ? Math.floor(partnerIndex / columns) : 0;
      return {
        partner: partnerIndex >= 0,
        // Matches the card grid's real position: rows sitting near the bottom
        // of the pinned stage. Without this the nodes land mid-screen and the
        // hand-off cuts rather than lands.
        gridX: (col + 0.5) / columns,
        gridY: 0.83 + row * 0.085,
      };
    });
  }, [counts.members, shown.length, columns]);

  /* ------------------------------------------------------------ reduced */

  if (reduced) {
    return (
      <section
        ref={ref}
        className="relative border-b border-line py-20 lg:py-24"
        aria-label="How the alliance is organised"
      >
        <div className="mx-auto max-w-container-max px-5 lg:px-8">
          <div className="relative mb-12 h-[42vh] min-h-[300px] overflow-hidden rounded-md border border-line bg-surface-inset">
            <GlobeCanvas progress={still} pins={pins} nodes={nodes} align="center" className="h-full w-full" />
          </div>
          <div className="grid gap-10 md:grid-cols-3">
            {BEATS.map((b) => (
              <div key={b.title}>
                <span className="kicker mb-3">{b.kicker}</span>
                <h2 className="text-display-sm">{b.title}</h2>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">{b.body(counts)}</p>
                <Link
                  href={b.link.href}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-cyan hover:underline"
                >
                  {b.link.label} <span aria-hidden>→</span>
                </Link>
              </div>
            ))}
          </div>
          <PartnerGrid partners={partners} className="mt-12" />
        </div>
      </section>
    );
  }

  return (
    <section
      ref={ref}
      data-journey
      className="relative border-b border-line"
      style={{ height: '340vh' }}
      aria-label="How the alliance is organised"
    >
      <div className="sticky top-0 h-[100dvh] overflow-hidden">
        <div className="mesh-grid absolute inset-0 opacity-[0.18]" aria-hidden />
        <GlobeCanvas progress={scrollYProgress} pins={pins} nodes={nodes} className="absolute inset-0 h-full w-full" />

        {/* The scrim: the copy column always sits on a settled ground, never on
            live graticule. */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-full bg-gradient-to-b from-base via-base/70 to-transparent lg:w-[58%] lg:bg-gradient-to-r lg:from-base lg:via-base/85"
        />

        <div className="relative mx-auto flex h-full max-w-container-max flex-col px-5 pb-8 pt-[calc(var(--nav-h)+2.5rem)] lg:px-8 lg:pb-12">
          <div className="lg:max-w-[34rem]">
            <StepRail progress={scrollYProgress} />

            {/* The copy changes over the same scene rather than the scene being
                replaced. Only one is ever legible at a time. */}
            <div className="relative mt-7 h-[13.5rem] sm:h-[12rem]">
              {BEATS.map((b, i) => (
                <BeatCopy key={b.title} progress={scrollYProgress} range={b.at} first={i === 0}>
                  <span className="kicker mb-3">{b.kicker}</span>
                  <h2 className="text-display-md">{b.title}</h2>
                  <p className="mt-3 max-w-[32rem] text-[1.0625rem] leading-relaxed text-ink-soft">{b.body(counts)}</p>
                  <Link
                    href={b.link.href}
                    className="pointer-events-auto mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-cyan transition-colors hover:text-cyan-bright"
                  >
                    {b.link.label}
                    <span aria-hidden>→</span>
                  </Link>
                </BeatCopy>
              ))}
            </div>
          </div>

          {/* The cards the nodes are flying toward. */}
          <PartnerCards
            progress={scrollYProgress}
            partners={shown}
            columns={columns}
            total={partners.length}
            className="mt-auto"
          />
        </div>

        <ScrollHint progress={scrollYProgress} />
      </div>
    </section>
  );
}

/**
 * Where the reader is, and how much is left: three named steps, each filling
 * across its own slice of the runway.
 */
function StepRail({ progress }: { progress: ReturnType<typeof useScroll>['scrollYProgress'] }) {
  return (
    <ol className="flex items-center gap-x-3 sm:gap-x-5" aria-hidden>
      {BEATS.map((b, i) => (
        // Each step fills across exactly the slice its caption is up for, so
        // the rail and the words never disagree about where the reader is.
        <Step key={b.step} progress={progress} label={b.step} index={i} from={b.at[0]} to={b.at[1]} />
      ))}
    </ol>
  );
}

function Step({
  progress,
  label,
  index,
  from,
  to,
}: {
  progress: ReturnType<typeof useScroll>['scrollYProgress'];
  label: string;
  index: number;
  from: number;
  to: number;
}) {
  const scaleX = useTransform(progress, [from, to], [0, 1], { clamp: true });
  const opacity = useTransform(progress, [from - 0.06, from + 0.02, to, to + 0.06], [0.42, 1, 1, 0.42], {
    clamp: true,
  });

  return (
    <li className="flex items-center gap-1.5 sm:gap-2.5">
      <motion.span
        style={{ opacity }}
        className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.18em] text-ink-muted"
      >
        {String(index + 1).padStart(2, '0')}
      </motion.span>
      <motion.span style={{ opacity }} className="text-xs font-medium tracking-wide text-ink">
        {label}
      </motion.span>
      <span className="relative block h-px w-4 bg-line-bright sm:w-8">
        <motion.span style={{ scaleX }} className="absolute inset-0 block origin-left bg-cyan" />
      </span>
    </li>
  );
}

/** One caption, faded in and out across its slice of the runway. */
function BeatCopy({
  progress,
  range,
  first,
  children,
}: {
  progress: ReturnType<typeof useScroll>['scrollYProgress'];
  range: readonly [number, number];
  first: boolean;
  children: React.ReactNode;
}) {
  const [from, to] = range;
  // Asymmetric on purpose: arrive fast, leave gently. A slow fade-in leaves the
  // reader looking at 40%-opacity type for a couple of hundred pixels of
  // scroll, which reads as broken contrast rather than as a transition.
  const [fadeIn, fadeOut] = [0.035, 0.05];
  const opacity = useTransform(progress, [from, from + fadeIn, to - fadeOut, to], first ? [1, 1, 1, 0] : [0, 1, 1, 0], {
    clamp: true,
  });
  const y = useTransform(progress, [from, to], ['10px', '-10px']);
  // Only the legible caption takes clicks, so a faded-out link is never in the
  // way of the one the reader can actually see.
  const pointerEvents = useTransform(opacity, (v) => (v > 0.5 ? 'auto' : 'none'));

  return (
    <motion.div style={{ opacity, y, pointerEvents }} className="absolute inset-x-0 top-0">
      {children}
    </motion.div>
  );
}

/**
 * The partner cards, positioned on the same grid the canvas nodes target, so
 * the hand-off lands rather than cuts.
 */
function PartnerCards({
  progress,
  partners,
  columns,
  total,
  className,
}: {
  progress: ReturnType<typeof useScroll>['scrollYProgress'];
  partners: JourneyPartner[];
  columns: number;
  total: number;
  className?: string;
}) {
  const opacity = useTransform(progress, [0.8, 0.9], [0, 1], { clamp: true });
  const y = useTransform(progress, [0.8, 0.95], ['18px', '0px']);
  // Hidden means hidden: out of the tab order and out of the accessibility
  // tree until the reader has actually scrolled to it.
  const visibility = useTransform(opacity, (v) => (v > 0.05 ? 'visible' : 'hidden'));

  return (
    <motion.div style={{ opacity, y, visibility }} className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-muted">
          {total} partner organisations
        </span>
        <Link href="/sponsors" className="text-xs font-medium text-cyan hover:underline">
          View all <span aria-hidden>→</span>
        </Link>
      </div>
      <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {partners.map((partner) => (
          <Link
            key={partner.id}
            href="/sponsors"
            // These land on top of the globe while it is still on screen, so
            // they are frosted; the static fallback grid below is not, because
            // there it sits on plain section colour with nothing behind it.
            className="glass glass-hover group flex items-center gap-3 p-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={partner.logoUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-9 w-9 flex-none rounded object-cover grayscale transition-[filter] duration-500 group-hover:grayscale-0"
            />
            <span className="min-w-0">
              {/* Two lines on a phone rather than a truncated name: a partner
                  called "Corvid Intellig..." is not a credit to anybody. */}
              <span className="line-clamp-2 text-[0.8125rem] font-medium leading-snug text-ink sm:truncate">
                {partner.name}
              </span>
              <span className="mt-0.5 hidden truncate font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-ink-muted sm:block">
                {TIER_LABEL[partner.tier] ?? partner.tier}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

/** A static fallback grid, used when motion is reduced. */
function PartnerGrid({ partners, className }: { partners: JourneyPartner[]; className?: string }) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {partners.map((partner) => (
        <Link key={partner.id} href="/sponsors" className="panel flex items-center gap-3 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={partner.logoUrl}
            alt=""
            loading="lazy"
            className="h-9 w-9 flex-none rounded object-cover grayscale"
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-ink">{partner.name}</span>
            <span className="block truncate font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-ink-muted">
              {TIER_LABEL[partner.tier] ?? partner.tier}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

/** Says the section scrolls, then gets out of the way. */
function ScrollHint({ progress }: { progress: ReturnType<typeof useScroll>['scrollYProgress'] }) {
  const opacity = useTransform(progress, [0, 0.04], [1, 0], { clamp: true });

  return (
    <motion.div
      style={{ opacity }}
      aria-hidden
      className="pointer-events-none absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-ink-muted"
    >
      Scroll
      <motion.span
        animate={{ y: [0, 4, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        className="block"
      >
        ↓
      </motion.span>
    </motion.div>
  );
}
