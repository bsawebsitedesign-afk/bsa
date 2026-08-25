import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Chip, LiveDot } from '@/components/ui/badge';
import { Marquee } from '@/components/ui/marquee';
import { Reveal } from '@/components/ui/reveal';
import { Counter } from '@/components/ui/counter';
import { Avatar, Sticker } from '@/components/ui/misc';
import { relativeTime } from '@/lib/utils';
import { LoginClient } from './login-client';

/** Session state and the ?reason= notice both change per request. */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your Business Security Alliance member account.',
  robots: { index: false, follow: true },
};

/**
 * Only same-origin paths are honoured, so a crafted ?redirect= cannot bounce
 * someone to another site immediately after they hand over a password.
 */
function safeRedirect(value?: string | string[]): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null;
  if (raw.startsWith('/login') || raw.startsWith('/register')) return null;
  return raw;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string | string[]; reason?: string | string[] };
}) {
  const redirectTo = safeRedirect(searchParams.redirect);
  const reason = Array.isArray(searchParams.reason) ? searchParams.reason[0] : searchParams.reason;

  let memberCount = 0;
  let chapterCount = 0;
  let nextEvent: any = null;
  let recentMembers: any[] = [];

  try {
    const fetched = await Promise.all([
      prisma.memberProfile.count({
        where: { user: { role: 'MEMBER', status: 'ACTIVE' } },
      }),
      prisma.chapter.count({ where: { isActive: true } }),
      prisma.event.findFirst({
        where: { status: { in: ['UPCOMING', 'LIVE'] } },
        orderBy: { eventDate: 'asc' },
        select: { slug: true, title: true, eventDate: true, location: true, category: true },
      }),
      prisma.memberProfile.findMany({
        where: {
          privacy: { isPublic: true, searchableInDirectory: true },
          user: { role: 'MEMBER', status: 'ACTIVE' },
        },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: { handle: true, fullName: true, avatarUrl: true, jobTitle: true, org: true },
      }),
    ]);
    memberCount = fetched[0];
    chapterCount = fetched[1];
    nextEvent = fetched[2];
    recentMembers = fetched[3];
  } catch (err) {
    console.error('Login Page DB Error:', err);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070A11] text-white py-12 lg:py-16">
      {/* Dynamic Cyber Orbs & Mesh Background */}
      <div className="pointer-events-none absolute inset-0 mesh-grid opacity-30" aria-hidden />
      <div className="pointer-events-none absolute -left-20 top-1/4 h-96 w-96 rounded-full bg-cyan/15 blur-[120px]" />
      <div className="pointer-events-none absolute -right-20 top-1/3 h-96 w-96 rounded-full bg-violet/20 blur-[120px]" />
      <div className="pointer-events-none absolute left-1/3 bottom-10 h-80 w-80 rounded-full bg-lime/10 blur-[100px]" />

      <div className="relative mx-auto grid max-w-container-max grid-cols-1 items-start gap-10 px-4 lg:grid-cols-12 lg:gap-14 lg:px-8">
        {/* Left Column — Login Form */}
        <div className="lg:col-span-6 space-y-6">
          <Reveal direction="up">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan/40 bg-cyan/10 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest text-cyan shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan"></span>
              </span>
              MEMBER PORTAL AUTHENTICATION
            </div>

            <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
              Welcome Back to <br />
              <span className="bg-gradient-to-r from-white via-cyan-bright to-violet-bright bg-clip-text text-transparent">
                Business Security Alliance.
              </span>
            </h1>
            <p className="mt-3 max-w-lg text-sm sm:text-base leading-relaxed text-white font-normal" style={{ color: '#FFFFFF' }}>
              Sign in to access your verified member directory, private chapter networks, strategic security insights, and exclusive industry summits.
            </p>
          </Reveal>

          {reason === 'expired' && (
            <Reveal direction="up" delay={0.05}>
              <div role="status" className="rounded-2xl border border-amber/40 bg-amber/10 p-4 backdrop-blur-md shadow-lg">
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-amber">
                  ⏰ SESSION EXPIRED
                </p>
                <p className="mt-1 text-xs text-white/80">
                  Your session expired due to inactivity. Please sign in again to continue your active session.
                </p>
              </div>
            </Reveal>
          )}

          <Reveal direction="up" delay={0.1}>
            <LoginClient redirectTo={redirectTo} />
          </Reveal>

          <Reveal direction="up" delay={0.15}>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0D121F]/60 p-4 backdrop-blur-xl">
              <p className="text-xs font-semibold text-white/70">
                Not a member of the Alliance yet?
              </p>
              <div className="flex items-center gap-3">
                <Link href="/register" className="rounded-xl border border-cyan/40 bg-cyan/15 px-3.5 py-2 font-mono text-xs font-bold text-cyan transition-all hover:bg-cyan/25 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                  Apply for Membership →
                </Link>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Right Column — Live Alliance Intelligence Showcase */}
        <div className="lg:col-span-6 space-y-6">
          <Reveal direction="left" delay={0.12}>
            <div className="relative overflow-hidden rounded-3xl border border-violet/30 bg-[#0B0F19]/90 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_0_50px_rgba(167,139,250,0.15)] space-y-6">
              <Sticker tone="magenta" rotate={-3} className="absolute right-3 top-3 z-20 text-[10px] shadow-lg">
                VERIFIED EXECUTIVE NETWORK
              </Sticker>

              {/* Panel Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="font-mono text-[10px] font-black uppercase tracking-widest text-violet-bright">
                    INSIDE THE ALLIANCE
                  </p>
                  <p className="text-lg font-bold text-white mt-0.5">Live Industry Ecosystem</p>
                </div>
                <span className="rounded-full border border-lime/40 bg-lime/15 px-3 py-1 font-mono text-[10px] font-bold text-lime">
                  ● ACTIVE
                </span>
              </div>

              {/* Live Counters */}
              <div className="grid grid-cols-2 gap-4">
                <div className="group rounded-2xl border border-cyan/30 bg-[#111726]/80 p-5 transition-all hover:border-cyan hover:shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                  <div className="font-display text-4xl font-black text-cyan">
                    <Counter to={memberCount} />
                  </div>
                  <div className="mt-2 font-mono text-[10px] font-black uppercase tracking-wider text-white/70">
                    Security Leaders
                  </div>
                  <p className="mt-1 text-[11px] font-medium text-white/40">Verified Industry Chiefs</p>
                </div>

                <div className="group rounded-2xl border border-lime/30 bg-[#111726]/80 p-5 transition-all hover:border-lime hover:shadow-[0_0_20px_rgba(132,204,22,0.25)]">
                  <div className="font-display text-4xl font-black text-lime">
                    <Counter to={chapterCount} />
                  </div>
                  <div className="mt-2 font-mono text-[10px] font-black uppercase tracking-wider text-white/70">
                    Global Chapters
                  </div>
                  <p className="mt-1 text-[11px] font-medium text-white/40">Regional Security Hubs</p>
                </div>
              </div>

              {/* Next Event Spotlight */}
              {nextEvent && (
                <div className="rounded-2xl border border-violet/40 bg-violet/10 p-5 backdrop-blur-md transition-all hover:border-violet hover:bg-violet/15">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-[10px] font-black uppercase tracking-widest text-violet-bright">
                      UPCOMING SUMMIT SPOTLIGHT
                    </span>
                    <span className="rounded-full bg-violet/30 px-2 py-0.5 font-mono text-[9px] font-bold text-violet-bright">
                      {nextEvent.category || 'EVENT'}
                    </span>
                  </div>
                  <Link href={`/events/${nextEvent.slug}`} className="group block">
                    <p className="font-display text-xl font-bold text-white transition-colors group-hover:text-cyan">
                      {nextEvent.title}
                    </p>
                    <p className="mt-1.5 font-mono text-xs font-semibold text-white/60 flex items-center gap-2">
                      <span>📍 {nextEvent.location}</span>
                      <span>·</span>
                      <span className="text-cyan font-bold">{relativeTime(nextEvent.eventDate)}</span>
                    </p>
                  </Link>
                </div>
              )}

              {/* Recently Joined Members */}
              <div className="rounded-2xl border border-white/10 bg-[#111726]/80 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] font-black uppercase tracking-widest text-cyan">
                    RECENTLY JOINED MEMBERS
                  </p>
                  <span className="flex items-center gap-1 font-mono text-[10px] text-lime">
                    <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse" />
                    LIVE
                  </span>
                </div>

                {recentMembers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-[#0B0F19]/60 p-4 text-center space-y-1">
                    <p className="text-xs font-semibold text-white/80">Membership applications are currently open</p>
                    <p className="text-[11px] text-white/50">Verified practitioner profiles will appear here as they are activated.</p>
                  </div>
                ) : (
                  <div className="space-y-3 divide-y divide-white/5">
                    {recentMembers.map((member) => (
                      <div key={member.handle} className="flex items-center justify-between pt-2.5 first:pt-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative">
                            <Avatar name={member.fullName} src={member.avatarUrl} size="md" />
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0B0F19] bg-lime shadow-[0_0_8px_#84cc16]" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-white">{member.fullName}</p>
                            <p className="truncate font-mono text-[10px] font-medium text-white/60">
                              {member.jobTitle} · {member.org}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-[10px] font-bold text-cyan opacity-80">
                          @{member.handle}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Feature Badges */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Chip tone="violet" size="sm">
                  Verified Directory
                </Chip>
                <Chip tone="lime" size="sm">
                  Executive Rates
                </Chip>
                <Chip tone="magenta" size="sm">
                  Global Chapters
                </Chip>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Marquee Banner */}
      <div className="mt-12 border-t border-cyan/20 bg-[#0B0F19]/80 py-4">
        <Marquee tone="magenta" items={['VERIFIED NETWORK', 'EXECUTIVE LEADERSHIP', 'GLOBAL SECURITY SUMMITS', 'PRIVATE CHAPTERS', 'CYBER & PHYSICAL SAFETY']} separator="⚡" />
      </div>
    </div>
  );
}
