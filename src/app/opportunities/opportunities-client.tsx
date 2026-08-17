'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardBar, CardBody } from '@/components/ui/card';
import { PhotoFrame } from '@/components/ui/photo';
import { Chip, LiveDot, categoryEmoji } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/misc';
import { Input, Label } from '@/components/ui/field';
import { cn, relativeTime } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/* Shape passed down from the server page  */
/* -------------------------------------------------------------------------- */

export interface BoardListing {
  slug: string;
  title: string;
  org: string;
  logoUrl: string | null;
  type: string;
  locationType: string;
  location: string;
  compensation: string | null;
  /** ISO string or null - Dates are not serialisable across the boundary. */
  deadline: string | null;
  postedAt: string;
  responses: number;
  blurb: string;
}

/* -------------------------------------------------------------------------- */
/* Taxonomy  */
/* -------------------------------------------------------------------------- */

const TYPES = ['ROLE', 'PARTNERSHIP', 'RFP', 'SPEAKING', 'BOARD_POSITION'] as const;
const PLACES = ['REMOTE', 'HYBRID', 'ONSITE'] as const;

type TypeTone = 'cobalt' | 'lime' | 'tangerine' | 'violet' | 'magenta';

const TYPE_TONE: Record<string, TypeTone> = {
  ROLE: 'cobalt',
  PARTNERSHIP: 'lime',
  RFP: 'tangerine',
  SPEAKING: 'violet',
  BOARD_POSITION: 'magenta',
};

const TYPE_LABEL: Record<string, string> = {
  ROLE: 'Senior role',
  PARTNERSHIP: 'Partnership',
  RFP: 'Tender',
  SPEAKING: 'Speaking call',
  BOARD_POSITION: 'Board appointment',
};

/** The shared kit does not yet carry the new listing types; fall back locally. */
const TYPE_EMOJI: Record<string, string> = {
  ROLE: '💼',
  PARTNERSHIP: '🤝',
  RFP: '📑',
  SPEAKING: '🎙️',
  BOARD_POSITION: '🏛️',
};

function typeEmoji(type: string): string {
  const kit = categoryEmoji(type);
  return kit === '▪' ? (TYPE_EMOJI[type] ?? kit) : kit;
}

const ACTIVE_BG: Record<TypeTone | 'ink', string> = {
  cobalt: 'bg-violet-deep/18 text-ink',
  lime: 'bg-cyan/12 text-ink',
  tangerine: 'bg-amber/12 text-ink',
  violet: 'bg-violet/15 text-ink',
  magenta: 'bg-grad-brand-soft text-ink',
  ink: 'bg-surface-inset text-ink',
};

const PLACE_LABEL: Record<string, string> = {
  REMOTE: ' Remote',
  HYBRID: ' Hybrid',
  ONSITE: ' On site',
};

const PLACE_SHORT: Record<string, string> = {
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
  ONSITE: 'On site',
};

function daysUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

/* -------------------------------------------------------------------------- */
/* Filter pill  */
/* -------------------------------------------------------------------------- */

