import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Chip, LiveDot } from '@/components/ui/badge';
import { Card, CardBody } from '@/components/ui/card';
import { Marquee } from '@/components/ui/marquee';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/reveal';
import { Counter } from '@/components/ui/counter';
import { EmptyState, SectionHead, Sticker, Stat } from '@/components/ui/misc';
import { BecomeBackerButton } from './sponsors-client';
import { cn } from '@/lib/utils';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Backers',
  description: 'The organisations funding the BSA events programme, regional chapter activity and industry research.',
};

type TierKey = 'DIAMOND' | 'GOLD' | 'SILVER' | 'COMMUNITY';

const TIERS: Array<{
  key: TierKey;
  label: string;
  tone: 'violet' | 'magenta' | 'tangerine' | 'lime';
  chipTone: 'violet' | 'magenta' | 'tangerine' | 'lime';
  kicker: string;
  blurb: string;
}> = [
  {
    key: 'DIAMOND',
    label: 'Diamond',
    tone: 'violet',
    chipTone: 'violet',
    kicker: 'Diamond backers',
    blurb:
      'The heaviest line items sit here: the annual conference programme, chapter meeting costs, and the industry research the alliance publishes.',
  },
  {
    key: 'GOLD',
    label: 'Gold',
    tone: 'magenta',
    chipTone: 'magenta',
    kicker: 'Gold backers',
    blurb:
      'Gold pays for chapter starter kits, the hardware we hand out at workshops, and the mentor hours behind monthly office hours.',
  },
  {
    key: 'SILVER',
    label: 'Silver',
    tone: 'tangerine',
    chipTone: 'tangerine',
    kicker: 'Silver backers',
    blurb:
      'Room hire, pizza, printing, and the unglamorous recurring costs that keep a chapter meeting every single week.',
  },
  {
    key: 'COMMUNITY',
    label: 'Community',
    tone: 'lime',
    chipTone: 'lime',
    kicker: 'Community backers',
    blurb:
      'Smaller teams who chip in what they can, open their bug bounty to first-timers, or send someone to speak on a Tuesday night.',
  },
];

/** The seeded default is generic; anything custom is the sponsor's own words. */
function ctaLabel(text: string | null): string {
  if (!text || text.trim().toLowerCase() === 'learn more') return 'Visit their site →';
  return `${text} →`;
}

function HiringBadge({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/opportunities"
      className={
        compact
          ? 'inline-flex items-center gap-1.5 rounded-full bg-cyan/20 border border-cyan/40 px-3 py-1 font-mono text-xs font-bold text-cyan hover:bg-cyan/30 transition-colors'
          : 'inline-flex items-center gap-2 rounded-full bg-cyan/20 border border-cyan/40 px-4 py-1.5 font-mono text-xs font-extrabold text-cyan hover:bg-cyan/30 transition-colors'
      }
    >
      💼 Hiring Team →
    </Link>
  );
}

function PerkStrip({ perk, size = 'md' }: { perk: string; size?: 'lg' | 'md' | 'sm' }) {
  return (
    <div
      className={
        size === 'lg'
          ? 'flex flex-col gap-2 rounded-xl border border-cyan/40 bg-cyan/10 p-4 sm:flex-row sm:items-center sm:gap-3'
          : 'flex flex-col gap-1.5 rounded-lg border border-cyan/30 bg-cyan/10 p-3 sm:flex-row sm:items-center sm:gap-2.5'
      }
    >
      <span className="flex-shrink-0 font-mono text-xs font-bold uppercase tracking-wider text-cyan">🎁 Member Perk</span>
      <span
        className={size === 'lg' ? 'text-sm font-bold text-white' : 'text-xs font-semibold text-white/90'}
      >
        {perk}
      </span>
    </div>
  );
}

