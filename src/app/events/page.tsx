import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Chip, LiveDot, categoryEmoji } from '@/components/ui/badge';
import { Marquee } from '@/components/ui/marquee';
import { Reveal } from '@/components/ui/reveal';
import { Counter } from '@/components/ui/counter';
import { Sticker, Stat } from '@/components/ui/misc';
import { TiltCard } from '@/components/ui/scroll';
import { formatDay, formatMonth, relativeTime } from '@/lib/utils';
import { formatMoney } from '@/lib/payment';
import { EventsClient, type EventCard } from './events-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Events',
  description:
    'Conferences, closed-door roundtables, working sessions, member webinars and chapter evenings for security professionals. Member rates apply and most sessions carry CPD hours.',
};

export default async function EventsPage() {
  let rows: any[] = [];
  let registrationsConfirmed = 0;

  try {
    const [fetchedRows, count] = await Promise.all([
      prisma.event.findMany({
        where: { status: { in: ['UPCOMING', 'LIVE', 'COMPLETED'] } },
        orderBy: { eventDate: 'asc' },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          category: true,
          status: true,
          eventDate: true,
          startTime: true,
          endTime: true,
          location: true,
          locationType: true,
          venueName: true,
          maxCapacity: true,
          cpdHours: true,
          videoUrl: true,
          heroImageUrl: true,
          tickets: { select: { price: true, currency: true, isAvailable: true } },
          _count: { select: { registrations: true, speakers: true } },
        },
      }),
      prisma.eventRegistration.count({ where: { status: 'CONFIRMED' } }),
    ]);
    rows = fetchedRows;
    registrationsConfirmed = count;
  } catch (err) {
    console.error('Events DB Error on Serverless:', err);
  }

  const events: EventCard[] = rows.map((event: any) => {
    const sellable = (event.tickets ?? []).filter((t: any) => t.isAvailable);
    const pool = sellable.length > 0 ? sellable : (event.tickets ?? []);
    const currency = pool[0]?.currency ?? 'USD';
    const prices = pool.map((t: any) => t.price);
    const cheapest = prices.length > 0 ? Math.min(...prices) : 0;
    const dearest = prices.length > 0 ? Math.max(...prices) : 0;

    return {
      id: event.id,
      slug: event.slug,
      heroImageUrl: event.heroImageUrl,
      title: event.title,
      description: event.description,
      category: event.category,
      status: event.status,
      eventDate: event.eventDate.toISOString(),
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      locationType: event.locationType,
      venueName: event.venueName,
      maxCapacity: event.maxCapacity,
      registrations: event._count.registrations,
      spotsLeft: Math.max(0, event.maxCapacity - event._count.registrations),
      priceLabel: formatMoney(cheapest, currency),
      standardPriceLabel: dearest > cheapest ? formatMoney(dearest, currency) : null,
      isFree: cheapest === 0,
      cpdHours: event.cpdHours,
      speakerCount: event._count.speakers,
      hasRecording: Boolean(event.videoUrl),
    };
  });

  const open = events.filter((e) => e.status === 'UPCOMING' || e.status === 'LIVE');
  const nextUp = open[0];
  const placesOpen = open.reduce((total, e) => total + e.spotsLeft, 0);
  const cpdOnOffer = open.reduce((total, e) => total + e.cpdHours, 0);
  const withMemberRate = open.filter((e) => e.standardPriceLabel !== null).length;

  return (
    <div className="overflow-x-hidden">
      {/* ==================================================================
 HERO
 ================================================================== */}
      <section className="relative border-b border-line bg-base py-14 lg:py-20">
        <div className="absolute inset-0 mesh-grid" aria-hidden />

        <div className="relative mx-auto grid max-w-container-max grid-cols-1 items-start gap-12 px-4 lg:grid-cols-12 lg:px-10">
          <div className="lg:col-span-7">
            <Reveal direction="down">
              <div className="mb-6 inline-flex items-center gap-2 border border-line bg-surface px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] shadow-panel">
                {open.length} {open.length === 1 ? 'event' : 'events'} open for registration
              </div>
            </Reveal>

            <Reveal direction="up" delay={0.05}>
              <h1 className="relative tracking-tight font-extrabold uppercase leading-[0.88]">
                <span className="relative inline-block text-5xl sm:text-7xl lg:text-8xl font-extrabold text-3d-pop tracking-tight">
                  GLOBAL EVENTS &
                  <span className="absolute -right-6 -top-4 text-cyan text-2xl animate-pulse">✦</span>
                </span>
                <span className="relative block text-5xl sm:text-7xl lg:text-8xl font-accent font-bold lowercase italic text-3d-pop-cyan -mt-3 sm:-mt-6 lg:-mt-8 rotate-[-3.5deg] drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]">
                  security summits!
                  <span className="absolute -left-6 bottom-2 text-white text-3xl animate-bounce">✦</span>
                </span>
              </h1>
            </Reveal>

            <Reveal direction="up" delay={0.12}>
              <p className="mt-7 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
                Conferences, closed-door roundtables, working sessions, member webinars and chapter evenings. Every
                programme is built from member submissions, and{' '}
                <strong className="text-cyan px-0.5 font-bold">members pay less on every paid ticket.</strong>
              </p>
            </Reveal>

            <Reveal direction="up" delay={0.18}>
              <div className="mt-8 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat value={<Counter to={open.length} />} label="Open now" tone="lime" />
                <Stat value={<Counter to={cpdOnOffer} />} label="CPD hours on offer" tone="paper" />
                <Stat value={<Counter to={placesOpen} />} label="Places remaining" tone="paper" />
                <Stat value={<Counter to={registrationsConfirmed} />} label="Registrations confirmed" tone="paper" />
              </div>
            </Reveal>

            {withMemberRate > 0 && (
              <Reveal direction="up" delay={0.24}>
                <div className="mt-6 flex flex-wrap items-center gap-3 border border-line bg-cyan/10 p-4 shadow-panel">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-soft">
                    Member benefit
                  </span>
                  <p className="min-w-[220px] flex-1 text-sm leading-relaxed text-ink-soft">
                    {withMemberRate} of the paid {withMemberRate === 1 ? 'event' : 'events'} on this page{' '}
                    {withMemberRate === 1 ? 'carries' : 'carry'} a member rate below the standard rate.
                  </p>
                  <Button href="/membership" tone="ink" size="sm">
                    Membership
                  </Button>
                </div>
              </Reveal>
            )}
          </div>

          {/* Next on the calendar */}
          {nextUp && (
            <div className="lg:col-span-5">
              <Reveal direction="left" delay={0.15}>
                <div className="relative">
                  <Sticker tone="magenta" rotate={-9} className="absolute -left-3 -top-5 z-20 text-[10px]">
                    next up
                  </Sticker>

                  <Link
                    href={`/events/${nextUp.slug}`}
                    className="group block border border-line bg-surface shadow-panel-lg panel-hover"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-inset px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink">
                      <span>
                        {categoryEmoji(nextUp.category)} {nextUp.category}
                      </span>
                      <span className="text-cyan">{relativeTime(nextUp.eventDate)}</span>
                    </div>

                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        <span
                          aria-hidden
                          className="flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center border border-line bg-cyan/12 shadow-panel"
                        >
                          <span className="font-display text-3xl leading-none">{formatDay(nextUp.eventDate)}</span>
                          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em]">
                            {formatMonth(nextUp.eventDate)}
                          </span>
                        </span>
                        <div className="min-w-0">
                          <h2 className="text-display-md transition-colors group-hover:text-violet-bright">
                            {nextUp.title}
                          </h2>
                          <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                            {nextUp.startTime} · {nextUp.location}
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 line-clamp-3 text-xs leading-relaxed text-ink-muted">{nextUp.description}</p>

                      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-dashed border-line pt-4">
                        <Chip tone={nextUp.isFree ? 'lime' : 'tangerine'} size="sm">
                          {nextUp.standardPriceLabel ? `Members ${nextUp.priceLabel}` : nextUp.priceLabel}
                        </Chip>
                        {nextUp.cpdHours > 0 && <Chip size="sm">{nextUp.cpdHours} CPD hours</Chip>}
                        <Chip size="sm">{nextUp.spotsLeft <= 0 ? 'Waiting list' : `${nextUp.spotsLeft} places`}</Chip>
                        <span className="ml-auto font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-violet-bright transition-transform group-hover:translate-x-1">
                          Details →
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              </Reveal>
            </div>
          )}
        </div>
      </section>

      <Marquee
        tone="lime"
        items={[
          'ANNUAL CONFERENCE',
          'CLOSED-DOOR ROUNDTABLES',
          'WORKING SESSIONS',
          'MEMBER WEBINARS',
          'CHAPTER EVENINGS',
          'CPD HOURS RECORDED',
        ]}
      />

      {/* ==================================================================
 FILTERS · UPCOMING · PAST
 ================================================================== */}
      <EventsClient events={events} />

      {/* ==================================================================
 SPEAK · HOST · PARTNER
 ================================================================== */}
      <section className="relative overflow-hidden border-b border-line bg-base py-16 text-white lg:py-20">
        <div className="absolute inset-0 mesh-dots opacity-25" aria-hidden />
        <div className="relative mx-auto grid max-w-container-max grid-cols-1 items-center gap-10 px-4 lg:grid-cols-12 lg:px-10">
          <div className="lg:col-span-5">
            <Sticker tone="lime" rotate={-2} className="mb-4">
              ✦ GET INVOLVED
            </Sticker>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white drop-shadow-md">Put something on the calendar.</h2>
            <p className="mt-4 max-w-xl text-base font-medium leading-relaxed text-white/85">
              The programme comes from the membership. If you have run the thing, solved the thing or want the industry
              in a room to argue about it, tell us and we will find the right format.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button href="/contact" tone="magenta" size="lg" className="font-extrabold shadow-panel" arrow>
                Propose a session
              </Button>
              <Button href="/sponsors" tone="ink" size="lg" className="font-extrabold border border-white/20 text-white hover:border-cyan">
                Partner with us
              </Button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                {
                  k: '01',
                  t: 'SPEAK',
                  icon: '🎤',
                  d: 'Send the topic, the format you have in mind and who it is for. Practitioner sessions are prioritised over vendor pitches.',
                },
                {
                  k: '02',
                  t: 'HOST',
                  icon: '🏛️',
                  d: 'Regional chapters run their own evenings and working sessions. Offer a room, or offer to chair one.',
                },
                {
                  k: '03',
                  t: 'PARTNER',
                  icon: '🤝',
                  d: 'Event partnership puts your organisation in front of practitioners with budget and responsibility.',
                },
              ].map((route) => (
                <TiltCard key={route.k} strength={10} className="h-full">
                  <li className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-white/20 bg-surface/95 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-cyan/80 hover:bg-surface-raised hover:shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
                    <div>
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan/40 bg-cyan/10 font-mono text-xs font-black text-cyan shadow-panel">
                          {route.k}
                        </span>
                        <span className="text-2xl">{route.icon}</span>
                      </div>
                      <h3 className="mt-4 font-display text-xl font-black uppercase leading-tight text-white transition-colors group-hover:text-cyan drop-shadow-md">
                        {route.t}
                      </h3>
                      <p className="mt-2.5 text-xs font-semibold leading-relaxed text-white/80">
                        {route.d}
                      </p>
                    </div>
                  </li>
                </TiltCard>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
