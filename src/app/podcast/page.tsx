import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardBar } from '@/components/ui/card';
import { Chip, LiveDot } from '@/components/ui/badge';
import { Marquee } from '@/components/ui/marquee';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/reveal';
import { SectionHead, Sticker, Stat } from '@/components/ui/misc';
import { TiltCard } from '@/components/ui/scroll';
import { YouTubePlayer } from '@/components/ui/youtube-player';
import {
  ShieldDoodle,
  CurlyArrowDoodle,
  PodcastMicDoodle,
  SoundWaveDoodle,
  BroadcastTowerDoodle,
  HeadphonesDoodle,
} from '@/components/ui/security-doodles';

export const metadata: Metadata = {
  title: 'Security Leader Podcast · Where the World’s Security Leaders Speak',
  description:
    'The official audio & video podcast series of the Business Security Alliance. Authentic, educational conversations with top Security CEOs, CISOs, innovators, integrators, and government experts shaping the future of Physical, Electronic, and Cybersecurity.',
};

const FEATURED_EPISODES = [
  {
    id: 'ep-01',
    number: 'EPISODE 042',
    title: 'Architecting Converged Physical & Cybersecurity Operations',
    guest: 'Dr. Michael Zimmer & Executive Panel',
    role: 'Chief Security Officer & Risk Advisory Chair',
    duration: '48 mins',
    date: 'August 14, 2026',
    category: 'Converged Security',
    summary:
      'How enterprise security leaders are breaking down the legacy wall between physical control rooms and cybersecurity SOCs to build unified threat telemetry centers.',
  },
  {
    id: 'ep-02',
    number: 'EPISODE 041',
    title: 'The Future of AI-Driven Surveillance & Regulatory Compliance',
    guest: 'Elena Rostova',
    role: 'VP of Product Security, Aegis Global',
    duration: '42 mins',
    date: 'August 08, 2026',
    category: 'AI Telemetry',
    summary:
      'Unpacking European and US regulatory mandates for AI video analytics, biometric access controls, and privacy-first physical security systems.',
  },
  {
    id: 'ep-03',
    number: 'EPISODE 040',
    title: 'Channel Partner Expansion & Security Manufacturer Advisory',
    guest: 'James Whitfield',
    role: 'Managing Director, Northgate Systems',
    duration: '55 mins',
    date: 'July 29, 2026',
    category: 'Business Growth',
    summary:
      'Practical revenue capture strategies, distributor channel optimization, and strategic advice for scaling security technology manufacturing firms globally.',
  },
  {
    id: 'ep-04',
    number: 'EPISODE 039',
    title: 'Crisis Leadership & Executive Protection in High-Risk Regions',
    guest: 'Sam Reyes',
    role: 'Head of Corporate Security, Meridian Logistics',
    duration: '50 mins',
    date: 'July 18, 2026',
    category: 'Leadership',
    summary:
      'Direct lessons from managing travel risk, supply chain resilience, and physical crisis response across 40 high-consequence facilities worldwide.',
  },
];

