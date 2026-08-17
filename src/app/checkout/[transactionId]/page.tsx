import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardBar, CardBody } from '@/components/ui/card';
import { Chip, categoryEmoji } from '@/components/ui/badge';
import { Reveal } from '@/components/ui/reveal';
import { Sticker } from '@/components/ui/misc';
import { formatDate, formatDay, formatMonth } from '@/lib/utils';
import { formatMoney } from '@/lib/payment';
import { CheckoutClient } from './checkout-client';

/** A payment record must never be cached - its status is the whole point. */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your BSA event registration.',
  robots: { index: false, follow: false },
};

function SummaryRow({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-line py-2.5 last:border-b-0">
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">{label}</span>
      <span className={strong ? 'font-display text-lg uppercase leading-none' : 'text-right text-sm text-ink-soft'}>
        {value}
      </span>
    </div>
  );
}

export default async function CheckoutPage({ params }: { params: { transactionId: string } }) {
  const payment = await prisma.payment.findUnique({
    where: { transactionId: params.transactionId },
    include: {
      eventRegistration: {
        include: { event: true, ticket: true },
      },
    },
  });

  if (!payment) notFound();

  const registration = payment.eventRegistration;
  const event = registration?.event ?? null;

  const amountLabel = formatMoney(payment.amount, payment.currency);
  const dateLabel = event
    ? formatDate(event.eventDate, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : '-';
  const timeLabel = event ? `${event.startTime} to ${event.endTime}` : '-';

  const settled = payment.status === 'COMPLETED';
  const dead = payment.status === 'FAILED' || payment.status === 'REFUNDED';

  return (
    <div className="overflow-x-hidden">
      <section className="relative border-b border-line bg-base py-12 lg:py-16">
        <div className="absolute inset-0 mesh-grid" aria-hidden />

        <div className="relative mx-auto max-w-container-max px-4 lg:px-10">
          {event ? (
            <Link
              href={`/events/${event.slug}`}
              className="mb-6 inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted transition-colors hover:text-violet-bright"
            >
              ← Back to {event.title}
            </Link>
          ) : (
            <Link
              href="/events"
              className="mb-6 inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted transition-colors hover:text-violet-bright"
            >
              ← All events
            </Link>
          )}

          <Reveal direction="up">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="ink">Checkout</Chip>
              <Chip tone={settled ? 'lime' : dead ? 'paper' : 'tangerine'}>
                {settled ? 'Paid' : dead ? 'Cancelled' : 'Awaiting payment'}
              </Chip>
              <Chip tone="paper">{payment.provider.replace('_', ' ')}</Chip>
            </div>

            <h1 className="text-display-lg mt-4 max-w-3xl">
              {settled ? (
                <>
                  Paid. <span className="text-gradient">Your place is held.</span>
                </>
              ) : dead ? (
                <>
                  This checkout <span className="text-gradient">is closed.</span>
                </>
              ) : (
                <>
                  One step and the <span className="text-cyan px-1">place is yours.</span>
                </>
              )}
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-soft sm:text-base">
              {settled
                ? 'Your registration is confirmed. The reference below is what the registration desk will ask for.'
                : dead
                  ? 'This transaction was cancelled or refunded, so the place returned to the pool. You can book again from the event page if there is still room.'
                  : 'This is the BSA development gateway. It behaves exactly like a live payment provider, including the failure paths, but it never touches a card.'}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="border-b border-line bg-surface py-14 lg:py-16">
        <div className="mx-auto grid max-w-container-max grid-cols-1 gap-8 px-4 lg:grid-cols-12 lg:px-10">
          {/* --------------------------- Order summary --------------------------- */}
          <div className="lg:col-span-7">
            <Reveal>
              <Card>
                <CardBar tone="violet">
                  <span>Order summary</span>
                  <span>{payment.currency}</span>
                </CardBar>

                <CardBody>
                  {event ? (
                    <div className="flex items-start gap-4 border-b border-dashed border-line pb-5">
                      <span
                        aria-hidden
                        className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center border border-line bg-cyan/12 shadow-panel"
                      >
                        <span className="font-display text-2xl leading-none">{formatDay(event.eventDate)}</span>
                        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em]">
                          {formatMonth(event.eventDate)}
                        </span>
                      </span>
                      <div className="min-w-0">
                        <Chip size="sm" tone="ink" className="mb-1.5">
                          <span aria-hidden>{categoryEmoji(event.category)}</span> {event.category}
                        </Chip>
                        <h2 className="text-display-md">{event.title}</h2>
                        <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                          {dateLabel} · {timeLabel}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                          {event.venueName ? `${event.venueName} · ` : ''}
                          {event.location}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="border border-dashed border-line bg-surface-inset/60 p-4 text-sm text-ink-muted">
                      This transaction is no longer attached to an event registration. If that looks wrong, send us the
                      transaction reference below and we will trace it.
                    </p>
                  )}

                  <div className="mt-4">
                    {registration && (
                      <>
                        <SummaryRow label="Rate" value={registration.ticket?.name ?? 'Standard rate'} />
                        <SummaryRow label="Attendee" value={registration.attendeeName} />
                        <SummaryRow label="Email" value={registration.attendeeEmail} />
                        {registration.attendeeCompany && (
                          <SummaryRow label="Organisation" value={registration.attendeeCompany} />
                        )}
                        <SummaryRow
                          label="Registration status"
                          value={
                            registration.status === 'CONFIRMED'
                              ? 'Confirmed'
                              : registration.status === 'PENDING_PAYMENT'
                                ? 'Place held, unpaid'
                                : 'Cancelled'
                          }
                        />
                      </>
                    )}
                    {event && event.cpdHours > 0 && (
                      <SummaryRow
                        label="CPD credit"
                        value={`${event.cpdHours} ${event.cpdHours === 1 ? 'hour' : 'hours'} on attendance`}
                      />
                    )}
                    <SummaryRow
                      label="Transaction"
                      value={<span className="font-mono text-xs">{payment.transactionId}</span>}
                    />
                    <SummaryRow label="Opened" value={formatDate(payment.createdAt)} />
                    <SummaryRow label="Total" value={amountLabel} strong />
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3 border border-line bg-cyan/10 p-3">
                    <Sticker tone="lime" rotate={-4} className="text-[9px]">
                      Member rates
                    </Sticker>
                    <p className="min-w-[200px] flex-1 text-xs leading-relaxed text-ink-soft">
                      Paid events carry a member rate below the standard rate. If you are booking at the standard rate
                      regularly, membership is usually the cheaper route.
                    </p>
                    <Button href="/membership" tone="ink" size="sm">
                      Membership
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </Reveal>
          </div>

          {/* ------------------------------ Pay panel ---------------------------- */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-[88px]">
              {settled && registration && event ? (
                <Card className="border shadow-panel-lg">
                  <CardBar tone="lime">
                    <span>Registration confirmed</span>
                    <span>{amountLabel}</span>
                  </CardBar>
                  <CardBody className="space-y-4">
                    <div className="border border-dashed border-line bg-cyan/10 p-5">
                      <div className="flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">
                        <span>Registration reference</span>
                        <span>BSA</span>
                      </div>

                      <p className="mt-3 break-all font-display text-3xl leading-none tracking-[0.06em] sm:text-4xl">
                        {registration.registrationCode}
                      </p>

                      <div className="mt-5 space-y-1.5 border-t border-dashed border-line pt-4">
                        <p className="font-display text-sm uppercase leading-tight">{event.title}</p>
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                          {dateLabel} · {timeLabel}
                        </p>
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                          {event.location}
                        </p>
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                          Held for {registration.attendeeName}
                        </p>
                      </div>

                      {event.cpdHours > 0 && (
                        <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-dashed border-line pt-4">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                            CPD credit
                          </span>
                          <span className="font-display text-2xl leading-none">
                            {event.cpdHours} {event.cpdHours === 1 ? 'hour' : 'hours'}
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs leading-relaxed text-ink-muted">
                      A copy has been emailed to {registration.attendeeEmail}. Quote the reference at the registration
                      desk.
                    </p>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Button href={`/events/${event.slug}`} tone="ink" size="sm" className="w-full">
                        Event details
                      </Button>
                      <Button href="/dashboard" tone="paper" size="sm" className="w-full">
                        My registrations
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ) : dead ? (
                <Card className="border shadow-panel-lg">
                  <CardBar tone="ink">
                    <span>Nothing to pay</span>
                    <span>{amountLabel}</span>
                  </CardBar>
                  <CardBody className="space-y-4">
                    <p className="text-sm leading-relaxed text-ink-soft">
                      This checkout was cancelled, so no registration was issued and no money was taken. The place
                      returned to the pool.
                    </p>
                    <Button href={event ? `/events/${event.slug}` : '/events'} tone="lime" size="lg" className="w-full">
                      {event ? 'Book again' : 'Browse events'}
                    </Button>
                  </CardBody>
                </Card>
              ) : registration && event ? (
                <CheckoutClient
                  transactionId={payment.transactionId}
                  provider={payment.provider.replace('_', ' ')}
                  amountLabel={amountLabel}
                  ticketName={registration.ticket?.name ?? 'Standard rate'}
                  eventSlug={event.slug}
                  eventTitle={event.title}
                  dateLabel={dateLabel}
                  timeLabel={timeLabel}
                  location={event.location}
                  attendeeName={registration.attendeeName}
                  attendeeEmail={registration.attendeeEmail}
                  registrationCode={registration.registrationCode}
                  cpdHours={event.cpdHours}
                />
              ) : (
                <Card className="border shadow-panel-lg">
                  <CardBar tone="ink">
                    <span>Orphaned transaction</span>
                  </CardBar>
                  <CardBody className="space-y-4">
                    <p className="text-sm leading-relaxed text-ink-soft">
                      There is a payment record here with no registration attached, so there is nothing to settle. Send
                      us the reference and we will correct it by hand.
                    </p>
                    <p className="border border-dashed border-line bg-surface-inset/60 p-3 font-mono text-xs font-bold">
                      {payment.transactionId}
                    </p>
                    <Button href="/contact" tone="lime" size="lg" className="w-full">
                      Contact the team
                    </Button>
                  </CardBody>
                </Card>
              )}

              <p className="mt-4 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-ink-soft">
                Swap this gateway for a live provider in src/lib/payment.ts. Nothing else changes.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
