'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { RevealGroup, RevealItem } from '@/components/ui/reveal';
import { Avatar, EmptyState } from '@/components/ui/misc';
import { PhotoFrame } from '@/components/ui/photo';
import { cn, formatDate } from '@/lib/utils';

export interface FeedPost {
  slug: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  imageUrl: string | null;
  authorName: string;
  authorTitle: string;
  authorAvatar: string | null;
  readTimeMinutes: number;
  publishedAt: string;
  isNew: boolean;
}

type SortKey = 'newest' | 'oldest' | 'quick' | 'deep';

const SORT_LABEL: Record<SortKey, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  quick: 'Shortest read',
  deep: 'Longest read',
};

const CATEGORY_STYLES: Record<string, { badge: string; text: string }> = {
  'Field Notes': { badge: 'border-lime/40 bg-lime/15 text-lime', text: 'text-lime' },
  Careers: { badge: 'border-rose/40 bg-rose/15 text-rose', text: 'text-rose' },
  Writeups: { badge: 'border-violet/40 bg-violet/15 text-violet-bright', text: 'text-violet-bright' },
  Chapters: { badge: 'border-amber/40 bg-amber/15 text-amber', text: 'text-amber' },
  Technology: { badge: 'border-cyan/40 bg-cyan/15 text-cyan', text: 'text-cyan' },
  Leadership: { badge: 'border-blue/40 bg-blue/15 text-blue', text: 'text-blue' },
};

function getCategoryStyle(category: string) {
  return (
    CATEGORY_STYLES[category] ?? {
      badge: 'border-cyan/40 bg-cyan/15 text-cyan',
      text: 'text-cyan',
    }
  );
}