export default function PodcastPage() {
  return (
    <div className="overflow-x-hidden bg-base text-white">
      {/* ==================================================================
  HERO
  ================================================================== */}
      <section className="relative overflow-hidden border-b border-line py-20 lg:py-28">
        <div className="aura-hero absolute inset-0 opacity-70" aria-hidden />
        <BroadcastTowerDoodle className="absolute right-12 top-20 h-24 w-24 text-magenta/25 hidden lg:block rotate-[12deg] pointer-events-none" />
        <HeadphonesDoodle className="absolute left-1/3 bottom-8 h-16 w-16 text-cyan/20 hidden md:block rotate-[-8deg] pointer-events-none" />

        <div className="relative mx-auto max-w-container-max px-5 lg:px-8">
          <div className="grid grid-cols-1 gap-12 items-center lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Reveal direction="down">
                <div className="glass-chip gap-2.5 rounded-full border-cyan/40 px-4 py-1.5 inline-flex items-center">
                  <LiveDot tone="cyan" />
                  <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-cyan">
                    OFFICIAL AUDIO & VIDEO SERIES · BUSINESS SECURITY ALLIANCE
                  </span>
                </div>
              </Reveal>

              <h1 className="relative mt-8 tracking-tight font-extrabold uppercase leading-[0.88]">
                <ShieldDoodle className="absolute -left-12 -top-10 h-16 w-16 text-cyan/70 hidden sm:block rotate-[-12deg]" />
                <span className="relative inline-block text-4xl sm:text-6xl lg:text-7xl font-extrabold text-3d-pop tracking-tight">
                  WHERE THE WORLD'S
                </span>
                <span className="relative block text-4xl sm:text-6xl lg:text-7xl font-accent font-bold lowercase italic text-3d-pop-cyan -mt-3 sm:-mt-5 lg:-mt-7 rotate-[-2.5deg] drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]">
                  security leaders speak!
                </span>
              </h1>

              <Reveal direction="up" delay={0.2}>
                <p className="mt-8 max-w-xl border-l-2 border-cyan/40 pl-5 text-base sm:text-lg font-semibold leading-relaxed text-white/90">
                  Authentic, honest, and educational conversations with top Security CEOs, innovators, manufacturers, integrators, and government experts shaping the future of Physical, Electronic, and Cybersecurity.
                </p>
              </Reveal>

              <Reveal direction="up" delay={0.3}>
                <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Button href="#episodes" tone="magenta" size="lg" className="font-extrabold shadow-panel" arrow>
                    Listen to Latest Episodes
                  </Button>
                  <Button href="/contact?type=guest" tone="ink" size="lg" className="font-extrabold border border-white/20 text-white hover:border-cyan">
                    Apply to be a Guest
                  </Button>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Sticker tone="lime" rotate={-3}>
                    ✦ SPOTIFY & APPLE PODCASTS
                  </Sticker>
                  <Sticker tone="magenta" rotate={3}>
                    🔥 YOUTUBE VIDEO SERIES
                  </Sticker>
                  <Sticker tone="cobalt" rotate={-2}>
                    ⚡ WEEKLY EXECUTIVE INTEL
                  </Sticker>
                </div>
              </Reveal>
            </div>

            {/* Right Media Card */}
            <div className="lg:col-span-5">
              <Reveal direction="left">
                <TiltCard strength={10}>
                  <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-surface/95 p-4 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                    <div className="mb-3.5 flex items-center justify-between border-b border-white/10 pb-3">
                      <span className="font-mono text-xs font-black uppercase tracking-[0.2em] text-cyan">
                        FEATURED EPISODE · VIDEO
                      </span>
                      <Chip tone="lime">LIVE</Chip>
                    </div>

                    <YouTubePlayer videoId="ep34kPRQpmg" title="The Security Leader Podcast · Official Video Series" />

                    <div className="mt-3.5 flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">
                      <span className="flex items-center gap-1.5 text-cyan">
                        <span className="h-2 w-2 rounded-full bg-cyan animate-pulse" />
                        STREAMING ON YOUTUBE
                      </span>
                      <span>BSA NETWORK</span>
                    </div>
                  </div>
                </TiltCard>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <Marquee
        tone="ink"
        items={[
          '✦ PHYSICAL SECURITY LEADERSHIP',
          '⚡ CYBERSECURITY THREAT TELEMETRY',
          '✦ ELECTRONIC SURVEILLANCE & AI',
          '⚡ CHANNEL STRATEGY & REVENUE CAPTURE',
          '✦ GOVERNMENT & REGULATORY POLICY',
        ]}
        separator=" ★ "
      />

      {/* ==================================================================
  PILLARS: WHO WE ARE, WHAT WE DO, WHY LISTEN TO US
  ================================================================== */}
      <section className="relative border-b border-line py-20 lg:py-24 bg-surface/90">
        <div className="mx-auto max-w-container-max px-5 lg:px-8">
          <SectionHead
            kicker="ABOUT THE PODCAST"
            title="Built by security leaders, for security leaders"
            blurb="If you live and breathe security, this is your community—and this is your podcast."
          />

          <RevealGroup className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <RevealItem className="h-full">
              <TiltCard strength={8} className="h-full">
                <Card className="h-full">
                  <CardBar tone="lime">Who We Are</CardBar>
                  <CardBody className="space-y-3">
                    <p className="text-sm font-semibold leading-relaxed text-white/90">
                      The Security Leader Podcast is the official audio & video series of the Business Security Alliance. We connect CEOs, CISOs, CSOs, integrators, manufacturers, and government experts worldwide.
                    </p>
                  </CardBody>
                </Card>
              </TiltCard>
            </RevealItem>

            <RevealItem className="h-full">
              <TiltCard strength={8} className="h-full">
                <Card className="h-full">
                  <CardBar tone="magenta">What We Do</CardBar>
                  <CardBody className="space-y-3">
                    <p className="text-sm font-semibold leading-relaxed text-white/90">
                      Each episode is designed to inform, challenge, and inspire. We unpack real-world security challenges, spotlight innovative technologies, examine business strategies, and share hard-earned leadership lessons.
                    </p>
                  </CardBody>
                </Card>
              </TiltCard>
            </RevealItem>

            <RevealItem className="h-full">
              <TiltCard strength={8} className="h-full">
                <Card className="h-full">
                  <CardBar tone="violet">Why Listen to Us</CardBar>
                  <CardBody className="space-y-3">
                    <p className="text-sm font-semibold leading-relaxed text-white/90">
                      Because security is changing faster than ever—and the people shaping its future are right here. Stay informed on emerging trends, technologies, and threats from executives solving real problems.
                    </p>
                  </CardBody>
                </Card>
              </TiltCard>
            </RevealItem>
          </RevealGroup>
        </div>
      </section>

      {/* ==================================================================
  EPISODE DIRECTORY
  ================================================================== */}
      <section id="episodes" className="relative border-b border-line py-20 lg:py-24">
        <div className="mx-auto max-w-container-max px-5 lg:px-8">
          <SectionHead
            kicker="FEATURED CONVERSATIONS"
            title="Explore Latest Podcast Episodes"
            blurb="Deep-dive interviews with executives and visionaries protecting people, property, and assets globally."
          />

          <RevealGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {FEATURED_EPISODES.map((ep) => (
              <RevealItem key={ep.id} className="h-full">
                <TiltCard strength={6} className="h-full">
                  <div className="flex h-full flex-col justify-between rounded-2xl border border-white/20 bg-surface/95 p-6 shadow-panel transition-all hover:border-cyan/80">
                    <div>
                      <div className="flex items-center justify-between font-mono text-xs font-black uppercase tracking-widest text-cyan">
                        <span>{ep.number}</span>
                        <Chip tone="paper">{ep.category}</Chip>
                      </div>
                      <h3 className="mt-4 text-xl font-black uppercase text-white leading-tight drop-shadow-sm">
                        {ep.title}
                      </h3>
                      <p className="mt-2 font-mono text-xs font-bold text-cyan">
                        {ep.guest} · <span className="text-white/70">{ep.role}</span>
                      </p>
                      <p className="mt-3 text-xs font-semibold leading-relaxed text-white/85">
                        {ep.summary}
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/70">
                        {ep.duration} · {ep.date}
                      </span>
                      <Button href={`#play-${ep.id}`} tone="magenta" size="sm" className="font-extrabold">
                        ▶ Listen Now
                      </Button>
                    </div>
                  </div>
                </TiltCard>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ==================================================================
  INTERACTIVE ACTIONS: GUEST / TOPIC / SUBSCRIBE
  ================================================================== */}
      <section className="relative border-b border-line py-20 lg:py-24 bg-surface-inset/60">
        <div className="mx-auto max-w-container-max px-5 lg:px-8 text-center">
          <Reveal>
            <Sticker tone="lime" rotate={-4} className="mb-6">
              ✦ GET INVOLVED
            </Sticker>
            <h2 className="relative tracking-tight font-extrabold uppercase leading-[0.88]">
              <span className="relative inline-block text-3xl sm:text-5xl lg:text-6xl font-extrabold text-3d-pop tracking-tight">
                BE PART OF THE CONVERSATION
              </span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-base font-semibold leading-relaxed text-white/85 sm:text-lg">
              Have an extraordinary story, security breakthrough, or leadership lesson to share? Join us as a guest or suggest topics for our next episode.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button href="/contact?type=guest" tone="magenta" size="lg" className="font-extrabold shadow-panel" arrow>
                I want to be a Guest on the Podcast
              </Button>
              <Button href="/contact?type=topic" tone="ink" size="lg" className="font-extrabold border border-white/20 text-white hover:border-cyan">
                Suggest a Podcast Topic
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
