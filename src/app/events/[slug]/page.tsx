import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardBar, CardBody } from '@/components/ui/card';
import { Chip, LiveDot, categoryEmoji } from '@/components/ui/badge';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/reveal';
import { PhotoFrame } from '@/components/ui/photo';
import { Avatar, Sticker } from '@/components/ui/misc';
import { formatDate, formatDay, formatMonth, parseJson, relativeTime } from '@/lib/utils';
import { formatMoney } from '@/lib/payment';
import { RegisterClient, type TicketOption } from './register-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface AgendaItem {
  time: string;
  title: string;
  detail?: string;
}

const LOCATION_LABEL: Record<string, string> = {
  IN_PERSON: 'In person',
  VIRTUAL: 'Online',
  HYBRID: 'Hybrid',
};

/* -------------------------------------------------------------------------- */
/* Tiny markdown-ish renderer: paragraph splits and **bold**  */
/* -------------------------------------------------------------------------- */

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  return text.split('**').map((chunk, i) =>
    i % 2 === 1 ? (
      <strong key={`${keyPrefix}-${i}`} className="font-black text-white">
        {chunk}
      </strong>
    ) : (
      <React.Fragment key={`${keyPrefix}-${i}`}>{chunk}</React.Fragment>
    ),
  );
}

function RichText({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="text-base font-medium leading-relaxed text-white/85 sm:text-lg">
          {renderInline(paragraph, `p${i}`)}
        </p>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Metadata  */
/* -------------------------------------------------------------------------- */

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const event = await prisma.event.findUnique({
      where: { slug: params.slug },
      select: { title: true, description: true, eventDate: true, location: true },
    });

    if (!event) {
      return { title: 'Event not found', description: 'That event is not on the calendar.' };
    }

    return {
      title: event.title,
      description: `${formatDate(event.eventDate)} · ${event.location}. ${event.description}`.slice(0, 300),
    };
  } catch (err) {
    return { title: 'BSA Event', description: 'Business Security Alliance Event details.' };
  }
}

/* -------------------------------------------------------------------------- */
/* Page  */
/* -------------------------------------------------------------------------- */

