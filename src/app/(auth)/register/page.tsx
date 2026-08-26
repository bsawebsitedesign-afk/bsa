import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Chip, LiveDot } from '@/components/ui/badge';
import { Marquee } from '@/components/ui/marquee';
import { Reveal } from '@/components/ui/reveal';
import { Counter } from '@/components/ui/counter';
import { Avatar, Sticker } from '@/components/ui/misc';
import { relativeTime } from '@/lib/utils';
import { RegisterClient } from './register-client';

/** Member counts and the "who just joined" strip should be live, not cached. */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Join BSA',
  description:
    'Create your Business Security Alliance member account: the member directory, regional chapters, industry events and the opportunities board.',
};

const PERKS = [
  {
    emoji: '',
    title: 'The member directory',
    body: 'Search the membership by discipline, region and specialism. Reach people directly instead of cold outreach.',
  },
  {
    emoji: '',
    title: 'Tracks that stack',
    body: 'Written guidance from the membership on the problems practitioners actually face.',
  },
  {
    emoji: '',
    title: 'Event tickets',
    body: 'Conferences, roundtables, workshops and webinars, at a member rate.',
  },
  {
    emoji: '',
    title: 'Your regional chapter',
    body: 'A local peer group that meets on a stated cadence. Join one, or ask us about starting one.',
  },
  {
    emoji: '',
    title: 'The jobs board',
    body: 'Senior roles, partnership approaches, tenders, speaking calls and board appointments.',
  },
];