export default async function SponsorsPage() {
  let sponsors: any[] = [];

  try {
    sponsors = await prisma.sponsor.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        tier: true,
        description: true,
        websiteUrl: true,
        ctaText: true,
        ctaUrl: true,
        isHiring: true,
        perkText: true,
      },
    });
  } catch (err) {
    console.error('Sponsors DB Error on Serverless:', err);
  }

  const byTier = TIERS.map((tier) => ({
    ...tier,
    sponsors: sponsors.filter((sponsor) => sponsor.tier === tier.key),
  })).filter((tier) => tier.sponsors.length > 0);

  const hiringCount = sponsors.filter((sponsor) => sponsor.isHiring).length;

  return (
    <div className="overflow-x-hidden">
      {/* ==================================================================
 HERO
 ================================================================== */}
      <section className="relative border-b border-line bg-base">
        <div className="absolute inset-0 mesh-grid" aria-hidden />

        <div className="relative mx-auto grid max-w-container-max grid-cols-1 items-start gap-10 px-4 py-14 lg:grid-cols-12 lg:gap-12 lg:px-10 lg:py-20">
          <div className="lg:col-span-7">
            <Reveal direction="down">
              <div className="mb-6 inline-flex flex-wrap items-center gap-2 rounded-full border border-cyan/40 bg-cyan/20 px-4 py-1.5 font-mono text-xs font-bold text-cyan shadow-panel">
                🛡️ {sponsors.length} Strategic Backers · {hiringCount} Hiring Industry Professionals
              </div>
            </Reveal>

            <Reveal direction="up" delay={0.05}>
              <h1 className="text-display-lg font-black text-white">
                THE <span className="text-cyan">STRATEGIC</span> BACKERS
              </h1>
            </Reveal>

            <Reveal direction="up" delay={0.12}>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
                BSA is free because these leading companies back our initiative. Their contributions fund <strong className="text-cyan font-extrabold">the annual events programme</strong>, regional chapter meetings, and open industry research.
              </p>
            </Reveal>

            <Reveal direction="up" delay={0.18}>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <BecomeBackerButton />
                <Button href="/opportunities" tone="paper" size="lg">
                  See who is hiring
                </Button>
              </div>
            </Reveal>

            <Reveal direction="up" delay={0.24}>
              <div className="mt-9 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat value={<Counter to={sponsors.length} />} label="Companies backing us" tone="paper" />
                <Stat value={<Counter to={hiringCount} />} label="Hiring security roles" tone="lime" />
                <Stat value="$0" label="What members pay" tone="magenta" className="col-span-2 sm:col-span-1" />
              </div>
            </Reveal>
          </div>

          {/* Receipt */}
          <div className="lg:col-span-5">
            <Reveal direction="left" delay={0.15}>
              <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md shadow-panel-lg overflow-hidden">
                <div className="border-b border-line bg-surface-inset/80 px-6 py-4 text-center">
                  <p className="font-display text-lg font-black text-white uppercase leading-none">Where The Funding Goes</p>
                  <p className="mt-2 font-mono text-xs font-bold uppercase tracking-wider text-cyan">
                    Business Security Alliance · Member Transparency
                  </p>
                </div>

                <ul className="space-y-3 px-6 py-6 font-mono text-xs">
                  {[
                    ['Member event rates', 'SUBSIDISED'],
                    ['Chapter starter kits', 'COVERED'],
                    ['Industry research', 'COVERED'],
                    ['Workshop hardware', 'COVERED'],
                    ['Travel grants', 'COVERED'],
                    ['Mentor office hours', 'COVERED'],
                  ].map(([item, value]) => (
                    <li key={item} className="flex items-baseline gap-2">
                      <span className="text-ink-soft font-semibold">{item}</span>
                      <span
                        aria-hidden
                        className="min-w-0 flex-1 border-b border-dashed border-line"
                      />
                      <span className="flex-shrink-0 font-extrabold text-cyan">{value}</span>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-line bg-surface-inset/80 px-6 py-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-xs font-extrabold uppercase tracking-wider text-white">Total member cost</span>
                    <span className="font-display text-3xl font-black text-cyan leading-none">$0.00</span>
                  </div>
                  <p className="mt-3 rounded-xl border border-cyan/40 bg-cyan/20 px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider text-cyan text-center">
                    Paid in full by strategic corporate sponsors
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {sponsors.length > 0 && <Marquee tone="ink" speed="normal" items={sponsors.map((sponsor) => sponsor.name)} />}

      {/* ==================================================================
 TIERS
 ================================================================== */}
      {byTier.length === 0 ? (
        <section className="border-b border-line bg-surface py-16 lg:py-20">
          <div className="mx-auto max-w-container-max px-4 lg:px-10">
            <EmptyState
              title="No backers listed yet"
              blurb="Nothing is published on this page right now. If your company wants to be the first name on it, the door is open."
              action={<BecomeBackerButton label="Be the first" size="md" />}
            />
          </div>
        </section>
      ) : (
        byTier.map((tier, tierIndex) => (
          <section
            key={tier.key}
            id={tier.key.toLowerCase()}
            className={`border-b border-line py-14 lg:py-20 ${tierIndex % 2 === 0 ? 'bg-surface' : 'bg-base'}`}
          >
            <div className="mx-auto max-w-container-max px-4 lg:px-10">
              <SectionHead
                kicker={tier.kicker}
                tone={tier.tone}
                title={
                  tier.key === 'DIAMOND' ? (
                    <>
                      Strategic <span className="text-cyan px-1 font-black">Diamond</span> Backers
                    </>
                  ) : tier.key === 'GOLD' ? (
                    <>Kit, mentors and starter packs</>
                  ) : tier.key === 'SILVER' ? (
                    <>The weekly running costs</>
                  ) : (
                    <>Everyone else chipping in</>
                  )
                }
                blurb={tier.blurb}
                action={
                  <div className="flex items-center gap-2">
                    <Chip tone={tier.chipTone}>{tier.label}</Chip>
                    <Chip size="sm" tone="paper">
                      {tier.sponsors.length} {tier.sponsors.length === 1 ? 'company' : 'companies'}
                    </Chip>
                  </div>
                }
              />

              {/* ---------------------------------------------------- DIAMOND */}
              {tier.key === 'DIAMOND' && (
                <RevealGroup className="space-y-8">
                  {tier.sponsors.map((sponsor) => (
                    <RevealItem key={sponsor.id}>
                      <div className="grid grid-cols-1 gap-6 rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg sm:p-8 lg:grid-cols-12 lg:gap-8 items-center">
                        <div className="lg:col-span-3">
                          <div className="flex items-center gap-4 lg:flex-col lg:items-start">
                            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-cyan/40 bg-cyan/10 p-2 shadow-panel-lg overflow-hidden sm:h-32 sm:w-32">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={sponsor.logoUrl}
                                alt={sponsor.name}
                                loading="lazy"
                                className="h-full w-full object-contain rounded-xl"
                              />
                            </div>
                            <div className="lg:mt-3">
                              <span className="rounded-full bg-violet/20 border border-violet/40 px-3 py-1 font-mono text-xs font-bold text-violet-bright">
                                💎 Diamond Tier
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="lg:col-span-6">
                          <h3 className="text-3xl font-black text-white leading-tight">{sponsor.name}</h3>
                          <p className="mt-3 max-w-xl text-base font-medium leading-relaxed text-ink-soft">{sponsor.description}</p>
                          {sponsor.perkText && (
                            <div className="mt-5 max-w-xl">
                              <PerkStrip perk={sponsor.perkText} size="lg" />
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-start gap-4 lg:col-span-3 lg:items-end">
                          {sponsor.isHiring && <HiringBadge />}
                          <Button href={sponsor.ctaUrl ?? sponsor.websiteUrl} tone="magenta" size="lg" className="w-full sm:w-auto">
                            {ctaLabel(sponsor.ctaText)}
                          </Button>
                          <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink-soft lg:text-right">
                            External Partner Site ↗
                          </p>
                        </div>
                      </div>
                    </RevealItem>
                  ))}
                </RevealGroup>
              )}

              {/* ------------------------------------------------------- GOLD */}
              {tier.key === 'GOLD' && (
                <RevealGroup className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {tier.sponsors.map((sponsor) => (
                    <RevealItem key={sponsor.id} className="h-full">
                      <div className="flex h-full flex-col gap-4 rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg">
                        <div className="flex items-start gap-4">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-cyan/40 bg-cyan/10 p-1.5 overflow-hidden">
                            <img
                              src={sponsor.logoUrl}
                              alt={sponsor.name}
                              loading="lazy"
                              className="h-full w-full object-contain rounded-lg"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="mb-1 inline-block rounded-full bg-magenta/20 border border-magenta/40 px-3 py-0.5 font-mono text-xs font-bold text-magenta">
                              🥇 Gold Backer
                            </span>
                            <h3 className="text-2xl font-extrabold text-white leading-tight">{sponsor.name}</h3>
                          </div>
                        </div>

                        <p className="flex-1 text-sm font-medium leading-relaxed text-ink-soft">{sponsor.description}</p>

                        {sponsor.perkText && <PerkStrip perk={sponsor.perkText} />}

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                          <Button href={sponsor.ctaUrl ?? sponsor.websiteUrl} tone="ink" size="sm">
                            {ctaLabel(sponsor.ctaText)}
                          </Button>
                          {sponsor.isHiring && <HiringBadge compact />}
                        </div>
                      </div>
                    </RevealItem>
                  ))}
                </RevealGroup>
              )}

              {/* ----------------------------------------------------- SILVER */}
              {tier.key === 'SILVER' && (
                <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {tier.sponsors.map((sponsor) => (
                    <RevealItem key={sponsor.id} className="h-full">
                      <div className="flex h-full flex-col justify-between rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-base p-1 overflow-hidden">
                              <img
                                src={sponsor.logoUrl}
                                alt={sponsor.name}
                                loading="lazy"
                                className="h-full w-full object-contain rounded-lg"
                              />
                            </div>
                            <div className="min-w-0">
                              <h3 className="truncate text-lg font-extrabold text-white leading-tight">{sponsor.name}</h3>
                              <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan">
                                Silver Backer
                              </span>
                            </div>
                          </div>

                          <p className="text-xs font-medium leading-relaxed text-ink-soft">{sponsor.description}</p>
                        </div>

                        {sponsor.perkText && <PerkStrip perk={sponsor.perkText} size="sm" />}

                        <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
                          <Button href={sponsor.ctaUrl ?? sponsor.websiteUrl} tone="paper" size="sm">
                            {ctaLabel(sponsor.ctaText)}
                          </Button>
                          {sponsor.isHiring && <HiringBadge compact />}
                        </div>
                      </div>
                    </RevealItem>
                  ))}
                </RevealGroup>
              )}

              {/* -------------------------------------------------- COMMUNITY */}
              {tier.key === 'COMMUNITY' && (
                <RevealGroup className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {tier.sponsors.map((sponsor) => (
                    <RevealItem key={sponsor.id} className="h-full">
                      <div className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-5 shadow-panel-lg sm:flex-row sm:items-center">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-base p-1 overflow-hidden">
                            <img
                              src={sponsor.logoUrl}
                              alt={sponsor.name}
                              loading="lazy"
                              className="h-full w-full object-contain rounded-lg"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-extrabold text-white leading-tight">{sponsor.name}</h3>
                              {sponsor.isHiring && <HiringBadge compact />}
                            </div>
                            <p className="mt-1 text-xs font-medium leading-relaxed text-ink-soft">{sponsor.description}</p>
                            {sponsor.perkText && (
                              <p className="mt-2 font-mono text-xs font-bold uppercase tracking-wider text-cyan">
                                Perk: {sponsor.perkText}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          href={sponsor.ctaUrl ?? sponsor.websiteUrl}
                          tone="paper"
                          size="sm"
                          className="shrink-0"
                        >
                          {ctaLabel(sponsor.ctaText)}
                        </Button>
                      </div>
                    </RevealItem>
                  ))}
                </RevealGroup>
              )}
            </div>
          </section>
        ))
      )}

      {/* ==================================================================
 WHAT IT BUYS
 ================================================================== */}
      <section className="border-b border-line bg-violet/15 py-16 text-ink lg:py-20">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <span className="mb-3 inline-block border border-line bg-cyan/12 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink shadow-panel">
                Plain english
              </span>
              <h2 className="text-display-md text-ink">What the money actually buys</h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/75">
                Not "brand alignment". Four concrete things, each of which stops happening if the backers stop.
              </p>
            </div>
          </div>

          <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: '01',
                t: 'Subsidised member rates',
                d: 'Every paid event carries a member rate well below the standard rate. Partner funding is what makes that gap possible.',
                tone: 'lime' as const,
              },
              {
                n: '02',
                t: 'Chapter starter kits',
                d: 'A new regional chapter gets a launch budget, venue costs for its first meetings, and printed materials. That is usually the difference between a chapter and a mailing list.',
                tone: 'magenta' as const,
              },
              {
                n: '03',
                t: 'Industry research',
                d: 'The annual salary, skills and workforce research the alliance publishes, funded by partners and free to members.',
                tone: 'tangerine' as const,
              },
              {
                n: '04',
                t: 'Hardware and travel',
                d: 'Dev boards for the embedded workshops, and travel grants so distance is not the reason someone misses the summit.',
                tone: 'lime' as const,
              },
            ].map((item, i) => (
              <RevealItem key={item.n} className="h-full">
                <Card className="h-full" tilt={(i % 2 === 0 ? 1 : 2) as 1 | 2}>
                  <CardBody className="flex h-full flex-col">
                    <span
                      className={`mb-3 inline-flex w-fit items-center border border-line px-2 py-1 font-display text-xs uppercase shadow-panel ${
                        item.tone === 'lime'
                          ? 'bg-cyan/12 text-ink'
                          : item.tone === 'magenta'
                            ? 'bg-grad-brand-soft text-ink'
                            : 'bg-amber/12 text-ink'
                      }`}
                    >
                      {item.n}
                    </span>
                    <h3 className="text-xl leading-tight">{item.t}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">{item.d}</p>
                  </CardBody>
                </Card>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ==================================================================
  WHAT WE DON'T SELL (ETHICAL FIREWALL)
  ================================================================== */}
      <section className="relative overflow-hidden border-b border-white/10 bg-[#070A12] py-20 lg:py-28">
        <div className="pointer-events-none absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-rose/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-cyan/10 blur-3xl" />

        <div className="relative mx-auto max-w-container-max px-4 lg:px-10">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-start">
            {/* Left Column: Covenant & Policy Directive + Live Governance Compliance HUD */}
            <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
              <Reveal>
                <div className="inline-flex items-center gap-2 rounded-full border border-rose/50 bg-rose/15 px-3.5 py-1.5 font-mono text-xs font-black uppercase tracking-wider text-rose shadow-[0_0_20px_rgba(244,63,94,0.25)]">
                  <span className="h-2 w-2 rounded-full bg-rose animate-pulse" />
                  <span>INTEGRITY FIREWALL // ZERO EXPLOITATION</span>
                </div>

                <h2 className="mt-4 font-display text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.08]">
                  THREE THINGS THAT ARE{' '}
                  <span className="mt-2 inline-block rounded-2xl border-2 border-rose/60 bg-rose/20 px-3.5 py-1 text-rose shadow-[0_0_30px_rgba(244,63,94,0.35)]">
                    NOT FOR SALE
                  </span>
                </h2>

                <p className="mt-4 text-base sm:text-lg font-normal leading-relaxed text-slate-200" style={{ color: '#E2E8F0' }}>
                  Being upfront about this protects the integrity of our members and your brand reputation. If an organization requires any of these three deliverables, we are the wrong alliance and we decline on the discovery call.
                </p>

                <div className="pt-1">
                  <BecomeBackerButton label="Request Partnership Prospectus →" size="md" />
                </div>

                {/* Primary Enforcement Banner */}
                <div className="mt-4 rounded-2xl border border-white/10 bg-[#0B0F19] p-4 font-mono text-xs text-slate-300 flex items-center gap-3 shadow-md">
                  <span className="text-xl">🛡️</span>
                  <span>Enforced by the BSA Governance Committee under strict Chatham House Confidentiality Rules.</span>
                </div>

                {/* Live Governance Compliance HUD Card (Fills Left Space & Balances Height) */}
                <div className="mt-5 rounded-3xl border border-white/10 bg-[#0B0F19] p-5 sm:p-6 shadow-2xl ring-1 ring-white/10 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="font-mono text-xs font-black uppercase tracking-wider text-cyan flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-lime animate-pulse" />
                      GOVERNANCE MATRIX
                    </span>
                    <span className="font-mono text-[10px] font-bold text-lime uppercase bg-lime/15 border border-lime/30 px-2 py-0.5 rounded-full">
                      AUDIT PASSED
                    </span>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-slate-300">Member Directory Exports:</span>
                      <span className="font-bold text-rose">0 Allowed (100% Blocked)</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-slate-300">Sponsored Feed Posts:</span>
                      <span className="font-bold text-rose">0 Allowed (100% Blocked)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Paid Stage Keynote Buyouts:</span>
                      <span className="font-bold text-rose">0 Allowed (100% Blocked)</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>STATUS: ACTIVE & ENFORCED</span>
                    <span className="text-cyan font-bold">100% COMPLIANT</span>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Right Column: 3 Creative Interactive Security Protocol Cards */}
            <div className="lg:col-span-7 space-y-5">
              {[
                {
                  code: 'PROTOCOL // 01',
                  status: 'ACCESS RESTRICTED [403 FORBIDDEN]',
                  statusColor: 'border-rose/50 bg-rose/15 text-rose',
                  icon: '🔒',
                  title: 'Your Identity & Member Directory Data',
                  desc: 'The BSA member directory is an encrypted peer sanctuary, not a sales lead list. Corporate backers never receive contact data, roster dumps, or telemetry logs in whole or part. Sponsors only interact with practitioners who choose to apply directly.',
                  tags: ['Zero Lead Brokering', 'No Cold Sales Spam', 'Complete Anonymity'],
                  accentGlow: 'hover:border-rose/60 hover:shadow-[0_20px_50px_rgba(244,63,94,0.2)]',
                  iconBg: 'border-rose/40 bg-rose/15 text-rose',
                },
                {
                  code: 'PROTOCOL // 02',
                  status: 'EDITORIAL INTEGRITY [100% UNBIASED]',
                  statusColor: 'border-amber/50 bg-amber/15 text-amber',
                  icon: '⚡',
                  title: 'The Intelligence Feed & Editorial Voice',
                  desc: 'Zero sponsored articles, zero paid advertorials, and zero ghostwritten thought leadership with a corporate badge. Every brief is authored by real security leaders, and no amount of sponsorship dollars can purchase editorial placement.',
                  tags: ['Practitioner-Only Writing', 'No Paid Listicles', 'Peer Reviewed'],
                  accentGlow: 'hover:border-amber/60 hover:shadow-[0_20px_50px_rgba(245,158,11,0.2)]',
                  iconBg: 'border-amber/40 bg-amber/15 text-amber',
                },
                {
                  code: 'PROTOCOL // 03',
                  status: 'CURRICULUM LOCKDOWN [NO PAID SLOTS]',
                  statusColor: 'border-cyan/50 bg-cyan/15 text-cyan',
                  icon: '🏛️',
                  title: 'Summit Rosters, Accreditation & Syllabi',
                  desc: 'Backers do not dictate roundtable topics, summit keynotes, or CPD accreditation tracks. Partners can provide tangible member perks—like research grants and lab tooling discounts—but cannot buy stage time to pitch commercial products.',
                  tags: ['Merit-Based Stages', 'Zero Pitch Decks', 'Uncompromised CPD'],
                  accentGlow: 'hover:border-cyan/60 hover:shadow-[0_20px_50px_rgba(56,189,248,0.2)]',
                  iconBg: 'border-cyan/40 bg-cyan/15 text-cyan',
                },
              ].map((protocol, i) => (
                <Reveal key={protocol.code} delay={i * 0.1}>
                  <div
                    className={cn(
                      'group rounded-3xl border border-white/10 bg-[#0B0F19] p-6 sm:p-7 shadow-2xl transition-all duration-300 hover:-translate-y-1 ring-1 ring-white/10',
                      protocol.accentGlow,
                    )}
                  >
                    {/* Header line with Protocol code & Status Pill */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4 mb-4">
                      <div className="flex items-center gap-2 font-mono text-xs font-black tracking-widest text-slate-400">
                        <span className="h-2 w-2 rounded-full bg-cyan" />
                        <span>{protocol.code}</span>
                      </div>
                      <span className={cn('rounded-full border px-3 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider shadow-sm', protocol.statusColor)}>
                        {protocol.status}
                      </span>
                    </div>

                    {/* Title and Icon */}
                    <div className="flex items-start gap-4">
                      <span
                        className={cn(
                          'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-2xl shadow-lg transition-transform group-hover:scale-110',
                          protocol.iconBg,
                        )}
                      >
                        {protocol.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-lg sm:text-xl font-bold text-white leading-tight" style={{ color: '#FFFFFF' }}>
                          {protocol.title}
                        </h3>
                        <p className="mt-2.5 text-xs sm:text-sm font-normal leading-relaxed text-slate-300" style={{ color: '#CBD5E1' }}>
                          {protocol.desc}
                        </p>
                      </div>
                    </div>

                    {/* Tag Badges Footer */}
                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
                      {protocol.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-200"
                        >
                          ✓ {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================
  CTA
  ================================================================== */}
      <section className="relative overflow-hidden border-b border-white/10 bg-[#070A12] py-20 lg:py-28">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-container-max px-4 text-center lg:px-10">
          <Reveal>
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan/40 bg-cyan/15 px-4 py-1.5 font-mono text-xs font-black uppercase tracking-wider text-cyan shadow-lg">
              <span>⚡</span> DIRECT PROSPECTUS & ONE-PAGE BENCHMARKS
            </span>
            <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-black text-white max-w-3xl mx-auto tracking-tight">
              Connecting With Security Practitioners Is <span className="text-cyan">Transparent</span>.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg font-normal leading-relaxed text-slate-200" style={{ color: '#E2E8F0' }}>
              Backing BSA places your company directly in front of thousands of security architects, CISOs, engineers, and rising leaders. Tell us your focus areas and we will provide exact tier benchmarks, member counts, and a direct answer on alignment.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <BecomeBackerButton label="Apply For Partnership →" size="lg" />
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-4 font-mono text-xs font-bold uppercase tracking-wider text-white transition-all hover:border-cyan/50 hover:text-cyan shadow-xl"
              >
                Inquire With Executive Office
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