export default async function EventDetailPage({ params }: { params: { slug: string } }) {
  let event: any = null;
  let profile: any = null;
  let existingRegistration: any = null;
  const session = await getSession();

  try {
    event = await prisma.event.findUnique({
      where: { slug: params.slug },
      include: {
        tickets: { orderBy: { price: 'asc' } },
        speakers: true,
        sponsors: { include: { sponsor: true } },
        _count: { select: { registrations: true } },
      },
    });

    if (event && session) {
      const fetched = await Promise.all([
        prisma.memberProfile.findUnique({ where: { userId: session.userId }, select: { fullName: true, org: true } }),
        prisma.eventRegistration.findUnique({
          where: { eventId_attendeeEmail: { eventId: event.id, attendeeEmail: session.email } },
          select: {
            registrationCode: true,
            status: true,
            payments: { where: { status: 'PENDING' }, select: { transactionId: true }, take: 1 },
          },
        }),
      ]);
      profile = fetched[0];
      existingRegistration = fetched[1];
    }
  } catch (err) {
    console.error('Event Detail DB Error on Serverless:', err);
  }

  if (!event || event.status === 'DRAFT') notFound();

  const agenda = parseJson<AgendaItem[]>(event.agendaJson, []).filter((item) => item && item.title);
  const registrations = event._count.registrations;
  const spotsLeft = Math.max(0, event.maxCapacity - registrations);
  const fillPct = Math.min(100, Math.round((registrations / Math.max(1, event.maxCapacity)) * 100));
  const live = event.status === 'LIVE';
  const completed = event.status === 'COMPLETED';

  const tickets: TicketOption[] = (event.tickets ?? []).map((ticket: any) => ({
    id: ticket.id,
    name: ticket.name,
    price: ticket.price,
    priceLabel: formatMoney(ticket.price, ticket.currency),
    description: ticket.description,
    remaining: Math.max(0, ticket.quantityAvailable - ticket.quantitySold),
    isAvailable: ticket.isAvailable,
  }));

  const cheapest = tickets.length > 0 ? Math.min(...tickets.map((t) => t.price)) : 0;
  const dearest = tickets.length > 0 ? Math.max(...tickets.map((t) => t.price)) : 0;
  const currency = event.tickets[0]?.currency ?? 'USD';
  const memberSaving = dearest > cheapest ? dearest - cheapest : 0;
  const priceHeadline =
    dearest === 0
      ? 'No charge'
      : memberSaving > 0
        ? `Members ${formatMoney(cheapest, currency)} · Standard ${formatMoney(dearest, currency)}`
        : `${formatMoney(cheapest, currency)} per place`;

  const dateLabel = formatDate(event.eventDate, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const timeLabel = `${event.startTime} to ${event.endTime}`;

  const sponsorsByTier = [...event.sponsors].sort((a, b) => {
    const order = ['DIAMOND', 'GOLD', 'SILVER', 'COMMUNITY'];
    return order.indexOf(a.sponsor.tier) - order.indexOf(b.sponsor.tier);
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: event.eventDate.toISOString(),
    endDate: (event.endDate ?? event.eventDate).toISOString(),
    eventAttendanceMode:
      event.locationType === 'VIRTUAL'
        ? 'https://schema.org/OnlineEventAttendanceMode'
        : event.locationType === 'HYBRID'
          ? 'https://schema.org/MixedEventAttendanceMode'
          : 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: event.venueName ?? event.location, address: event.location },
    description: event.description,
  };

  return (
    <div className="overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* status rail */}
      {live && (
        <div className="mesh-grid border-b border-line py-1.5">
          <div className="mx-auto flex max-w-container-max items-center gap-2 px-4 lg:px-10">
            <span className="inline-flex items-center gap-2 border border-line bg-surface px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em]">
              <LiveDot /> Running now - late registration still open
            </span>
          </div>
        </div>
      )}
      {completed && (
        <div className="border-b border-line bg-surface-high py-2">
          <div className="mx-auto flex max-w-container-max items-center gap-2 px-4 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-soft lg:px-10">
            Held {relativeTime(event.eventDate)}. Programme and speakers remain on record.
          </div>
        </div>
      )}

      {/* ==================================================================
 HERO
 ================================================================== */}
      <section className="relative border-b border-line bg-base py-10 lg:py-14">
        <div className="absolute inset-0 mesh-grid" aria-hidden />

        <div className="relative mx-auto max-w-container-max px-4 lg:px-10">
          <Link
            href="/events"
            className="mb-6 inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted transition-colors hover:text-violet-bright"
          >
            ← All events
          </Link>

          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Reveal direction="up">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Chip tone="ink">
                    <span aria-hidden>{categoryEmoji(event.category)}</span> {event.category}
                  </Chip>
                  <Chip tone="paper">{LOCATION_LABEL[event.locationType] ?? event.locationType}</Chip>
                  <Chip tone={dearest === 0 ? 'lime' : 'tangerine'}>{priceHeadline}</Chip>
                  {live && (
                    <Chip tone="magenta">
                      <LiveDot tone="lime" /> Live
                    </Chip>
                  )}
                </div>

                <h1 className="text-display-lg max-w-3xl">{event.title}</h1>

                <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">{event.description}</p>
              </Reveal>

              <Reveal direction="up" delay={0.08}>
                <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="border border-line bg-surface p-3 shadow-panel">
                    <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-ink-muted">Date</dt>
                    <dd className="mt-1 font-display text-sm uppercase leading-tight">
                      {formatMonth(event.eventDate)} {formatDay(event.eventDate)}
                    </dd>
                    <dd className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                      {relativeTime(event.eventDate)}
                    </dd>
                  </div>
                  <div className="border border-line bg-surface p-3 shadow-panel">
                    <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-ink-muted">
                      Starts
                    </dt>
                    <dd className="mt-1 font-display text-sm uppercase leading-tight">{event.startTime}</dd>
                    <dd className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                      until {event.endTime}
                    </dd>
                  </div>
                  <div className="border border-line bg-surface p-3 shadow-panel">
                    <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-ink-muted">Where</dt>
                    <dd className="mt-1 truncate font-display text-sm uppercase leading-tight">{event.location}</dd>
                    <dd className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                      {event.venueName ?? LOCATION_LABEL[event.locationType]}
                    </dd>
                  </div>
                  {event.cpdHours > 0 ? (
                    <div className="border border-line bg-cyan/12 p-3 shadow-panel">
                      <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-ink-soft">
                        CPD credit
                      </dt>
                      <dd className="mt-1 font-display text-sm uppercase leading-tight">{event.cpdHours} hours</dd>
                      <dd className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                        recorded on attendance
                      </dd>
                    </div>
                  ) : (
                    <div className="border border-line bg-surface p-3 shadow-panel">
                      <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-ink-muted">
                        Capacity
                      </dt>
                      <dd className="mt-1 font-display text-sm uppercase leading-tight">{event.maxCapacity} places</dd>
                      <dd className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                        no CPD on this format
                      </dd>
                    </div>
                  )}
                </dl>
              </Reveal>
            </div>

            {/* Banner */}
            <div className="lg:col-span-5">
              <Reveal direction="left" delay={0.1}>
                <div className="relative">
                  <Sticker
                    tone={live ? 'magenta' : 'lime'}
                    rotate={-8}
                    className="absolute -left-3 -top-5 z-20 text-[10px]"
                  >
                    {completed ? 'held' : live ? 'in session' : relativeTime(event.eventDate)}
                  </Sticker>

                  {/* One frame whether or not a photograph exists, so the page
                      never reflows and an unillustrated event still looks
                      deliberate rather than unfinished. */}
                  <div className="overflow-hidden rounded-lg border border-line bg-surface-inset shadow-panel-lg">
                    <PhotoFrame
                      src={event.heroImageUrl}
                      alt={event.heroImageUrl ? `${event.title}` : ''}
                      seed={event.slug}
                      ratio="wide"
                      priority
                      className="rounded-none border-0"
                    />
                    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                      <span>{LOCATION_LABEL[event.locationType] ?? event.locationType}</span>
                      <span className="text-cyan">{registrations} registered</span>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================
 BODY + REGISTRATION RAIL
 ================================================================== */}
      <section className="border-b border-line bg-surface py-14 lg:py-16">
        <div className="mx-auto grid max-w-container-max grid-cols-1 gap-10 px-4 lg:grid-cols-12 lg:px-10">
          {/* ------------------------------ Main ------------------------------ */}
          <div className="space-y-12 lg:col-span-8">
            <Reveal>
              <div>
                <Sticker tone="lime" rotate={-2} className="mb-4">
                  ✦ ABOUT THIS SESSION
                </Sticker>
                <RichText text={event.fullDetails} />
              </div>
            </Reveal>

            {/* Agenda */}
            {agenda.length > 0 && (
              <Reveal>
                <div>
                  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                    <h2 className="text-3xl font-black uppercase text-white drop-shadow-md">Programme</h2>
                    <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-cyan">
                      {agenda.length} {agenda.length === 1 ? 'item' : 'items'} · local time
                    </span>
                  </div>

                  <ol className="relative space-y-4">
                    {agenda.map((item, i) => {
                      const first = i === 0;
                      const last = i === agenda.length - 1;
                      return (
                        <li key={`${item.time}-${i}`} className="flex gap-4 sm:gap-5">
                          <div className="flex flex-col items-center">
                            <span
                              className={`flex min-h-[44px] w-[96px] flex-shrink-0 items-center justify-center rounded-xl border border-cyan/40 px-1 text-center font-mono text-xs font-black leading-tight tracking-[0.04em] shadow-panel ${
                                first ? 'bg-cyan/20 text-white' : last ? 'bg-cyan/30 text-white font-extrabold' : 'bg-surface text-cyan'
                              }`}
                            >
                              {item.time}
                            </span>
                            {!last && <span aria-hidden className="w-[3px] flex-1 bg-white/20" />}
                          </div>

                          <div className={last ? 'pb-0' : 'pb-7'}>
                            <h3 className="text-xl font-black uppercase text-white leading-tight drop-shadow-sm">{item.title}</h3>
                            {item.detail && (
                              <p className="mt-1.5 text-sm font-semibold leading-relaxed text-white/80">{item.detail}</p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </Reveal>
            )}

            {/* Speakers */}
            {event.speakers.length > 0 && (
              <div>
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                  <h2 className="text-3xl font-black uppercase text-white drop-shadow-md">Speakers</h2>
                  <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-cyan">
                    Practitioners, not vendor slots
                  </span>
                </div>

                <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {(event.speakers ?? []).map((speaker: any) => (
                    <RevealItem key={speaker.id}>
                      <div className="h-full rounded-2xl border border-white/20 bg-surface/95 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-cyan/80">
                        <div className="flex items-start gap-4">
                          <Avatar name={speaker.name} src={speaker.avatarUrl} size="md" />
                          <div className="min-w-0">
                            <h3 className="text-lg font-black text-white leading-tight drop-shadow-sm">{speaker.name}</h3>
                            <p className="mt-1 font-mono text-xs font-bold uppercase tracking-[0.12em] text-cyan">
                              {speaker.title} · {speaker.company}
                            </p>
                            {speaker.bio && (
                              <p className="mt-2.5 text-xs font-semibold leading-relaxed text-white/85">{speaker.bio}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </RevealItem>
                  ))}
                </RevealGroup>
              </div>
            )}

            {/* Venue */}
            <Reveal>
              <div className="rounded-2xl border border-white/20 bg-surface/95 shadow-panel overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-surface-inset px-5 py-3 font-mono text-xs font-black uppercase tracking-[0.14em] text-white">
                  <span>Venue and access</span>
                  <span className="text-cyan">{LOCATION_LABEL[event.locationType] ?? event.locationType}</span>
                </div>
                <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2">
                  <div>
                    <p className="font-mono text-xs font-black uppercase tracking-[0.16em] text-cyan">
                      Location
                    </p>
                    <p className="mt-1.5 font-display text-xl font-black uppercase leading-tight text-white drop-shadow-sm">
                      {event.venueName ?? event.location}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white/80">{event.location}</p>

                    <p className="mt-4 text-xs font-semibold leading-relaxed text-white/85">
                      {event.locationType === 'VIRTUAL'
                        ? 'The joining link is emailed to your registered address the day before, and again an hour before the session starts.'
                        : event.locationType === 'HYBRID'
                          ? 'The room and the online session run in parallel. Choose either on the day - the material and the Q&A are the same.'
                          : 'Registration opens thirty minutes before the first item. Bring photo identification if the venue requires it.'}
                    </p>
                  </div>

                  <div className="flex flex-col justify-between gap-4 rounded-xl border border-dashed border-white/20 bg-surface-raised p-5">
                    <div>
                      <p className="font-mono text-xs font-black uppercase tracking-[0.16em] text-cyan">
                        Before you attend
                      </p>
                      <ul className="mt-3 space-y-2 text-xs font-semibold leading-relaxed text-white/90">
                        <li className="flex items-center gap-2"><span className="text-cyan font-bold">✓</span> Your registration reference is emailed on confirmation. Bring it with you.</li>
                        <li className="flex items-center gap-2">
                          <span className="text-cyan font-bold">✓</span>{' '}
                          {event.cpdHours > 0
                            ? `${event.cpdHours} CPD hours are recorded against your member record after attendance.`
                            : 'This format carries no CPD hours. It is a networking session.'}
                        </li>
                        <li className="flex items-center gap-2"><span className="text-cyan font-bold">✓</span> Places are transferable to a colleague. Tell us the name before the day.</li>
                      </ul>
                    </div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
                      Access requirements or dietary needs? Contact us and we will arrange it.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Partners */}
            {sponsorsByTier.length > 0 && (
              <div>
                <h2 className="text-display-md mb-2">Event partners</h2>
                <p className="mb-6 max-w-xl text-sm leading-relaxed text-ink-muted">
                  These organisations support the event. Partnership does not buy a speaking slot - the programme is
                  selected separately.
                </p>

                <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {sponsorsByTier.map(({ sponsor }) => (
                    <RevealItem key={sponsor.id}>
                      <a
                        href={sponsor.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-full items-start gap-4 border border-line bg-surface p-4 shadow-panel panel-hover"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={sponsor.logoUrl}
                          alt=""
                          loading="lazy"
                          className="h-12 w-12 flex-shrink-0 border border-line object-cover"
                        />
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-display text-sm uppercase leading-tight">{sponsor.name}</span>
                            <Chip size="sm" tone={sponsor.tier === 'DIAMOND' ? 'violet' : 'paper'}>
                              {sponsor.tier}
                            </Chip>
                            {sponsor.isHiring && (
                              <Chip size="sm" tone="lime">
                                Hiring
                              </Chip>
                            )}
                          </span>
                          <span className="mt-1.5 block text-xs leading-relaxed text-ink-muted">
                            {sponsor.description}
                          </span>
                        </span>
                      </a>
                    </RevealItem>
                  ))}
                </RevealGroup>
              </div>
            )}
          </div>

          {/* ------------------------------ Rail ------------------------------ */}
          <aside className="lg:col-span-4">
            <div className="space-y-6 lg:sticky lg:top-[88px]">
              <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg overflow-hidden">
                <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
                  <span className="text-base font-extrabold text-white">Event Capacity</span>
                  <span className="rounded-full bg-cyan/20 border border-cyan/40 px-3 py-1 font-mono text-xs font-bold text-cyan">
                    {registrations} / {event.maxCapacity}
                  </span>
                </div>
                <div className="space-y-3">
                  <div
                    className="relative h-3.5 w-full rounded-full border border-line bg-base p-0.5 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={fillPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Places taken"
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        spotsLeft <= 15 ? 'bg-gradient-to-r from-rose/60 to-rose' : 'bg-gradient-to-r from-cyan/40 to-cyan'
                      }`}
                      style={{ width: `${Math.max(fillPct, 4)}%` }}
                    />
                  </div>

                  <p className="font-mono text-xs font-extrabold uppercase tracking-wider text-cyan">
                    {spotsLeft <= 0 ? (
                      <span className="text-rose">Waiting list only</span>
                    ) : (
                      <span>
                        {spotsLeft} Places Remaining Of {event.maxCapacity}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <RegisterClient
                eventId={event.id}
                eventTitle={event.title}
                eventStatus={event.status}
                dateLabel={dateLabel}
                timeLabel={timeLabel}
                location={event.location}
                cpdHours={event.cpdHours}
                memberSavingLabel={memberSaving > 0 ? formatMoney(memberSaving, currency) : null}
                atCapacity={spotsLeft <= 0}
                tickets={tickets}
                signedIn={
                  session ? { name: profile?.fullName ?? '', email: session.email, company: profile?.org ?? '' } : null
                }
                existing={
                  existingRegistration
                    ? {
                        code: existingRegistration.registrationCode,
                        status: existingRegistration.status,
                        checkoutUrl: existingRegistration.payments[0]
                          ? `/checkout/${existingRegistration.payments[0].transactionId}`
                          : null,
                      }
                    : null
                }
              />

              {event.videoUrl && (
                <a
                  href={event.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 border border-line bg-violet/15 px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink shadow-panel panel-hover"
                >
                  <span>▶ Watch the recording</span>
                  <span aria-hidden>→</span>
                </a>
              )}
            </div>
          </aside>
        </div>
      </section>

      {/* ==================================================================
 FOOT
 ================================================================== */}
      <section className="border-b border-line bg-base py-14">
        <div className="mx-auto flex max-w-container-max flex-col items-start justify-between gap-6 px-4 lg:flex-row lg:items-center lg:px-10">
          <div>
            <h2 className="text-display-md">
              Not this one? <span className="text-gradient">Something else</span> is close.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
              The calendar carries conferences, roundtables, working sessions and chapter evenings across every region.
              Members pay less on all of them.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button href="/events" tone="lime" size="lg">
              Full calendar
            </Button>
            <Button href="/directory" tone="paper" size="lg">
              Member directory
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
