'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { CaretDown, MagnifyingGlass, SignOut } from '@phosphor-icons/react/dist/ssr';
import { Logo } from './logo';
import { ScrollProgress } from './ui/scroll';
import { NotificationBell } from './notification-bell';
import { cn } from '@/lib/utils';

const PRIMARY = [
  { label: 'Community', href: '/community' },
  { label: 'Directory', href: '/directory' },
  { label: 'Events', href: '/events' },
  { label: 'Opportunities', href: '/opportunities' },
  { label: 'Resources', href: '/resources' },
];

const SECONDARY = [
  { label: 'Regional Chapters', href: '/chapters', icon: '🏛️' },
  { label: 'Podcast Series', href: '/podcast', icon: '🎙️' },
  { label: 'Insights & Blog', href: '/blog', icon: '📰' },
  { label: 'Strategic Partners', href: '/sponsors', icon: '🤝' },
  { label: 'Membership Tiers', href: '/membership', icon: '🎖️' },
  { label: 'About Alliance', href: '/about', icon: 'ℹ️' },
  { label: 'Contact Us', href: '/contact', icon: '✉️' },
];

export interface NavSession {
  role: string;
  handle: string;
  name: string;
  initials: string;
}

interface SearchResults {
  members: Array<{ id: string; fullName: string; handle: string | null; jobTitle: string; org: string; field: string; avatarUrl: string | null }>;
  events: Array<{ id: string; title: string; slug: string; category: string; eventDate: string; location: string }>;
  opportunities: Array<{ id: string; title: string; slug: string; org: string; type: string; location: string }>;
  resources: Array<{ id: string; title: string; slug: string; level: string }>;
  posts: Array<{ id: string; title: string; slug: string; category: string }>;
}

