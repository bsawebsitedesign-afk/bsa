'use client';

import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Chip, type ChipTone } from '@/components/ui/badge';
import { Input, Label, Select, Toggle } from '@/components/ui/field';
import { Avatar, EmptyState } from '@/components/ui/misc';
import { PhotoHex } from '@/components/ui/photo';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/* Types  */
/* -------------------------------------------------------------------------- */

export interface DirectoryMember {
  userId: string;
  handle: string;
  fullName: string;
  headline: string;
  jobTitle: string;
  /** null when the member has turned off showOrg. */
  org: string | null;
  field: string;
  memberType: string;
  location: string;
  /** Last comma-separated part of the location - country or city-state. */
  region: string;
  avatarUrl: string | null;
  yearsExperience: number | null;
  specialties: string[];
  skills: string[];
  openToOpportunities: boolean;
  openToMentoring: boolean;
  openToSpeaking: boolean;
  lastActiveAt: string;
  joinedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Membership categories - PROVISIONAL, pending client confirmation.  */
/* -------------------------------------------------------------------------- */

interface TypeMeta {
  key: string;
  label: string;
  chip: ChipTone;
  bar: string;
  blurb: string;
}

const MEMBER_TYPES: TypeMeta[] = [
  {
    key: 'PROFESSIONAL',
    label: 'Professional',
    chip: 'cobalt',
    bar: 'bg-violet-deep/18 text-ink',
    blurb: 'In-house practitioner',
  },
  {
    key: 'LEADER',
    label: 'Leader',
    chip: 'violet',
    bar: 'bg-violet/15 text-ink',
    blurb: 'Heads a security function',
  },
  {
    key: 'CONSULTANT',
    label: 'Consultant',
    chip: 'tangerine',
    bar: 'bg-amber/12 text-ink',
    blurb: 'Independent or advisory practice',
  },
  {
    key: 'VENDOR',
    label: 'Vendor',
    chip: 'magenta',
    bar: 'bg-grad-brand-soft text-ink',
    blurb: 'Supplier, integrator or manufacturer',
  },
  {
    key: 'ORGANISATION',
    label: 'Organisation',
    chip: 'lime',
    bar: 'bg-cyan/12 text-ink',
    blurb: 'Institute, association or research body',
  },
];

const TYPE_BY_KEY = new Map(MEMBER_TYPES.map((t) => [t.key, t]));

const SORTS = [
  { key: 'name', label: 'Name A-Z' },
  { key: 'experience', label: 'Most experience' },
  { key: 'active', label: 'Recently active' },
  { key: 'newest', label: 'Newest members' },
] as const;

type SortKey = (typeof SORTS)[number]['key'];

/* -------------------------------------------------------------------------- */

export function DirectoryClient({
  members,
  fields,
  regions,
  initialQuery,
  initialTypes,
  initialMentorsOnly,
}: {
  members: DirectoryMember[];
  fields: string[];
  regions: string[];
  initialQuery: string;
  initialTypes: string[];
  initialMentorsOnly: boolean;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [types, setTypes] = useState<string[]>(initialTypes);
  const [field, setField] = useState('');
  const [region, setRegion] = useState('');
  const [opportunitiesOnly, setOpportunitiesOnly] = useState(false);
  const [mentoringOnly, setMentoringOnly] = useState(initialMentorsOnly);
  const [speakingOnly, setSpeakingOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('name');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [railOpen, setRailOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query);

  /* Press "/" anywhere to jump to the search box. */
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
      event.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* Keep the address bar in step so a filtered view can be sent to a colleague. */
  useEffect(() => {
    const params = new URLSearchParams();
    if (deferredQuery.trim()) params.set('q', deferredQuery.trim());
    if (types.length === 1) params.set('type', types[0]);
    if (mentoringOnly) params.set('mentors', '1');
    const search = params.toString();
    window.history.replaceState(null, '', search ? `?${search}` : window.location.pathname);
  }, [deferredQuery, types, mentoringOnly]);

  /* One lowercase haystack per member so typing stays cheap. */
  const indexed = useMemo(
    () =>
      members.map((member) => ({
        member,
        haystack: [
          member.fullName,
          member.handle,
          member.jobTitle,
          member.headline,
          member.org ?? '',
          member.field,
          member.location,
          ...member.specialties,
          ...member.skills,
        ]
          .join(' ')
          .toLowerCase(),
      })),
    [members],
  );

  const results = useMemo(() => {
    const tokens = deferredQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);

    const filtered = indexed
      .filter(({ member, haystack }) => {
        if (tokens.length && !tokens.every((token) => haystack.includes(token))) return false;
        if (types.length && !types.includes(member.memberType)) return false;
        if (field && member.field !== field) return false;
        if (region && member.region !== region) return false;
        if (opportunitiesOnly && !member.openToOpportunities) return false;
        if (mentoringOnly && !member.openToMentoring) return false;
        if (speakingOnly && !member.openToSpeaking) return false;
        return true;
      })
      .map(({ member }) => member);

    const sorted = [...filtered];
    if (sort === 'experience') {
      sorted.sort(
        (a, b) => (b.yearsExperience ?? -1) - (a.yearsExperience ?? -1) || a.fullName.localeCompare(b.fullName),
      );
    } else if (sort === 'active') {
      sorted.sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt) || a.fullName.localeCompare(b.fullName));
    } else if (sort === 'newest') {
      sorted.sort((a, b) => b.joinedAt.localeCompare(a.joinedAt) || a.fullName.localeCompare(b.fullName));
    } else {
      sorted.sort((a, b) => a.fullName.localeCompare(b.fullName));
    }

    return sorted;
  }, [indexed, deferredQuery, types, field, region, opportunitiesOnly, mentoringOnly, speakingOnly, sort]);