export default async function RegisterPage() {
  let session: any = null;
  let memberCount = 0;
  let chapterCount = 0;
  let resourceCount = 0;
  let roleCount = 0;
  let newest: any[] = [];

  try {
    const fetched = await Promise.all([
      getSession(),
      prisma.memberProfile.count({
        where: { user: { role: 'MEMBER', status: 'ACTIVE' } },
      }),
      prisma.chapter.count({ where: { isActive: true } }),
      prisma.resource.count({ where: { isPublished: true } }),
      prisma.opportunity.count({ where: { isPublished: true } }),
      prisma.memberProfile.findMany({
        where: {
          privacy: { isPublic: true, searchableInDirectory: true },
          user: { role: 'MEMBER', status: 'ACTIVE' },
        },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: { handle: true, fullName: true, avatarUrl: true, jobTitle: true, org: true, createdAt: true },
      }),
    ]);
    session = fetched[0];
    memberCount = fetched[1];
    chapterCount = fetched[2];
    resourceCount = fetched[3];
    roleCount = fetched[4];
    newest = fetched[5];
  } catch (err) {
    console.error('Register Page DB Error:', err);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070A11] text-white py-12 lg:py-16">
      {/* Cyber Mesh Background & Ambient Lighting */}
      <div className="pointer-events-none absolute inset-0 mesh-grid opacity-30" aria-hidden />
      <div className="pointer-events-none absolute -left-20 top-1/4 h-96 w-96 rounded-full bg-cyan/15 blur-[120px]" />
      <div className="pointer-events-none absolute -right-20 top-1/3 h-96 w-96 rounded-full bg-violet/20 blur-[120px]" />
      <div className="pointer-events-none absolute left-1/3 bottom-10 h-80 w-80 rounded-full bg-lime/10 blur-[100px]" />

      <div className="relative mx-auto grid max-w-container-max grid-cols-1 items-start gap-10 px-4 lg:grid-cols-12 lg:gap-14 lg:px-8">
        {/* Left Column — Registration Form */}
        <div className="lg:col-span-7 space-y-6">
          <Reveal direction="down">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan/40 bg-cyan/10 px-3.5 py-1 font-mono text-[10px] font-black uppercase tracking-widest text-cyan shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan"></span>
              </span>
              {memberCount.toLocaleString()} VERIFIED MEMBERS · FREE FOREVER · NO REVIEW QUEUE
            </div>

            <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
              CREATE YOUR <br />
              <span className="bg-gradient-to-r from-white via-cyan-bright to-violet-bright bg-clip-text text-transparent">
                MEMBER PROFILE.
              </span>
            </h1>
            <p className="mt-3 max-w-lg text-sm sm:text-base leading-relaxed text-white font-normal" style={{ color: '#FFFFFF' }}>
              Five fields, forty seconds, and you are in. No arbitrary review queues and no elitist barriers.{' '}
              <span className="text-[#00F0FF] font-bold" style={{ color: '#00F0FF' }}>You belong in the Alliance.</span>
            </p>
          </Reveal>

          {session && (
            <Reveal direction="up" delay={0.08}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-cyan/40 bg-cyan/10 p-4 backdrop-blur-md shadow-lg">
                <p className="text-xs font-semibold text-white/90">
                  You already have an active account as <strong className="font-mono text-cyan">{session.email}</strong>.
                </p>
                <Button href={session.role === 'ADMIN' ? '/admin' : '/dashboard'} tone="lime" size="sm">
                  Go to Dashboard →
                </Button>
              </div>
            </Reveal>
          )}

          <Reveal direction="up" delay={0.12}>
            <RegisterClient />
          </Reveal>

          <Reveal direction="up" delay={0.16}>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0D121F]/60 p-4 backdrop-blur-xl">
              <p className="text-xs font-semibold text-white/70">
                Been here before with an existing account?
              </p>
              <Link href="/login" className="rounded-xl border border-violet/40 bg-violet/15 px-3.5 py-2 font-mono text-xs font-bold text-violet-bright transition-all hover:bg-violet/25 hover:shadow-[0_0_15px_rgba(167,139,250,0.3)]">
                Sign in to your account →
              </Link>
            </div>
          </Reveal>
        </div>

        {/* Right Column — Perks & Member Showcase */}
        <div className="lg:col-span-5 space-y-6">
          <Reveal direction="left" delay={0.12}>
            <div className="relative overflow-hidden rounded-3xl border border-violet/30 bg-[#0B0F19]/90 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_0_50px_rgba(167,139,250,0.15)] space-y-6">
              <Sticker tone="tangerine" rotate={-3} className="absolute right-3 top-3 z-20 text-[10px] shadow-lg">
                DAY ONE BENEFITS
              </Sticker>

              {/* Panel Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="font-mono text-[10px] font-black uppercase tracking-widest text-violet-bright">
                    WHAT YOU GET ON DAY ONE
                  </p>
                  <p className="text-lg font-bold text-white mt-0.5">Alliance Access Suite</p>
                </div>
                <span className="rounded-full border border-cyan/40 bg-cyan/15 px-2.5 py-1 font-mono text-[10px] font-bold text-cyan">
                  {PERKS.length} INCLUDED
                </span>
              </div>

              {/* Perks List */}
              <div className="space-y-3">
                {PERKS.map((perk, idx) => (
                  <div key={perk.title} className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-[#111726]/80 p-3.5 transition-all hover:border-cyan/40 hover:bg-[#111726]">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-cyan/40 bg-cyan/15 font-mono text-xs font-black text-cyan shadow-sm">
                      0{idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-black uppercase tracking-wider text-white">
                        {perk.title}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-white/60 font-medium">
                        {perk.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Live Metric Counters */}
              <div className="grid grid-cols-2 gap-4 rounded-2xl border border-cyan/20 bg-[#111726]/90 p-4">
                <div>
                  <div className="font-display text-3xl font-black text-cyan">
                    <Counter to={resourceCount} />
                  </div>
                  <div className="mt-1 font-mono text-[10px] font-black uppercase tracking-wider text-white/70">
                    Live Resources
                  </div>
                </div>
                <div>
                  <div className="font-display text-3xl font-black text-lime">
                    <Counter to={roleCount} />
                  </div>
                  <div className="mt-1 font-mono text-[10px] font-black uppercase tracking-wider text-white/70">
                    Open Roles
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Recently Joined Members Feed */}
          <Reveal direction="left" delay={0.18}>
            <div className="rounded-3xl border border-cyan/30 bg-[#0B0F19]/90 p-6 backdrop-blur-2xl shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="font-mono text-[10px] font-black uppercase tracking-widest text-cyan">
                  RECENTLY JOINED MEMBERS
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-lime">
                  <span className="h-2 w-2 rounded-full bg-lime animate-pulse" />
                  LIVE NETWORK
                </span>
              </div>

              {newest.length === 0 ? (
                <p className="p-3 text-xs text-white/50">No members listed yet.</p>
              ) : (
                <div className="space-y-3 divide-y divide-white/5">
                  {newest.map((member) => (
                    <Link
                      key={member.handle}
                      href={`/members/${member.handle}`}
                      className="flex items-center justify-between pt-2.5 first:pt-0 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <Avatar name={member.fullName} src={member.avatarUrl} size="md" />
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0B0F19] bg-lime shadow-[0_0_8px_#84cc16]" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-white group-hover:text-cyan transition-colors">@{member.handle}</p>
                          <p className="truncate font-mono text-[10px] font-medium text-white/60">
                            {member.jobTitle} · {member.org}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-white/40">
                        {relativeTime(member.createdAt)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="font-mono text-[10px] font-bold text-cyan">
                  {memberCount.toLocaleString()} Members · {chapterCount} Chapters
                </span>
                <Link
                  href="/directory"
                  className="-my-3 inline-flex min-h-[44px] items-center py-3 font-mono text-xs font-bold text-violet-bright hover:underline"
                >
                  Browse Directory →
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Marquee Banner */}
      <div className="mt-12 border-t border-cyan/20 bg-[#0B0F19]/80 py-4">
        <Marquee tone="lime" speed="fast" items={['CONNECT WITH LEADERS', 'GROW YOUR PRACTICE', 'EXECUTIVE ROUNDTABLES', 'VERIFIED DIRECTORY', 'GLOBAL SECURITY ALLIANCE']} />
      </div>

      {/* FAQ Section */}
      <section className="border-t border-cyan/20 bg-[#090D16] py-16 lg:py-20">
        <div className="mx-auto max-w-container-max px-4 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <span className="mb-3 inline-block rounded-full border border-cyan/40 bg-cyan/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-cyan">
              BEFORE YOU SIGN UP
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-black text-white">Frequently Asked Questions</h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                q: 'Who can join BSA?',
                a: 'Anyone working in or adjacent to the security industry — in-house teams, CISOs, consultants, vendors, and research bodies.',
              },
              {
                q: 'What does membership cost?',
                a: 'Creating a member account and appearing in the verified directory is 100% free. Event registrations feature special member rates.',
              },
              {
                q: 'What about my privacy?',
                a: 'You decide. Every profile field has a privacy switch, and you can hide yourself from the directory at any time in one click.',
              },
              {
                q: 'What do you do with my email?',
                a: 'One welcome email, then account notifications only. We never sell your data and never send spam.',
              },
            ].map((item) => (
              <div key={item.q} className="rounded-2xl border border-cyan/25 bg-[#111726]/80 p-5 backdrop-blur-xl space-y-2 hover:border-cyan transition-colors">
                <h3 className="text-base font-bold text-white">{item.q}</h3>
                <p className="text-xs leading-relaxed text-white/70 font-medium">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