export function Navbar({ session }: { session: NavSession | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [lifted, setLifted] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMoreEnter = () => {
    if (moreTimerRef.current) clearTimeout(moreTimerRef.current);
    setMoreOpen(true);
  };

  const handleMoreLeave = () => {
    if (moreTimerRef.current) clearTimeout(moreTimerRef.current);
    moreTimerRef.current = setTimeout(() => {
      setMoreOpen(false);
    }, 250);
  };

  // Close menus on navigation
  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
    setDropdownOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // Lock body scroll on mobile drawer
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  // Handle header scroll elevation
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (y) => {
    setLifted((current) => {
      const next = y > 12;
      return current === next ? current : next;
    });
  });

  // Live search query API trigger
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setResults(null);
      setDropdownOpen(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    setDropdownOpen(true);

    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((res) => res.json())
        .then((data) => {
          const payload = data?.data ?? data;
          if (payload && Array.isArray(payload.members)) {
            setResults(payload as SearchResults);
          }
        })
        .catch(() => undefined)
        .finally(() => setSearching(false));
    }, 120);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [signingOut, setSigningOut] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setUserMenuOpen(false);
    setMobileOpen(false);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      await new Promise((resolve) => setTimeout(resolve, 900));
    } catch {
      // quiet fallback
    } finally {
      window.location.href = '/login?signedOut=1';
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setDropdownOpen(false);
    router.push(`/directory?q=${encodeURIComponent(searchQuery.trim())}`);
  }

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 rounded-none border-x-0 border-t-0 transition-all duration-500',
          lifted
            ? 'border-b border-cyan/30 bg-[#0B0F19]/95 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.6)]'
            : 'border-b border-line/60 bg-[#0B0F19]/80 backdrop-blur-xl shadow-panel',
        )}
      >
        <div className="mx-auto flex h-[72px] max-w-container-max items-center justify-between gap-4 px-4 lg:px-8">
          {/* Left section: Logo */}
          <div className="flex items-center gap-3 xl:gap-4 shrink-0">
            <Link href="/" aria-label="BSA home" className="group flex-shrink-0 transition-transform hover:scale-105">
              <Logo />
            </Link>

            <div className="hidden 2xl:flex items-center gap-2 border-l border-line/60 pl-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan shadow-[0_0_8px_#06b6d4]"></span>
              </span>
              <span className="rounded-full border border-cyan/40 bg-cyan/15 px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-widest text-cyan shadow-sm">
                LIVE
              </span>
            </div>
          </div>

          {/* Center section: Primary Navigation Links */}
          <nav className="hidden items-center gap-1.5 lg:flex">
            {PRIMARY.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'relative rounded-full px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200',
                    active
                      ? 'border border-cyan/60 bg-cyan/15 text-cyan shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                      : 'border border-transparent text-white/80 hover:border-white/20 hover:bg-white/5 hover:text-white',
                  )}
                >
                  {link.label}
                </Link>
              );
            })}

            <div
              ref={moreRef}
              className="relative"
              onMouseEnter={handleMoreEnter}
              onMouseLeave={handleMoreLeave}
            >
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={moreOpen}
                aria-haspopup="true"
                className={cn(
                  'flex items-center gap-1 rounded-full border px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer',
                  moreOpen
                    ? 'border-cyan/60 bg-cyan/15 text-cyan shadow-sm'
                    : 'border-white/15 bg-white/5 text-white/80 hover:border-white/30 hover:bg-white/10 hover:text-white',
                )}
              >
                More
                <span
                  aria-hidden
                  className={cn('text-[0.55rem] transition-transform duration-200', moreOpen && 'rotate-180')}
                >
                  ▼
                </span>
              </button>

              <AnimatePresence>
                {moreOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 top-full pt-2 w-56 z-50 before:absolute before:-top-3 before:inset-x-0 before:h-3 before:content-['']"
                  >
                    <div className="overflow-hidden rounded-2xl border border-cyan/50 bg-[#0B0F19] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.95)] ring-1 ring-white/10">
                      {SECONDARY.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMoreOpen(false)}
                          className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold text-white/90 transition-colors hover:bg-cyan/20 hover:text-cyan group/item"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">{link.icon}</span>
                            <span>{link.label}</span>
                          </div>
                          <span aria-hidden className="font-mono text-xs text-cyan opacity-40 group-hover/item:opacity-100 group-hover/item:translate-x-0.5 transition-all">
                            →
                          </span>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* Right section: Search Bar + Notification Bell + User Account Menu */}
          <div className="hidden flex-shrink-0 items-center gap-3 lg:flex">
            {/* Live Search Bar */}
            <div ref={searchRef} className="relative">
              <form onSubmit={handleSearch} className="relative flex items-center">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => { if (searchQuery.trim()) setDropdownOpen(true); }}
                  placeholder="Search..."
                  className="w-32 xl:w-44 rounded-full border border-cyan/30 bg-[#111726]/90 px-3.5 py-1.5 pl-8 font-sans text-xs font-bold text-white placeholder:text-white/40 focus:w-56 focus:border-cyan focus:shadow-[0_0_18px_rgba(6,182,212,0.3)] focus:outline-none transition-all duration-300"
                />
                <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cyan pointer-events-none" />
              </form>

              {/* Autocomplete Dropdown List */}
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-[calc(100%+10px)] z-50 w-[380px] max-h-[460px] overflow-y-auto rounded-2xl border border-cyan/50 bg-[#0B0F19] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.95)] ring-1 ring-white/10"
                  >
                    {searching && !results && (
                      <div className="p-4 text-center font-mono text-xs font-bold text-cyan animate-pulse">
                        Searching network…
                      </div>
                    )}

                    {results && (
                      <div className="space-y-3">
                        {/* Members */}
                        {results.members.length > 0 && (
                          <div>
                            <p className="px-2 py-1 font-mono text-[10px] font-black uppercase tracking-widest text-cyan">
                              Members ({results.members.length})
                            </p>
                            <div className="space-y-1">
                              {results.members.map((m) => (
                                <Link
                                  key={m.id}
                                  href={m.handle ? `/members/${m.handle}` : '/directory'}
                                  onClick={() => setDropdownOpen(false)}
                                  className="flex items-center gap-3 rounded-xl p-2 text-xs transition-colors hover:bg-cyan/15 hover:text-cyan"
                                >
                                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border border-cyan/40 bg-cyan/20 font-mono text-[10px] font-black text-cyan">
                                    {m.fullName.slice(0, 2).toUpperCase()}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-bold text-white">{m.fullName}</p>
                                    <p className="truncate text-[10px] font-medium text-white/70">{m.jobTitle || m.org}</p>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Events */}
                        {results.events.length > 0 && (
                          <div>
                            <p className="px-2 py-1 font-mono text-[10px] font-black uppercase tracking-widest text-lime">
                              Events ({results.events.length})
                            </p>
                            <div className="space-y-1">
                              {results.events.map((ev) => (
                                <Link
                                  key={ev.id}
                                  href={`/events/${ev.slug}`}
                                  onClick={() => setDropdownOpen(false)}
                                  className="flex items-center gap-2.5 rounded-xl p-2 text-xs transition-colors hover:bg-lime/15 hover:text-lime"
                                >
                                  <span className="text-sm">📅</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-bold text-white">{ev.title}</p>
                                    <p className="truncate text-[10px] font-medium text-white/70">{ev.category} · {ev.location}</p>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Opportunities */}
                        {results.opportunities.length > 0 && (
                          <div>
                            <p className="px-2 py-1 font-mono text-[10px] font-black uppercase tracking-widest text-amber">
                              Opportunities ({results.opportunities.length})
                            </p>
                            <div className="space-y-1">
                              {results.opportunities.map((op) => (
                                <Link
                                  key={op.id}
                                  href={`/opportunities/${op.slug}`}
                                  onClick={() => setDropdownOpen(false)}
                                  className="flex items-center gap-2.5 rounded-xl p-2 text-xs transition-colors hover:bg-amber/15 hover:text-amber"
                                >
                                  <span className="text-sm">💼</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-bold text-white">{op.title}</p>
                                    <p className="truncate text-[10px] font-medium text-white/70">{op.org} · {op.location}</p>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Resources */}
                        {results.resources.length > 0 && (
                          <div>
                            <p className="px-2 py-1 font-mono text-[10px] font-black uppercase tracking-widest text-violet">
                              Resources ({results.resources.length})
                            </p>
                            <div className="space-y-1">
                              {results.resources.map((res) => (
                                <Link
                                  key={res.id}
                                  href={`/resources/${res.slug}`}
                                  onClick={() => setDropdownOpen(false)}
                                  className="flex items-center gap-2.5 rounded-xl p-2 text-xs transition-colors hover:bg-violet/15 hover:text-violet-bright"
                                >
                                  <span className="text-sm">📚</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-bold text-white">{res.title}</p>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Insights */}
                        {results.posts.length > 0 && (
                          <div>
                            <p className="px-2 py-1 font-mono text-[10px] font-black uppercase tracking-widest text-magenta">
                              Insights ({results.posts.length})
                            </p>
                            <div className="space-y-1">
                              {results.posts.map((post) => (
                                <Link
                                  key={post.id}
                                  href={`/blog/${post.slug}`}
                                  onClick={() => setDropdownOpen(false)}
                                  className="flex items-center gap-2.5 rounded-xl p-2 text-xs transition-colors hover:bg-magenta/15 hover:text-magenta"
                                >
                                  <span className="text-sm">📰</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-bold text-white">{post.title}</p>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* No matches */}
                        {results.members.length === 0 &&
                          results.events.length === 0 &&
                          results.opportunities.length === 0 &&
                          results.resources.length === 0 &&
                          results.posts.length === 0 && (
                            <div className="p-3 text-center text-xs font-medium text-white/70">
                              No matching results for "{searchQuery}"
                            </div>
                          )}
                      </div>
                    )}

                    <div className="mt-2.5 border-t border-line/60 pt-2 text-center">
                      <Link
                        href={`/directory?q=${encodeURIComponent(searchQuery)}`}
                        onClick={() => setDropdownOpen(false)}
                        className="block text-xs font-bold text-cyan hover:underline"
                      >
                        View all results in Directory →
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Notification Bell */}
            <NotificationBell />

            {/* User Menu Dropdown */}
            {session ? (
              <div ref={userMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="group flex items-center gap-2.5 rounded-full border border-cyan/40 bg-cyan/15 py-1.5 pl-1.5 pr-3.5 transition-all duration-200 hover:border-cyan hover:bg-cyan/25 shadow-panel"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan/50 bg-cyan/30 font-mono text-[11px] font-black text-white shadow-cyan/20">
                    {session.initials}
                  </span>
                  <span className="font-mono text-xs font-bold text-white transition-colors group-hover:text-cyan">
                    @{session.handle}
                  </span>
                  <span className="text-[9px] text-cyan transition-transform duration-200">
                    {userMenuOpen ? '▲' : '▼'}
                  </span>
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-2xl border border-cyan/50 bg-[#0B0F19] p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.95)] ring-1 ring-white/10"
                    >
                      <div className="border-b border-line/60 px-3 py-2">
                        <p className="text-xs font-bold text-white truncate">{session.name || session.handle}</p>
                        <p className="font-mono text-[10px] font-bold text-cyan truncate">@{session.handle}</p>
                      </div>

                      <div className="py-1.5 space-y-1">
                        <Link
                          href="/dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-white/90 hover:bg-cyan/15 hover:text-cyan transition-colors"
                        >
                          <span>🛡️</span> Member Portal / Dashboard
                        </Link>

                        {session.role === 'ADMIN' && (
                          <Link
                            href="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-violet-bright hover:bg-violet/15 transition-colors"
                          >
                            <span>⚡</span> Admin Control Panel
                          </Link>
                        )}
                      </div>

                      <div className="border-t border-line/60 pt-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false);
                            signOut();
                          }}
                          className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-rose-bright hover:bg-rose/15 transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <SignOut weight="bold" className="h-4 w-4" />
                            Sign Out
                          </span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="group/btn relative inline-flex items-center justify-center overflow-hidden rounded bg-cyan px-4 py-2 font-display text-sm font-bold text-void shadow-glow-cyan transition-all hover:bg-cyan-bright hover:shadow-glow-cyan-lg"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-white/25 opacity-0 group-hover/btn:animate-sheen-sweep group-hover/btn:opacity-100 motion-reduce:hidden"
                  />
                  <span className="relative">Join BSA</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Right Actions: Bell + Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <NotificationBell />
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              className="flex h-10 w-10 items-center justify-center rounded border border-line-bright bg-surface-raised/70"
            >
              <span className="flex flex-col gap-[5px]" aria-hidden>
                <span
                  className={cn(
                    'block h-px w-5 bg-ink transition-transform duration-300',
                    mobileOpen && 'translate-y-[6px] rotate-45',
                  )}
                />
                <span
                  className={cn('block h-px w-5 bg-ink transition-opacity duration-300', mobileOpen && 'opacity-0')}
                />
                <span
                  className={cn(
                    'block h-px w-5 bg-ink transition-transform duration-300',
                    mobileOpen && '-translate-y-[6px] -rotate-45',
                  )}
                />
              </span>
            </button>
          </div>
        </div>

        {/* Reading progress for the page below */}
        <ScrollProgress />
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 top-[72px] z-40 h-[calc(100dvh-72px)] overflow-y-auto bg-base/95 backdrop-blur-2xl border-t border-line/60 lg:hidden"
          >
            <div className="pointer-events-none absolute inset-0 mesh-dots opacity-30" aria-hidden />
            <nav className="relative flex flex-col p-5">
              <form onSubmit={handleSearch} className="relative mb-4 flex items-center">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search members, events, resources…"
                  className="w-full rounded-full border border-line bg-surface-inset px-4 py-2.5 pl-10 font-sans text-sm text-ink placeholder:text-ink-muted focus:border-cyan focus:outline-none"
                />
                <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" />
              </form>

              {[...PRIMARY, ...SECONDARY].map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.035, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    href={link.href}
                    className={cn(
                      'flex items-center justify-between border-b border-line py-4 font-display text-xl font-bold transition-colors',
                      isActive(link.href) ? 'text-cyan' : 'text-ink hover:text-cyan-bright',
                    )}
                  >
                    {link.label}
                    <span aria-hidden className="text-sm opacity-40">
                      →
                    </span>
                  </Link>
                </motion.div>
              ))}

              <div className="mt-7 grid grid-cols-2 gap-3">
                {session ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="rounded-md bg-grad-brand px-4 py-3 text-center text-sm font-semibold text-on-accent"
                    >
                      Dashboard
                    </Link>
                    {session.role === 'ADMIN' ? (
                      <Link
                        href="/admin"
                        className="rounded-md border border-violet/40 bg-violet/10 px-4 py-3 text-center text-sm font-semibold text-violet-bright"
                      >
                        Admin console
                      </Link>
                    ) : (
                      <button
                        onClick={signOut}
                        className="rounded-md border border-line bg-surface-raised px-4 py-3 text-center text-sm font-semibold text-rose"
                      >
                        Sign out
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="rounded-md border border-line bg-surface-raised px-4 py-3 text-center text-sm font-semibold text-ink"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/register"
                      className="rounded-md bg-cyan px-4 py-3 text-center font-display text-sm font-bold text-void shadow-glow-cyan"
                    >
                      Join BSA
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Executive Sign-Out Loading Overlay */}
      <AnimatePresence>
        {signingOut && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0B0F19]/95 backdrop-blur-2xl p-6 text-center"
          >
            <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-cyan/40 bg-surface shadow-glow-cyan">
              <div className="absolute inset-0 rounded-2xl border border-cyan animate-ping opacity-25" />
              <SignOut weight="bold" className="h-10 w-10 text-cyan animate-pulse" />
            </div>

            <div className="flex items-center gap-2 mb-2 font-mono text-xs font-bold uppercase tracking-widest text-cyan">
              <span className="h-2 w-2 rounded-full bg-cyan animate-pulse" />
              SESSION TERMINATION IN PROGRESS
            </div>

            <h3 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
              Signing Out…
            </h3>

            <p className="mt-2 max-w-sm text-sm text-ink-muted leading-relaxed">
              Securing your executive portal session and clearing session credentials safely.
            </p>

            <div className="mt-6 flex items-center gap-2 font-mono text-xs text-cyan/90 bg-cyan/10 border border-cyan/30 px-4 py-2 rounded-full shadow-sm">
              <svg className="h-4 w-4 animate-spin text-cyan" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Terminating session tokens…
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
