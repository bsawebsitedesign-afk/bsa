'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion, type MotionProps } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardBar, CardBody } from '@/components/ui/card';
import { PhotoFrame } from '@/components/ui/photo';
import { Chip, LiveDot, categoryEmoji } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/misc';
import { cn, formatDay, formatMonth, relativeTime } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/* Types - everything is pre-serialised on the server  */
/* -------------------------------------------------------------------------- */

export interface EventCard {
  id: string;
  slug: string;
  /** Cover photograph. A seeded stand-in fills the frame until one is set. */
  heroImageUrl: string | null;
  title: string;
  description: string;
  category: string;
  status: string;
  /** ISO string. */
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  locationType: string;
  venueName: string | null;
  maxCapacity: number;
  registrations: number;
  spotsLeft: number;
  /** Cheapest ticket, already run through formatMoney on the server. */
  priceLabel: string;
  /** Dearest ticket when it differs - the standard, non-member rate. */
  standardPriceLabel: string | null;
  isFree: boolean;
  cpdHours: number;
  speakerCount: number;
  hasRecording: boolean;
}

const CATEGORIES = ['CONFERENCE', 'SUMMIT', 'WORKSHOP', 'ROUNDTABLE', 'WEBINAR', 'NETWORKING'] as const;

const LOCATION_FILTERS: Array<{ key: string; label: string }> = [
  { key: 'IN_PERSON', label: 'In person' },
  { key: 'VIRTUAL', label: 'Online' },
  { key: 'HYBRID', label: 'Hybrid' },
];

function locationLabel(key: string): string {
  return LOCATION_FILTERS.find((l) => l.key === key)?.label ?? key.replace('_', ' ');
}

/* -------------------------------------------------------------------------- */
/* Filter pill  */
/* -------------------------------------------------------------------------- */