  const toggleType = useCallback((key: string) => {
    setTypes((current) => (current.includes(key) ? current.filter((t) => t !== key) : [...current, key]));
  }, []);

  const resetAll = useCallback(() => {
    setQuery('');
    setTypes([]);
    setField('');
    setRegion('');
    setOpportunitiesOnly(false);
    setMentoringOnly(false);
    setSpeakingOnly(false);
  }, []);

  const activeFilters: { id: string; label: string; clear: () => void }[] = [
    ...(query.trim() ? [{ id: 'q', label: `“${query.trim()}”`, clear: () => setQuery('') }] : []),
    ...types.map((key) => ({
      id: `type-${key}`,
      label: TYPE_BY_KEY.get(key)?.label ?? key,
      clear: () => toggleType(key),
    })),
    ...(field ? [{ id: 'field', label: field, clear: () => setField('') }] : []),
    ...(region ? [{ id: 'region', label: region, clear: () => setRegion('') }] : []),
    ...(opportunitiesOnly
      ? [{ id: 'opps', label: 'Open to opportunities', clear: () => setOpportunitiesOnly(false) }]
      : []),
    ...(mentoringOnly ? [{ id: 'mentor', label: 'Available to mentor', clear: () => setMentoringOnly(false) }] : []),
    ...(speakingOnly ? [{ id: 'speak', label: 'Available to speak', clear: () => setSpeakingOnly(false) }] : []),
  ];

  const filterCount = activeFilters.length;
  const mentorsShown = results.filter((m) => m.openToMentoring).length;
  const speakersShown = results.filter((m) => m.openToSpeaking).length;
  const oppsShown = results.filter((m) => m.openToOpportunities).length;

  /* Disciplines with the most members, used to give the empty state somewhere to go. */
  const fieldSuggestions = useMemo(() => {
    const tally = new Map<string, number>();
    for (const member of members) tally.set(member.field, (tally.get(member.field) ?? 0) + 1);
    return Array.from(tally.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 6);
  }, [members]);

  /* Re-key the results on structural changes so cards re-stagger in. */
  const resultsKey = `${types.join(',')}|${field}|${region}|${opportunitiesOnly}|${mentoringOnly}|${speakingOnly}|${sort}|${view}`;