export function BlogClient({
  posts,
  initialCategory = null,
  initialTag = null,
}: {
  posts: FeedPost[];
  initialCategory?: string | null;
  initialTag?: string | null;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(initialCategory);
  const [tag, setTag] = useState<string | null>(initialTag);
  const [sort, setSort] = useState<SortKey>('newest');
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" jumps to search
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || target?.isContentEditable) return;
      event.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const post of posts) map.set(post.category, (map.get(post.category) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [posts]);

  const tags = useMemo(() => {
    const map = new Map<string, number>();
    for (const post of posts) {
      if (category && post.category !== category) continue;
      for (const t of post.tags) map.set(t, (map.get(t) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [posts, category]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const filtered = posts.filter((post) => {
      if (category && post.category !== category) return false;
      if (tag && !post.tags.includes(tag)) return false;
      if (!needle) return true;
      return (
        post.title.toLowerCase().includes(needle) ||
        post.summary.toLowerCase().includes(needle) ||
        post.authorName.toLowerCase().includes(needle) ||
        post.category.toLowerCase().includes(needle) ||
        post.tags.some((t) => t.toLowerCase().includes(needle))
      );
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
        case 'quick':
          return a.readTimeMinutes - b.readTimeMinutes || a.title.localeCompare(b.title);
        case 'deep':
          return b.readTimeMinutes - a.readTimeMinutes || a.title.localeCompare(b.title);
        default:
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }
    });
    return sorted;
  }, [posts, query, category, tag, sort]);

  const filtersActive = Boolean(query || category || tag || sort !== 'newest');
  const minutesShown = visible.reduce((sum, post) => sum + post.readTimeMinutes, 0);

  function resetAll() {
    setQuery('');
    setCategory(null);
    setTag(null);
    setSort('newest');
  }

  return (
    <section id="all-posts" className="border-b border-white/10 bg-[#070A12] py-14 lg:py-20">
      <div className="mx-auto max-w-container-max px-4 lg:px-10 space-y-8">
        {/* ===============================================================
            TELEMETRY FILTER HUD
        =============================================================== */}
        <div className="rounded-3xl border border-white/10 bg-[#0B0F19] p-6 shadow-2xl ring-1 ring-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4 mb-5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan animate-pulse" />
              <span className="font-mono text-xs font-black uppercase tracking-widest text-cyan">
                SECURITY INTELLIGENCE REGISTRY
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-xs font-bold text-slate-300">
                {visible.length} of {posts.length} DISPATCHES
              </span>
              <span className="rounded-full border border-cyan/40 bg-cyan/15 px-3 py-1 font-mono text-xs font-bold text-cyan">
                {minutesShown} MIN TOTAL
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Search & Sort Row */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <input
                  id="feed-search"
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search intelligence dispatches, keywords, authors, tags…"
                  className="w-full rounded-xl border border-white/15 bg-[#111726] px-4 py-3 text-sm text-white placeholder-slate-400 shadow-inner outline-none transition-all focus:border-cyan focus:ring-1 focus:ring-cyan"
                  style={{ color: '#FFFFFF' }}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 rounded border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-400 hidden sm:block">
                  PRESS /
                </span>
              </div>

              <div className="w-full lg:w-56">
                <select
                  id="feed-sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="w-full rounded-xl border border-white/15 bg-[#111726] px-4 py-3 font-mono text-xs font-bold text-white shadow-inner outline-none transition-all focus:border-cyan focus:ring-1 focus:ring-cyan"
                  style={{ color: '#FFFFFF' }}
                >
                  {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
                    <option key={key} value={key} className="bg-[#0B0F19] text-white">
                      {SORT_LABEL[key]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCategory(null);
                  setTag(null);
                }}
                className={cn(
                  'rounded-xl px-3.5 py-1.5 font-mono text-xs font-black uppercase tracking-wider transition-all',
                  category === null
                    ? 'border border-cyan/60 bg-cyan text-black shadow-lg shadow-cyan/20 scale-105'
                    : 'border border-white/15 bg-[#111726] text-slate-200 hover:border-cyan/50 hover:text-white',
                )}
              >
                All Topics ({posts.length})
              </button>
              {categories.map(([key, count]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setCategory(category === key ? null : key);
                    setTag(null);
                  }}
                  className={cn(
                    'rounded-xl px-3.5 py-1.5 font-mono text-xs font-black uppercase tracking-wider transition-all',
                    category === key
                      ? 'border border-cyan/60 bg-cyan text-black shadow-lg shadow-cyan/20 scale-105'
                      : 'border border-white/15 bg-[#111726] text-slate-200 hover:border-cyan/50 hover:text-white',
                  )}
                >
                  {key} ({count})
                </button>
              ))}
            </div>

            {/* Tag Pills & Reset Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-white/10 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                  TAGS:
                </span>
                <button
                  type="button"
                  onClick={() => setTag(null)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 font-mono text-xs font-semibold transition-all',
                    tag === null
                      ? 'border border-cyan/50 bg-cyan/20 text-cyan font-bold'
                      : 'border border-white/10 bg-white/5 text-slate-300 hover:border-cyan/40 hover:text-white',
                  )}
                >
                  All Tags
                </button>
                {tags.map(([key, count]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTag(tag === key ? null : key)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 font-mono text-xs font-semibold transition-all',
                      tag === key
                        ? 'border border-cyan/50 bg-cyan/20 text-cyan font-bold'
                        : 'border border-white/10 bg-white/5 text-slate-300 hover:border-cyan/40 hover:text-white',
                    )}
                  >
                    #{key} ({count})
                  </button>
                ))}
              </div>

              {filtersActive && (
                <button
                  type="button"
                  onClick={resetAll}
                  className="rounded-xl border border-rose/50 bg-rose/15 px-3 py-1 font-mono text-xs font-black uppercase tracking-wider text-rose hover:bg-rose hover:text-white transition-all self-start sm:self-auto"
                >
                  Reset Filters ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ===============================================================
            GRID OF CARDS
        =============================================================== */}
        <div>
          {visible.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#0B0F19] p-12 text-center shadow-2xl">
              <p className="font-display text-2xl font-bold text-white mb-2" style={{ color: '#FFFFFF' }}>
                No intelligence matching your query
              </p>
              <p className="text-slate-300 text-sm max-w-md mx-auto mb-6">
                No published briefs match “{query}”. Try adjusting your filters or searching another keyword.
              </p>
              <button
                type="button"
                onClick={resetAll}
                className="rounded-xl border border-cyan/50 bg-cyan px-5 py-2.5 font-mono text-xs font-black uppercase tracking-wider text-black transition-all hover:bg-white hover:scale-105"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <RevealGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visible.map((post) => {
                const catStyle = getCategoryStyle(post.category);

                return (
                  <RevealItem key={post.slug} className="h-full">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group flex flex-col justify-between h-full rounded-2xl border border-white/10 bg-[#0B0F19] hover:border-cyan/50 hover:shadow-[0_20px_50px_rgba(0,0,0,0.9)] hover:-translate-y-1.5 transition-all overflow-hidden ring-1 ring-white/5"
                    >
                      <div>
                        {/* Cover Image */}
                        <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-white/10 bg-[#111726]">
                          <PhotoFrame src={post.imageUrl} alt="" seed={post.slug} ratio="wide" />
                          <div className="absolute top-3 left-3 flex items-center gap-2">
                            <span
                              className={cn(
                                'rounded-full border px-3 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider shadow-md backdrop-blur-md',
                                catStyle.badge,
                              )}
                            >
                              {post.category}
                            </span>
                            {post.isNew && (
                              <span className="rounded-full border border-lime/50 bg-lime/20 px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-widest text-lime shadow-md">
                                NEW
                              </span>
                            )}
                          </div>
                          <span className="absolute bottom-3 right-3 rounded-md border border-black/40 bg-black/75 px-2 py-0.5 font-mono text-[10px] font-bold text-white backdrop-blur-md">
                            {post.readTimeMinutes} min read
                          </span>
                        </div>

                        {/* Card Content */}
                        <div className="p-6">
                          <h3
                            className="font-display text-lg sm:text-xl font-bold text-white leading-snug group-hover:text-cyan transition-colors line-clamp-2"
                            style={{ color: '#FFFFFF' }}
                          >
                            {post.title}
                          </h3>

                          <p
                            className="mt-2.5 text-xs sm:text-sm font-normal leading-relaxed text-slate-300 line-clamp-3"
                            style={{ color: '#CBD5E1' }}
                          >
                            {post.summary}
                          </p>

                          {post.tags.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-1.5">
                              {post.tags.slice(0, 3).map((t) => (
                                <span
                                  key={t}
                                  className="rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-300"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer with Author and Read Arrow */}
                      <div className="border-t border-white/10 bg-[#111726]/60 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={post.authorName} src={post.authorAvatar} size="sm" />
                          <div className="min-w-0">
                            <span
                              className="block truncate font-mono text-xs font-bold text-white uppercase tracking-wider"
                              style={{ color: '#FFFFFF' }}
                            >
                              {post.authorName}
                            </span>
                            <span className="block truncate font-mono text-[10px] text-slate-400">
                              {formatDate(post.publishedAt)}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-black uppercase tracking-wider text-cyan flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          <span>Read</span>
                          <span>→</span>
                        </span>
                      </div>
                    </Link>
                  </RevealItem>
                );
              })}
            </RevealGroup>
          )}
        </div>

        {/* ===============================================================
            AUTHORS BANNER
        =============================================================== */}
        <div className="rounded-3xl border border-cyan/40 bg-cyan/10 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="font-display text-lg sm:text-xl font-black text-white" style={{ color: '#FFFFFF' }}>
              Have First-Hand Operational Experience to Share?
            </h4>
            <p className="text-xs sm:text-sm text-slate-200 max-w-xl" style={{ color: '#E2E8F0' }}>
              Every piece on BSA is written by real practitioners. Submit your incident post-mortem or architectural review to our editorial desk.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan/60 bg-cyan px-6 py-3 font-mono text-xs font-black uppercase tracking-wider text-black transition-all hover:bg-white hover:scale-105 shadow-xl flex-shrink-0"
          >
            Submit A Proposal →
          </Link>
        </div>
      </div>
    </section>
  );
}