function FilterPill({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex shrink-0 items-center gap-1.5 border border-line px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition-[transform,box-shadow,background-color,color] duration-100',
        active
          ? 'bg-surface-inset text-ink shadow-panel'
          : 'bg-surface text-ink-muted hover:-translate-x-[2px] hover:-translate-y-[2px] hover:text-ink hover:shadow-panel',
      )}
    >
      {children}
      {typeof count === 'number' && (
        <span className={cn('font-display text-[10px] leading-none', active ? 'text-ink' : 'text-ink-muted')}>
          {count}
        </span>
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Date block  */
/* -------------------------------------------------------------------------- */

function DateBlock({
  date,
  tone = 'lime',
  size = 'md',
}: {
  date: string;
  tone?: 'lime' | 'magenta' | 'clay';
  size?: 'sm' | 'md';
}) {
  const tones = {
    lime: 'bg-cyan/12 text-ink',
    magenta: 'bg-grad-brand-soft text-ink',
    clay: 'bg-surface-high text-ink-soft',
  };
  return (
    <span
      aria-hidden
      className={cn(
        'flex flex-shrink-0 flex-col items-center justify-center border border-line shadow-panel',
        size === 'md' ? 'h-16 w-16' : 'h-12 w-12',
        tones[tone],
      )}
    >
      <span className={cn('font-display leading-none', size === 'md' ? 'text-2xl' : 'text-lg')}>{formatDay(date)}</span>
      <span
        className={cn('font-mono font-bold uppercase tracking-[0.14em]', size === 'md' ? 'text-[9px]' : 'text-[8px]')}
      >
        {formatMonth(date)}
      </span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Upcoming / live tile  */
/* -------------------------------------------------------------------------- */

function EventTile({ event }: { event: EventCard }) {
  const live = event.status === 'LIVE';
  const tight = event.spotsLeft <= 15;
  const full = event.spotsLeft <= 0;

  return (
    <Card
      href={`/events/${event.slug}`}
      className={cn('group flex h-full flex-col overflow-hidden', live && 'border-cyan/50')}
    >
      <PhotoFrame
        src={event.heroImageUrl}
        alt=""
        seed={event.slug}
        ratio="wide"
        className="rounded-none border-0 border-b border-line"
      >
        <span className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-2">
          <span className="glass-chip rounded px-2 py-1 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink">
            {event.locationType.replace('_', ' ')}
          </span>
          {event.speakerCount > 0 && (
            <span className="glass-chip rounded px-2 py-1 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink">
              {event.speakerCount} speakers
            </span>
          )}
        </span>
      </PhotoFrame>

      <CardBar tone={live ? 'magenta' : 'ink'}>
        <span className="truncate">
          {event.standardPriceLabel ? `Members ${event.priceLabel}` : event.priceLabel}
          {event.standardPriceLabel && (
            <span className="ml-2 font-normal opacity-70 line-through">{event.standardPriceLabel}</span>
          )}
        </span>
        <span className={cn('shrink-0', live ? 'text-ink' : 'text-ink')}>
          {event.cpdHours > 0 ? `${event.cpdHours} CPD` : 'No CPD'}
        </span>
      </CardBar>

      {live && (
        <div className="flex items-center gap-2 border-b border-line bg-rose/10 px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-rose">
          <LiveDot /> Running now
        </div>
      )}

      <CardBody className="flex flex-1 flex-col p-6">
        <div className="flex items-start gap-4">
          <DateBlock date={event.eventDate} tone={live ? 'magenta' : 'lime'} />
          <div className="min-w-0 flex-1">
            <Chip size="sm" tone="lime" className="mb-2 font-extrabold">
              <span aria-hidden>{categoryEmoji(event.category)}</span> {event.category}
            </Chip>
            <h3 className="text-2xl font-black text-white leading-tight tracking-tight transition-colors group-hover:text-cyan drop-shadow-md">
              {event.title}
            </h3>
            <p className="mt-1.5 font-mono text-xs font-black uppercase tracking-[0.12em] text-cyan">
              {event.startTime} to {event.endTime} · {locationLabel(event.locationType)}
            </p>
          </div>
        </div>

        <p className="mt-3.5 line-clamp-3 flex-1 text-sm font-medium leading-relaxed text-white/80">
          {event.description}
        </p>

        {event.speakerCount > 0 && (
          <p className="mt-3 font-mono text-xs font-extrabold uppercase tracking-[0.12em] text-amber">
            {event.speakerCount} {event.speakerCount === 1 ? 'speaker' : 'speakers'} confirmed
          </p>
        )}

        <div className="mt-5 space-y-2 border-t border-white/15 pt-4 font-mono text-xs font-extrabold uppercase tracking-[0.12em]">
          <p className="truncate text-white font-extrabold">
            {event.venueName ? `${event.venueName} · ` : ''}
            {event.location}
          </p>
          <div className="flex items-center justify-between gap-2">
            <span className={cn(tight ? 'text-rose font-black animate-pulse' : 'text-cyan font-black')}>
              {full ? 'Waiting list' : `${event.spotsLeft} PLACES LEFT`}
            </span>
            <span className="shrink-0 text-amber font-black transition-transform group-hover:translate-x-1">
              {relativeTime(event.eventDate).toUpperCase()} →
            </span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Past row - deliberately quieter than everything above it  */
/* -------------------------------------------------------------------------- */

function ArchiveRow({ event }: { event: EventCard }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group flex items-center gap-4 border border-line bg-base/60 p-3 opacity-70 transition-[opacity,transform,box-shadow] duration-150 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:bg-surface hover:opacity-100 hover:shadow-panel"
    >
      <DateBlock date={event.eventDate} tone="clay" size="sm" />
      <span className="min-w-0 flex-1">
        <span className="mb-1 flex flex-wrap items-center gap-1.5">
          <Chip size="sm" tone="paper">
            <span aria-hidden>{categoryEmoji(event.category)}</span> {event.category}
          </Chip>
          {event.cpdHours > 0 && (
            <Chip size="sm" tone="paper">
              {event.cpdHours} CPD
            </Chip>
          )}
          {event.hasRecording && (
            <Chip size="sm" tone="paper" className="text-violet-bright">
              ▶ Recording
            </Chip>
          )}
        </span>
        <span className="block truncate font-display text-sm uppercase leading-tight text-ink-soft transition-colors group-hover:text-violet-bright">
          {event.title}
        </span>
        <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
          {event.location} · {relativeTime(event.eventDate)}
        </span>
      </span>
      <span
        aria-hidden
        className="hidden font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted sm:block"
      >
        Summary →
      </span>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Main  */
/* -------------------------------------------------------------------------- */

export function EventsClient({ events }: { events: EventCard[] }) {
  const reduced = useReducedMotion();
  const [category, setCategory] = useState<string>('ALL');
  const [place, setPlace] = useState<string>('ALL');

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const event of events) counts[event.category] = (counts[event.category] ?? 0) + 1;
    return counts;
  }, [events]);

  const filtered = useMemo(
    () =>
      events.filter(
        (event) =>
          (category === 'ALL' || event.category === category) && (place === 'ALL' || event.locationType === place),
      ),
    [events, category, place],
  );

  const liveNow = filtered.filter((e) => e.status === 'LIVE');
  const upcoming = filtered.filter((e) => e.status === 'UPCOMING');
  const past = filtered
    .filter((e) => e.status === 'COMPLETED')
    .slice()
    .reverse();

  const filtersOn = category !== 'ALL' || place !== 'ALL';
  const reset = () => {
    setCategory('ALL');
    setPlace('ALL');
  };

  const tileMotion: MotionProps = reduced
    ? {}
    : {
        layout: true,
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, scale: 0.94 },
        transition: { duration: 0.34, ease: [0.16, 1, 0.3, 1] },
      };

  return (
    <>
      {/* ================================================================
 FILTERS + UPCOMING
 ================================================================ */}
      <section className="border-b border-line bg-surface">
        <div className="sticky top-[71px] z-30 border-b border-line bg-surface/95 backdrop-saturate-100">
          <div className="mx-auto max-w-container-max px-4 py-3 lg:px-10">
            <div className="flex items-center gap-3">
              <span className="hidden shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink-muted lg:block">
                Format
              </span>
              <div className="no-scrollbar flex gap-2 overflow-x-auto py-0.5">
                <FilterPill active={category === 'ALL'} onClick={() => setCategory('ALL')} count={events.length}>
                  All formats
                </FilterPill>
                {CATEGORIES.map((key) => (
                  <FilterPill
                    key={key}
                    active={category === key}
                    onClick={() => setCategory(key)}
                    count={categoryCounts[key] ?? 0}
                  >
                    <span aria-hidden>{categoryEmoji(key)}</span> {key}
                  </FilterPill>
                ))}
              </div>
            </div>

            <div className="mt-2 flex items-center gap-3">
              <span className="hidden shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink-muted lg:block">
                Where
              </span>
              <div className="no-scrollbar flex flex-1 items-center gap-2 overflow-x-auto py-0.5">
                <FilterPill active={place === 'ALL'} onClick={() => setPlace('ALL')}>
                  Anywhere
                </FilterPill>
                {LOCATION_FILTERS.map((loc) => (
                  <FilterPill key={loc.key} active={place === loc.key} onClick={() => setPlace(loc.key)}>
                    {loc.label}
                  </FilterPill>
                ))}
                {filtersOn && (
                  <button
                    type="button"
                    onClick={reset}
                    className="ml-1 shrink-0 border border-dashed border-line px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-rose hover:bg-rose/10"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-container-max px-4 py-14 lg:px-10 lg:py-16">
          {/* Live band */}
          {liveNow.length > 0 && (
            <div className="mb-12">
              <div className="mb-5 flex flex-wrap items-center gap-3 border border-line bg-surface-inset px-4 py-2.5 text-ink shadow-panel">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em]">
                  Running today - late registration still open
                </span>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {liveNow.map((event) => (
                  <EventTile key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}

          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-display-md">{filtersOn ? 'Matching events' : 'Open for registration'}</h2>
            <p
              aria-live="polite"
              className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted"
            >
              {upcoming.length + liveNow.length} open {upcoming.length + liveNow.length === 1 ? 'event' : 'events'}
              {past.length > 0 && ` · ${past.length} past`}
            </p>
          </div>

          {upcoming.length === 0 && liveNow.length === 0 ? (
            <EmptyState
              title={filtersOn ? 'Nothing in that combination' : 'Nothing scheduled yet'}
              blurb={
                filtersOn
                  ? 'No event matches that format and location. Widen the filters to see the rest of the calendar.'
                  : 'The next programme has not been published. Ask to be told when dates are announced.'
              }
              action={
                filtersOn ? (
                  <Button tone="ink" onClick={reset}>
                    Show all events
                  </Button>
                ) : (
                  <Button href="/contact" tone="magenta">
                    Tell me when dates land
                  </Button>
                )
              }
            />
          ) : (
            <motion.div layout={!reduced} className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout" initial={false}>
                {upcoming.map((event) => (
                  <motion.div key={event.id} {...tileMotion}>
                    <EventTile event={event} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </section>

      {/* ================================================================
 PAST EVENTS
 ================================================================ */}
      {past.length > 0 && (
        <section className="border-b border-line bg-surface-inset py-14 lg:py-16">
          <div className="mx-auto max-w-container-max px-4 lg:px-10">
            <div className="mb-6 max-w-2xl">
              <span className="mb-3 inline-block border border-line bg-surface-high px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink-soft">
                Past events
              </span>
              <h2 className="text-display-md text-ink-soft">Already held</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                Programmes, speakers and written summaries stay online. Sessions held under Chatham House rule keep the
                summary and drop the attribution.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <AnimatePresence mode="popLayout" initial={false}>
                {past.map((event) => (
                  <motion.div key={event.id} {...tileMotion}>
                    <ArchiveRow event={event} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