function Pill({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone?: TypeTone | 'ink';
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold transition-all duration-200',
        active
          ? 'bg-cyan/20 border border-cyan/40 text-cyan shadow-sm scale-105'
          : 'bg-surface-raised/80 border border-line text-ink-soft hover:border-cyan/30 hover:text-white',
      )}
    >
      {children}
      {typeof count === 'number' && (
        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-mono font-bold', active ? 'bg-cyan/30 text-cyan' : 'bg-surface text-ink-muted')}>
          {count}
        </span>
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Board  */
/* -------------------------------------------------------------------------- */

export function OpportunitiesBoard({
  listings,
  initialType = 'ALL',
}: {
  listings: BoardListing[];
  initialType?: string;
}) {
  const reduced = useReducedMotion();
  const [type, setType] = useState<string>(initialType);
  const [place, setPlace] = useState<string>('ALL');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'newest' | 'deadline'>('newest');

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const listing of listings) counts[listing.type] = (counts[listing.type] ?? 0) + 1;
    return counts;
  }, [listings]);

  const placeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const listing of listings) counts[listing.locationType] = (counts[listing.locationType] ?? 0) + 1;
    return counts;
  }, [listings]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const filtered = listings.filter((listing) => {
      if (type !== 'ALL' && listing.type !== type) return false;
      if (place !== 'ALL' && listing.locationType !== place) return false;
      if (!needle) return true;
      return (
        listing.title.toLowerCase().includes(needle) ||
        listing.org.toLowerCase().includes(needle) ||
        listing.location.toLowerCase().includes(needle)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'deadline') {
        // Rolling listings sit last; everything else soonest first.
        const left = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
        const right = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
        return left - right;
      }
      return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
    });
  }, [listings, type, place, query, sort]);

  const filtersOn = type !== 'ALL' || place !== 'ALL' || query.trim() !== '';

  function resetAll() {
    setType('ALL');
    setPlace('ALL');
    setQuery('');
  }

  if (listings.length === 0) {
    return (
      <EmptyState
        title="Nothing on the board right now"
        blurb="Every listing has closed or been filled. New ones go up as members and partner organisations send them in."
        action={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button href="/contact" tone="magenta">
              Post an opportunity
            </Button>
            <Button href="/directory" tone="paper">
              Browse the directory
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <div>
      {/* ---------------------------------------------------------------- */}
      {/* Control panel  */}
      {/* ---------------------------------------------------------------- */}
      <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md shadow-panel-lg overflow-hidden">
        <div className="flex items-center justify-between border-b border-line bg-surface-inset/80 px-6 py-4">
          <span className="text-base font-extrabold text-white flex items-center gap-2">🔍 Filter The Board</span>
          <span className="rounded-full bg-cyan/20 border border-cyan/40 px-3 py-1 font-mono text-xs font-bold text-cyan">
            {listings.length} Live {listings.length === 1 ? 'Listing' : 'Listings'}
          </span>
        </div>

        <div className="space-y-6 p-6 sm:p-7">
          {/* Search + sort */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="board-search" className="text-xs font-extrabold uppercase tracking-wider text-white">
                  Search
                </label>
                <span className="font-mono text-xs text-ink-muted">title, organisation or location</span>
              </div>
              <div className="relative">
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-cyan"
                >
                  🔍
                </span>
                <input
                  id="board-search"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="head of security, Singapore, Palisade…"
                  className="w-full rounded-xl border border-line bg-base pl-11 pr-10 py-3 text-sm font-semibold text-white placeholder:text-ink-muted focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan transition-all"
                  autoComplete="off"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-surface-inset font-bold text-xs text-white hover:bg-cyan/20 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div>
              <span className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-white">
                Sort
              </span>
              <div className="flex items-center gap-1.5 rounded-full border border-line bg-base p-1.5" role="group" aria-label="Sort listings">
                {[
                  { key: 'newest' as const, text: 'Newest' },
                  { key: 'deadline' as const, text: 'Closing Soonest' },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setSort(option.key)}
                    aria-pressed={sort === option.key}
                    className={cn(
                      'rounded-full px-4 py-2 text-xs font-extrabold transition-all duration-200',
                      sort === option.key
                        ? 'bg-cyan/20 border border-cyan/40 text-cyan shadow-sm scale-105'
                        : 'text-ink-soft hover:text-white hover:bg-surface-raised/80',
                    )}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Type filters */}
          <div>
            <span className="mb-3 block text-xs font-extrabold uppercase tracking-wider text-cyan">
              Type of Listing
            </span>
            <div className="flex flex-wrap gap-2.5">
              <Pill active={type === 'ALL'} onClick={() => setType('ALL')} count={listings.length}>
                All Types
              </Pill>
              {TYPES.filter((t) => typeCounts[t]).map((t) => (
                <Pill
                  key={t}
                  active={type === t}
                  tone={TYPE_TONE[t]}
                  onClick={() => setType(type === t ? 'ALL' : t)}
                  count={typeCounts[t]}
                >
                  {typeEmoji(t)} {TYPE_LABEL[t]}
                </Pill>
              ))}
            </div>
          </div>

          {/* Location filters */}
          <div>
            <span className="mb-3 block text-xs font-extrabold uppercase tracking-wider text-cyan">
              Working Arrangement
            </span>
            <div className="flex flex-wrap gap-2.5">
              <Pill active={place === 'ALL'} onClick={() => setPlace('ALL')}>
                Anywhere
              </Pill>
              {PLACES.filter((p) => placeCounts[p]).map((p) => (
                <Pill
                  key={p}
                  active={place === p}
                  onClick={() => setPlace(place === p ? 'ALL' : p)}
                  count={placeCounts[p]}
                >
                  {PLACE_LABEL[p]}
                </Pill>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Live count  */}
      {/* ---------------------------------------------------------------- */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-line pb-3">
        <p aria-live="polite" className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          <span className="mr-1.5 inline-block border border-line bg-cyan/12 px-2 py-0.5 font-display tabular-nums text-ink">
            {visible.length}
          </span>
          {visible.length === 1 ? 'listing matches' : 'listings match'}
          {filtersOn && <span className="text-ink-soft"> of {listings.length}</span>}
        </p>

        {filtersOn && (
          <button
            type="button"
            onClick={resetAll}
            className="border border-line bg-grad-brand-soft px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink shadow-panel panel-hover"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Grid  */}
      {/* ---------------------------------------------------------------- */}
      {visible.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="No listings match that combination"
          blurb="Try a broader filter. The board is deliberately short - everything on it has been posted by a named organisation."
          action={
            <Button tone="ink" onClick={resetAll}>
              Reset the board
            </Button>
          }
        />
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((listing, i) => (
              <motion.div
                key={listing.slug}
                layout={!reduced}
                initial={reduced ? false : { opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduced ? undefined : { opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.32, delay: reduced ? 0 : Math.min(i, 6) * 0.035, ease: [0.16, 1, 0.3, 1] }}
              >
                <ListingCard listing={listing} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Card  */
/* -------------------------------------------------------------------------- */

function ListingCard({ listing }: { listing: BoardListing }) {
  const days = listing.deadline ? daysUntil(listing.deadline) : null;
  const closed = days !== null && days < 0;
  const closing = days !== null && days >= 0 && days <= 14;

  return (
    <Link
      href={`/opportunities/${listing.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface/90 shadow-panel transition-all duration-300 hover:border-cyan/70 hover:bg-surface-raised hover:shadow-[0_15px_40px_rgba(0,0,0,0.4)]"
    >
      {/* Top Directive Pass Header */}
      <div className="flex items-center justify-between border-b border-line bg-base/90 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em]">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan animate-pulse" />
          <span className="text-cyan font-extrabold">{TYPE_LABEL[listing.type] ?? listing.type}</span>
        </div>
        <span className="text-ink-soft">{PLACE_SHORT[listing.locationType] ?? listing.locationType}</span>
      </div>

      <PhotoFrame
        alt=""
        seed={`${listing.org}-${listing.slug}`}
        ratio="banner"
        className="rounded-none border-0 border-b border-line group-hover:scale-102 transition-transform duration-500"
      >
        <span className="glass-chip absolute bottom-2.5 left-4 rounded-md px-3 py-1 font-mono text-xs font-bold uppercase tracking-[0.14em] text-white bg-base/80 backdrop-blur-md border border-white/20">
          {listing.org}
        </span>
      </PhotoFrame>

      <CardBody className="flex h-full flex-col p-6">
        <div className="flex items-start gap-3.5">
          {listing.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={listing.logoUrl}
              alt=""
              loading="lazy"
              className="h-12 w-12 flex-shrink-0 rounded-xl border border-line bg-surface object-cover shadow-panel transition-transform duration-150 group-hover:-rotate-3"
            />
          ) : (
            <span
              aria-hidden
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-cyan/30 bg-cyan/10 font-display text-lg font-bold text-cyan shadow-panel"
            >
              {listing.org.slice(0, 1)}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-extrabold text-white leading-snug tracking-tight transition-colors group-hover:text-cyan">
              {listing.title}
            </h3>
            <p className="mt-1 truncate font-mono text-xs font-bold text-cyan">{listing.org}</p>
          </div>
        </div>

        <p className="mt-3.5 line-clamp-2 text-sm font-medium leading-relaxed text-ink-soft">{listing.blurb}</p>

        <div className="mt-4 flex flex-1 flex-wrap content-end items-end gap-2">
          <Chip size="sm" tone="lime" className="font-bold">
            {listing.location}
          </Chip>
          {listing.compensation ? (
            <Chip tone="tangerine" size="sm" className="font-bold">
              {listing.compensation}
            </Chip>
          ) : (
            <Chip size="sm" tone="ink" className="font-bold">
              On application
            </Chip>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-2 border-t border-line pt-3.5 font-mono text-xs font-bold uppercase tracking-[0.12em]">
          {closed ? (
            <span className="text-ink-muted">Listing closed</span>
          ) : closing ? (
            <span className="text-rose font-extrabold animate-pulse">
              CLOSES IN {days} {days === 1 ? 'DAY' : 'DAYS'}
            </span>
          ) : days !== null ? (
            <span className="text-cyan font-extrabold">CLOSES IN {days} DAYS</span>
          ) : (
            <span className="text-ink-soft">Open until filled</span>
          )}
          <span className="text-amber font-extrabold transition-transform group-hover:translate-x-1">
            DIRECTIVE →
          </span>
        </div>
      </CardBody>
    </Link>
  );
}