  return (
    <section className="border-b border-line bg-base py-10 lg:py-14">
      <div className="mx-auto max-w-container-max px-4 lg:px-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4 lg:gap-10">
          {/* ============================== FILTER RAIL ============================== */}
          <div className="lg:col-span-1">
            <button
              type="button"
              onClick={() => setRailOpen((open) => !open)}
              aria-expanded={railOpen}
              aria-controls="directory-filters"
              className="mb-4 flex w-full items-center justify-between border border-line bg-surface px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] shadow-panel panel-hover lg:hidden"
            >
              <span>
                Filters
                {filterCount > 0 && (
                  <span className="ml-2 inline-flex h-5 w-5 items-center justify-center border border-line bg-grad-brand-soft text-[10px] text-ink">
                    {filterCount}
                  </span>
                )}
              </span>
              <span aria-hidden>{railOpen ? '▲' : '▼'}</span>
            </button>

            <aside
              id="directory-filters"
              aria-label="Directory filters"
              className={cn('lg:sticky lg:top-24 lg:block', railOpen ? 'block' : 'hidden')}
            >
              <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md shadow-panel-lg overflow-hidden">
                {/* Panel Header */}
                <div className="flex items-center justify-between border-b border-line bg-surface-inset/80 px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎛️</span>
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink">Refine Directory</span>
                  </div>
                  <span className="rounded-full bg-cyan/20 border border-cyan/40 px-2.5 py-0.5 font-mono text-xs font-bold text-cyan">
                    {results.length} members
                  </span>
                </div>

                <div className="space-y-6 p-5">
                  {/* Search */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="directory-search" className="text-xs font-semibold text-ink-muted">
                        Search Directory
                      </label>
                      <span className="rounded bg-surface-inset px-1.5 py-0.5 font-mono text-[10px] text-ink-muted border border-line">
                        press /
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        id="directory-search"
                        ref={searchRef}
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search name, CISO, Lagos, Cloud..."
                        autoComplete="off"
                        className="rounded-xl border-line bg-surface-inset/60 pl-3 pr-3 py-2 text-sm focus:border-cyan focus:ring-1 focus:ring-cyan"
                      />
                    </div>
                    <p className="mt-2 text-[11px] leading-snug text-ink-muted/80">
                      Search across names, titles, companies, disciplines, and technical skills.
                    </p>
                  </div>

                  {/* Membership category */}
                  <div className="border-t border-dashed border-line/60 pt-5">
                    <p
                      className="mb-3 font-mono text-[11px] font-bold uppercase tracking-wider text-cyan"
                      id="type-group-label"
                    >
                      Membership Category
                    </p>
                    <div className="flex flex-wrap gap-2" role="group" aria-labelledby="type-group-label">
                      {MEMBER_TYPES.map((type) => {
                        const on = types.includes(type.key);
                        return (
                          <button
                            key={type.key}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggleType(type.key)}
                            title={type.blurb}
                            className={cn(
                              'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 border',
                              on
                                ? 'border-cyan bg-cyan/20 text-cyan shadow-sm font-bold'
                                : 'border-line/70 bg-surface-inset/40 text-ink-muted hover:border-line hover:text-white',
                            )}
                          >
                            {type.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Discipline */}
                  <div className="border-t border-dashed border-line/60 pt-5">
                    <label htmlFor="directory-field" className="block mb-2 text-xs font-semibold text-ink-muted">
                      Discipline & Specialty
                    </label>
                    <Select
                      id="directory-field"
                      value={field}
                      onChange={(event) => setField(event.target.value)}
                      className="rounded-xl border-line bg-surface-inset/60 text-sm"
                    >
                      <option value="">All disciplines</option>
                      {fields.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Region */}
                  <div className="border-t border-dashed border-line/60 pt-5">
                    <label htmlFor="directory-region" className="block mb-2 text-xs font-semibold text-ink-muted">
                      Region / Location
                    </label>
                    <Select
                      id="directory-region"
                      value={region}
                      onChange={(event) => setRegion(event.target.value)}
                      className="rounded-xl border-line bg-surface-inset/60 text-sm"
                    >
                      <option value="">Everywhere</option>
                      {regions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Availability */}
                  <div className="space-y-3 border-t border-dashed border-line/60 pt-5">
                    <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-cyan">
                      Availability
                    </p>
                    <div className="space-y-2">
                      <Toggle
                        checked={opportunitiesOnly}
                        onChange={setOpportunitiesOnly}
                        label="Open to opportunities"
                        description="Considering roles, partnerships or client work."
                      />
                      <Toggle
                        checked={mentoringOnly}
                        onChange={setMentoringOnly}
                        label="Available to mentor"
                        description="Willing to advise members one-to-one."
                      />
                      <Toggle
                        checked={speakingOnly}
                        onChange={setSpeakingOnly}
                        label="Available to speak"
                        description="Open to panels, briefings & keynotes."
                      />
                    </div>
                  </div>

                  {/* Sort */}
                  <div className="border-t border-dashed border-line/60 pt-5">
                    <label htmlFor="directory-sort" className="block mb-2 text-xs font-semibold text-ink-muted">
                      Sort Results By
                    </label>
                    <Select
                      id="directory-sort"
                      value={sort}
                      onChange={(event) => setSort(event.target.value as SortKey)}
                      className="rounded-xl border-line bg-surface-inset/60 text-sm"
                    >
                      {SORTS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {filterCount > 0 && (
                    <Button tone="magenta" size="sm" className="w-full rounded-xl py-2.5 text-sm font-semibold" onClick={resetAll}>
                      Clear {filterCount} active filter{filterCount === 1 ? '' : 's'} ↺
                    </Button>
                  )}
                </div>
              </div>

              <p className="mt-4 border border-dashed border-line bg-surface-inset/50 p-3 text-[11px] leading-relaxed text-ink-muted">
                Members control what is visible. Only those who chose to be listed appear here, and contact details show
                up only where the member published them.
              </p>
            </aside>
          </div>

          {/* ============================== RESULTS ============================== */}
          <div className="lg:col-span-3">
            <div className="mb-5 flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p aria-live="polite" className="font-display text-2xl leading-none sm:text-3xl">
                  {results.length} {results.length === 1 ? 'member' : 'members'}
                </p>
                <p className="mt-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                  {filterCount > 0 ? `filtered from ${members.length}` : 'listed in the directory'} · {mentorsShown}{' '}
                  mentoring · {speakersShown} speaking · {oppsShown} open to opportunities
                </p>
              </div>

              <div className="flex border border-line bg-surface shadow-panel" role="group" aria-label="Result layout">
                {(['grid', 'list'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={view === option}
                    onClick={() => setView(option)}
                    className={cn(
                      'inline-flex min-h-[44px] items-center px-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition-colors',
                      view === option ? 'bg-surface-inset text-ink' : 'text-ink-muted hover:bg-surface-inset',
                    )}
                  >
                    {option === 'grid' ? 'Cards' : 'Compact'}
                  </button>
                ))}
              </div>
            </div>

            {activeFilters.length > 0 && (
              <div className="mb-5 flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                  Active:
                </span>
                {activeFilters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={filter.clear}
                    className="inline-flex items-center gap-1.5 border border-line bg-cyan/12 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-grad-brand-soft hover:text-ink"
                  >
                    {filter.label}
                    <span aria-hidden></span>
                    <span className="sr-only">Remove filter</span>
                  </button>
                ))}
              </div>
            )}

            {members.length === 0 ? (
              <EmptyState
                title="The directory has no listed members yet"
                blurb="Nobody has opted into directory listing so far. Membership profiles appear here as soon as they are switched on."
                action={
                  <Button href="/membership" tone="magenta">
                    Become a member
                  </Button>
                }
              />
            ) : results.length === 0 ? (
              <EmptyState
                title="Nothing matches those filters"
                blurb="Try a broader search. Specialties and skills are indexed too, so a term like “crisis management” often works better than a job title."
                action={
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {fieldSuggestions.map(([name, count]) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            resetAll();
                            setField(name);
                          }}
                          className="border border-line bg-surface px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] shadow-panel transition-colors hover:bg-cyan/12"
                        >
                          {name} · {count}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button tone="ink" size="sm" onClick={resetAll}>
                        Clear all filters
                      </Button>
                      <Button href="/contact" tone="paper" size="sm">
                        Ask us to make an introduction
                      </Button>
                    </div>
                  </div>
                }
              />
            ) : view === 'grid' ? (
              <div key={resultsKey} className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((member, i) => (
                  <MemberCard key={member.handle} member={member} index={i} />
                ))}
              </div>
            ) : (
              <ul key={resultsKey} className="space-y-2">
                {results.map((member, i) => (
                  <MemberRow key={member.handle} member={member} index={i} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Availability markers  */
/* -------------------------------------------------------------------------- */

function Availability({ member, size = 'sm' }: { member: DirectoryMember; size?: 'sm' | 'md' }) {
  const markers: { label: string; tone: ChipTone }[] = [];
  if (member.openToOpportunities) markers.push({ label: 'Opportunities', tone: 'lime' });
  if (member.openToMentoring) markers.push({ label: 'Mentoring', tone: 'violet' });
  if (member.openToSpeaking) markers.push({ label: 'Speaking', tone: 'tangerine' });

  if (markers.length === 0) {
    return (
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">Listed only</span>
    );
  }

  return (
    <>
      {markers.map((marker) => (
        <Chip key={marker.label} tone={marker.tone} size={size}>
          {marker.label}
        </Chip>
      ))}
    </>
  );
}

function roleLine(member: DirectoryMember): string {
  const title = member.jobTitle || member.headline;
  return member.org ? `${title} at ${member.org}` : title;
}

/* -------------------------------------------------------------------------- */
/* Card view  */
/* -------------------------------------------------------------------------- */

function MemberCard({ member, index }: { member: DirectoryMember; index: number }) {
  const type = TYPE_BY_KEY.get(member.memberType);
  const specialties = member.specialties.slice(0, 3);
  const extra = Math.max(0, member.specialties.length - specialties.length);

  return (
    // Not a <Link> wrapping the card: the Chat button inside is a link too, and
    // an anchor inside an anchor is invalid HTML the parser unnests - so the
    // client tree never matched the server tree, hydration failed, and React
    // threw the whole server render away and rebuilt the page on the client.
    // The card is a plain box with a stretched overlay link for the pass, which
    // is the same whole-card hit area with one anchor per destination.
    <div
      className="group relative flex h-full animate-fade-up flex-col overflow-hidden rounded-2xl border border-line bg-surface/90 shadow-panel transition-all duration-300 hover:border-cyan/70 hover:bg-surface-raised"
      style={{ animationDelay: `${Math.min(index, 11) * 35}ms` }}
    >
      <Link
        href={`/members/${member.handle}`}
        aria-label={`${member.fullName} - open security pass`}
        className="absolute inset-0 z-0 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
      />

      {/* Top Security ID Pass Lanyard Header */}
      <div className="flex items-center justify-between border-b border-line bg-base/90 px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.14em]">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan animate-pulse" />
          <span className="text-cyan font-extrabold">SECURITY PASS</span>
        </div>
        <span className="text-ink-soft">#{member.handle.toUpperCase().slice(0, 7)}</span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3.5">
          <PhotoHex src={member.avatarUrl} name={member.fullName} size="lg" ring />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-extrabold text-ink group-hover:text-cyan transition-colors leading-snug">
              {member.fullName}
            </h3>
            <p className="font-mono text-xs font-bold text-cyan">@{member.handle}</p>
            <p className="mt-1 text-sm font-semibold text-ink-soft leading-snug">
              {member.jobTitle || member.headline}
            </p>
            <p className="mt-1 text-xs font-medium text-ink-muted">
              {member.org ? `${member.org} · ` : ''}
              {member.location}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-1 font-mono text-xs font-bold uppercase tracking-[0.1em] text-cyan">
          <p className="truncate font-semibold text-ink-soft">🛡️ Field: {member.field}</p>
        </div>

        {specialties.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {specialties.map((specialty) => (
              <Chip key={specialty} size="sm" tone="ink">
                {specialty}
              </Chip>
            ))}
            {extra > 0 && <span className="font-mono text-xs font-bold text-ink-muted">+{extra}</span>}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-2 border-t border-line pt-3.5">
          <div className="flex min-w-0 flex-wrap gap-1.5">
            <Availability member={member} />
          </div>
          <div className="flex items-center gap-2">
            {/* Above the stretched link, so it keeps its own destination. */}
            <Link
              href={`/community?dm=${member.userId}`}
              className="relative z-10 inline-flex min-h-[44px] items-center rounded border border-cyan/40 bg-cyan/20 px-2.5 font-mono text-[10px] font-bold text-cyan transition-colors hover:bg-cyan hover:text-white"
            >
              💬 Chat
            </Link>
            <span
              aria-hidden
              className="flex-shrink-0 font-mono text-xs font-bold uppercase tracking-[0.12em] text-cyan transition-transform group-hover:translate-x-1"
            >
              Pass →
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Compact view  */
/* -------------------------------------------------------------------------- */

function MemberRow({ member, index }: { member: DirectoryMember; index: number }) {
  const type = TYPE_BY_KEY.get(member.memberType);

  return (
    <li className="animate-fade-up" style={{ animationDelay: `${Math.min(index, 16) * 22}ms` }}>
      <Link
        href={`/members/${member.handle}`}
        className="group flex flex-wrap items-center gap-x-4 gap-y-2 border border-line bg-surface p-3 shadow-panel panel-hover"
      >
        <Avatar name={member.fullName} src={member.avatarUrl} size="sm" />

        <span className="min-w-[9rem] flex-1 basis-48">
          <span className="flex items-baseline gap-2">
            <span className="truncate text-sm font-bold leading-tight transition-colors group-hover:text-violet-bright">
              {member.fullName}
            </span>
            <span className="truncate font-mono text-[10px] font-bold text-ink-muted">@{member.handle}</span>
          </span>
          <span className="mt-0.5 block truncate text-xs text-ink-soft">{roleLine(member)}</span>
        </span>

        <span className="hidden basis-40 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted md:block">
          <span className="block truncate">{member.field}</span>
          <span className="block truncate text-ink-muted">{member.location}</span>
        </span>

        <span className="hidden w-14 flex-shrink-0 text-right font-display text-lg leading-none lg:block">
          {member.yearsExperience ?? '-'}
          <span className="ml-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-muted">yr</span>
        </span>

        <span className="flex flex-shrink-0 flex-wrap items-center gap-1.5">
          <Chip tone={type?.chip ?? 'paper'} size="sm">
            {type?.label ?? member.memberType}
          </Chip>
          <Availability member={member} />
        </span>
      </Link>
    </li>
  );
}
