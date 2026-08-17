'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardBar, CardBody } from '@/components/ui/card';
import { Chip } from '@/components/ui/badge';
import { FieldError, Input, Label } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/* Props - all money is pre-formatted server-side  */
/* -------------------------------------------------------------------------- */

export interface TicketOption {
  id: string;
  name: string;
  price: number;
  priceLabel: string;
  description: string | null;
  remaining: number;
  isAvailable: boolean;
}

export interface RegisterClientProps {
  /** The event **id** - the register route is keyed by id, not slug. */
  eventId: string;
  eventTitle: string;
  eventStatus: string;
  dateLabel: string;
  timeLabel: string;
  location: string;
  cpdHours: number;
  /** Formatted difference between the standard and member rate, when there is one. */
  memberSavingLabel: string | null;
  atCapacity: boolean;
  tickets: TicketOption[];
  signedIn: { name: string; email: string; company: string } | null;
  existing: { code: string; status: string; checkoutUrl: string | null } | null;
}

interface RegisterResponse {
  ok?: boolean;
  error?: string;
  fields?: Record<string, string>;
  paid?: boolean;
  checkoutUrl?: string;
  registrationCode?: string;
  cpdHours?: number;
}

/* -------------------------------------------------------------------------- */
/* Reference block - the thing you quote at the registration desk  */
/* -------------------------------------------------------------------------- */

function ReferenceBlock({
  code,
  name,
  eventTitle,
  dateLabel,
  timeLabel,
  location,
  cpdHours,
}: {
  code: string;
  name: string;
  eventTitle: string;
  dateLabel: string;
  timeLabel: string;
  location: string;
  cpdHours: number;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="animate-fade-up border border-dashed border-line bg-cyan/10 p-5">
      <div className="flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">
        <span>Registration reference</span>
        <span>BSA</span>
      </div>

      <p className="mt-3 break-all font-display text-3xl leading-none tracking-[0.06em] sm:text-4xl">{code}</p>

      <button
        type="button"
        onClick={copy}
        className="mt-3 border border-line bg-surface px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] shadow-panel panel-hover"
      >
        {copied ? ' Copied' : 'Copy reference'}
      </button>

      <div className="mt-5 space-y-1.5 border-t border-dashed border-line pt-4 text-xs leading-relaxed text-ink-soft">
        <p className="font-display text-sm uppercase leading-tight">{eventTitle}</p>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
          {dateLabel} · {timeLabel}
        </p>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">{location}</p>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">Held for {name}</p>
      </div>

      {cpdHours > 0 && (
        <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-dashed border-line pt-4">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">CPD credit</span>
          <span className="font-display text-2xl leading-none">
            {cpdHours} {cpdHours === 1 ? 'hour' : 'hours'}
          </span>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main  */
/* -------------------------------------------------------------------------- */

export function RegisterClient(props: RegisterClientProps) {
  const {
    eventId,
    eventTitle,
    eventStatus,
    dateLabel,
    timeLabel,
    location,
    cpdHours,
    memberSavingLabel,
    atCapacity,
    tickets,
    signedIn,
    existing,
  } = props;

  const router = useRouter();
  const toast = useToast();

  const firstSelectable = tickets.find((t) => t.isAvailable && t.remaining > 0) ?? tickets[0];

  const [ticketId, setTicketId] = useState<string>(firstSelectable?.id ?? '');
  const [name, setName] = useState(signedIn?.name ?? '');
  const [email, setEmail] = useState(signedIn?.email ?? '');
  const [company, setCompany] = useState(signedIn?.company ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<'error' | 'notice'>('error');
  const [errorNonce, setErrorNonce] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState<{ code: string; name: string; cpdHours: number } | null>(
    existing && existing.status === 'CONFIRMED'
      ? { code: existing.code, name: signedIn?.name || 'you', cpdHours }
      : null,
  );

  const selected = tickets.find((t) => t.id === ticketId) ?? null;
  const closed = eventStatus === 'COMPLETED';
  const draft = eventStatus === 'DRAFT';
  const soldOutEverywhere = tickets.length > 0 && tickets.every((t) => !t.isAvailable || t.remaining <= 0);

  const showError = (message: string, kind: 'error' | 'notice' = 'error') => {
    setError(message);
    setErrorKind(kind);
    setErrorNonce((n) => n + 1);
  };

  async function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    if (pending) return;

    const nextFieldErrors: Record<string, string> = {};
    if (name.trim().length < 2) nextFieldErrors.name = 'We need a name for the attendee list.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) nextFieldErrors.email = 'That address will not reach you.';
    if (!ticketId) nextFieldErrors.ticketId = 'Choose a rate first.';
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      showError('Check the highlighted fields and submit again.');
      return;
    }

    setPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          name: name.trim(),
          email: email.trim(),
          company: company.trim() ? company.trim() : undefined,
        }),
      });
      const data = (await res.json()) as RegisterResponse;

      if (!data.ok) {
        if (data.fields) setFieldErrors(data.fields);
        // 409 covers "already registered", "just sold out" and "at capacity" -
        // informative rather than a failure, so it gets the quieter treatment.
        showError(
          data.error ?? 'That did not go through. Try again in a moment.',
          res.status === 409 ? 'notice' : 'error',
        );
        if (res.status === 409) router.refresh();
        return;
      }

      if (data.paid && data.checkoutUrl) {
        try {
          const target = new URL(data.checkoutUrl, window.location.origin);
          router.push(`${target.pathname}${target.search}`);
        } catch {
          window.location.href = data.checkoutUrl;
        }
        return;
      }

      if (data.registrationCode) {
        const earned = typeof data.cpdHours === 'number' ? data.cpdHours : cpdHours;
        setConfirmed({ code: data.registrationCode, name: name.trim(), cpdHours: earned });
        toast.success(
          'Registration confirmed',
          earned > 0
            ? `${eventTitle} · ${earned} CPD ${earned === 1 ? 'hour' : 'hours'} recorded on attendance.`
            : `${eventTitle} is on your list.`,
        );
        router.refresh();
      }
    } catch {
      showError('The connection dropped mid-booking. Nothing was charged - try again.');
    } finally {
      setPending(false);
    }
  }

  /* ------------------------------- Confirmed ------------------------------ */

  if (confirmed) {
    return (
      <>
        <Card className="border shadow-panel-lg">
          <CardBar tone="lime">
            <span>Place confirmed</span>
            <span></span>
          </CardBar>
          <CardBody className="space-y-4">
            <ReferenceBlock
              code={confirmed.code}
              name={confirmed.name}
              eventTitle={eventTitle}
              dateLabel={dateLabel}
              timeLabel={timeLabel}
              location={location}
              cpdHours={confirmed.cpdHours}
            />

            <p className="text-xs leading-relaxed text-ink-muted">
              The same reference has been emailed to you. Quote it at the registration desk. If you can no longer attend,
              tell us and the place goes to someone on the waiting list.
            </p>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button href="/dashboard" tone="ink" size="sm" className="w-full">
                My registrations
              </Button>
              <Button href="/events" tone="paper" size="sm" className="w-full">
                More events →
              </Button>
            </div>
          </CardBody>
        </Card>

        <ConfirmationModal
          isOpen={true}
          onClose={() => setConfirmed(null)}
          icon="🎟️"
          badgeTone="cyan"
          badgeText="TICKET CONFIRMED"
          title="Event Pass Confirmed!"
          subtitle={`You are registered for "${eventTitle}". Your pass code is ready for venue entry.`}
          details={[
            { label: 'Event', value: eventTitle },
            { label: 'Pass Code', value: confirmed.code },
            { label: 'Venue Location', value: location },
            { label: 'CPD Credits', value: confirmed.cpdHours ? `${confirmed.cpdHours} Hours` : 'Recorded' },
          ]}
          primaryAction={{
            label: 'View My Dashboard',
            href: '/dashboard',
          }}
          secondaryAction={{
            label: 'Close Window',
            onClick: () => setConfirmed(null),
          }}
        />
      </>
    );
  }

  /* --------------------------- Unfinished payment -------------------------- */

  if (existing && existing.status === 'PENDING_PAYMENT') {
    return (
      <Card className="border shadow-panel-lg">
        <CardBar tone="tangerine">
          <span>Place held</span>
          <span>Payment outstanding</span>
        </CardBar>
        <CardBody className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-soft">
            You started a booking and the payment was never completed. The place is held for now. Finish the payment and
            the registration is confirmed.
          </p>
          <p className="border border-dashed border-line bg-amber/10 p-3 font-mono text-[11px] font-bold uppercase tracking-[0.12em]">
            Reference {existing.code} · not valid until paid
          </p>
          {existing.checkoutUrl ? (
            <Button href={existing.checkoutUrl} tone="magenta" size="lg" className="w-full">
              Complete payment
            </Button>
          ) : (
            <Button href="/contact" tone="ink" size="lg" className="w-full">
              Ask us to resolve it
            </Button>
          )}
        </CardBody>
      </Card>
    );
  }

  /* -------------------------------- Closed -------------------------------- */

  if (closed || draft) {
    return (
      <Card className="border shadow-panel-lg">
        <CardBar tone="ink">
          <span>{closed ? 'Registration closed' : 'Not yet open'}</span>
        </CardBar>
        <CardBody className="space-y-4">
          <p className="text-sm leading-relaxed text-ink-soft">
            {closed
              ? 'This event has been held. The programme and speaker list remain on record, and any written summary is circulated to members.'
              : 'This page is published ahead of registration opening. Members are notified first when places are released.'}
          </p>
          <Button href="/events" tone="lime" size="lg" className="w-full">
            See what is coming up
          </Button>
        </CardBody>
      </Card>
    );
  }

  /* --------------------------------- Form --------------------------------- */

  const blocked = atCapacity || soldOutEverywhere;
  const ctaLabel = pending
    ? 'Holding your place…'
    : selected && selected.price > 0
      ? `Continue to payment · ${selected.priceLabel}`
      : 'Confirm my place';

  return (
    <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md shadow-panel-lg overflow-hidden">
      <div className="flex items-center justify-between border-b border-line bg-surface-inset/80 px-6 py-4">
        <span className="text-base font-extrabold text-white flex items-center gap-2">🎟️ {blocked ? 'Waiting List Only' : 'Register For Event'}</span>
        <span className="rounded-full bg-violet/20 border border-violet/40 px-3 py-1 font-mono text-xs font-bold text-violet-bright">
          {cpdHours > 0 ? `${cpdHours} CPD Hours` : 'No CPD'}
        </span>
      </div>

      <div className="p-6">
        {blocked && (
          <div className="mb-5 rounded-xl border border-rose/40 bg-rose/15 p-4 text-xs leading-relaxed text-white">
            <p className="font-mono text-xs font-extrabold uppercase tracking-wider text-rose">At Capacity</p>
            <p className="mt-1">
              Every place is taken. Cancellations are common, so ask to be added to the waiting list and we will pass on
              the first release.
            </p>
            <Button href="/contact" tone="ink" size="sm" className="mt-3">
              Join the waiting list
            </Button>
          </div>
        )}

        {!blocked && memberSavingLabel && (
          <div className="mb-5 rounded-xl border border-cyan/40 bg-cyan/15 p-4">
            <p className="font-mono text-xs font-extrabold uppercase tracking-wider text-cyan">Member Benefit</p>
            <p className="mt-1 text-xs leading-relaxed text-white">
              The member rate saves <strong className="text-cyan font-bold">{memberSavingLabel}</strong> on this event.{' '}
              <Link
                href="/membership"
                className="font-bold text-cyan underline decoration-2 underline-offset-2 hover:text-white transition-colors"
              >
                Membership
              </Link>
            </p>
          </div>
        )}

        <form onSubmit={submit} noValidate>
          <fieldset disabled={pending || blocked} className="space-y-4">
            <legend className="mb-3 block text-xs font-extrabold uppercase tracking-wider text-cyan">
              Choose A Rate
            </legend>

            {tickets.length === 0 && (
              <p className="rounded-xl border border-dashed border-line bg-base p-4 text-xs text-ink-muted">
                Rates for this event have not been published yet. Check back shortly.
              </p>
            )}

            {tickets.map((ticket) => {
              const soldOut = !ticket.isAvailable || ticket.remaining <= 0;
              const active = ticket.id === ticketId && !soldOut;
              const scarce = ticket.remaining > 0 && ticket.remaining <= 15;

              return (
                <label
                  key={ticket.id}
                  className={cn(
                    'flex items-start gap-4 rounded-xl border p-4 transition-all duration-200',
                    active ? 'border-cyan/60 bg-cyan/15 shadow-md shadow-cyan/10' : 'border-line bg-base hover:border-cyan/40 hover:bg-surface-raised',
                    soldOut && 'cursor-not-allowed opacity-50 bg-base',
                  )}
                >
                  <input
                    type="radio"
                    name="ticket"
                    value={ticket.id}
                    checked={active}
                    disabled={soldOut}
                    onChange={() => setTicketId(ticket.id)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                      active ? 'border-cyan bg-cyan/20' : 'border-line bg-surface',
                    )}
                  >
                    {active && <span className="h-2.5 w-2.5 rounded-full bg-cyan shadow-sm shadow-cyan/50" />}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-extrabold uppercase text-white leading-tight">{ticket.name}</span>
                      <span className={cn('shrink-0 font-mono text-sm font-extrabold text-cyan', soldOut && 'line-through text-ink-muted')}>
                        {ticket.priceLabel}
                      </span>
                    </span>
                    {ticket.description && (
                      <span className="mt-1 block text-xs leading-relaxed text-ink-soft">{ticket.description}</span>
                    )}
                    <span className="mt-2 block">
                      {soldOut ? (
                        <span className="inline-block rounded-full bg-rose/20 border border-rose/40 px-2.5 py-0.5 font-mono text-[10px] font-bold text-rose">
                          Sold out
                        </span>
                      ) : (
                        <span className={cn('inline-block rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold', scarce ? 'bg-amber/20 border border-amber/40 text-amber' : 'bg-surface border border-line text-ink-soft')}>
                          {ticket.remaining} remaining
                        </span>
                      )}
                    </span>
                  </span>
                </label>
              );
            })}
            <FieldError>{fieldErrors.ticketId}</FieldError>

            <div className="border-t border-dashed border-line pt-4">
              <Label htmlFor="attendee-name" required>
                Full name
              </Label>
              <Input
                id="attendee-name"
                name="name"
                autoComplete="name"
                value={name}
                invalid={Boolean(fieldErrors.name)}
                onChange={(e) => setName(e.target.value)}
                placeholder="Priya Raman"
              />
              <FieldError>{fieldErrors.name}</FieldError>
            </div>

            <div>
              <Label htmlFor="attendee-email" required hint="where the reference is sent">
                Work email
              </Label>
              <Input
                id="attendee-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                invalid={Boolean(fieldErrors.email)}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@organisation.com"
              />
              <FieldError>{fieldErrors.email}</FieldError>
            </div>

            <div>
              <Label htmlFor="attendee-company" hint="optional">
                Organisation
              </Label>
              <Input
                id="attendee-company"
                name="company"
                autoComplete="organization"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Kestrel Financial"
              />
              <FieldError>{fieldErrors.company}</FieldError>
            </div>
          </fieldset>

          {error && (
            <div
              key={errorNonce}
              role="alert"
              className={cn(
                'mt-4 animate-shake border border-line p-3 text-xs leading-relaxed',
                errorKind === 'notice' ? 'bg-amber/10 text-ink-soft' : 'bg-rose/10 text-ink-soft',
              )}
            >
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em]">
                {errorKind === 'notice' ? 'Worth knowing' : 'That did not work'}
              </p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          <p aria-live="polite" className="sr-only">
            {pending ? 'Submitting your registration' : ''}
          </p>

          <Button
            type="submit"
            tone={blocked ? 'paper' : 'magenta'}
            size="lg"
            disabled={pending || blocked || tickets.length === 0}
            className="mt-5 w-full"
          >
            {blocked ? 'No places left' : ctaLabel}
          </Button>

          <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
            {selected && selected.price > 0
              ? 'Payment on the next screen. Nothing is charged until you confirm.'
              : 'No charge. Please only book if you can attend.'}
          </p>

          {!signedIn && (
            <p className="mt-4 border-t border-dashed border-line pt-3 text-center text-xs text-ink-muted">
              <Link href="/login" className="font-bold text-cyan underline decoration-2 underline-offset-2">
                Sign in
              </Link>{' '}
              to prefill this and keep the registration on your member record.
            </p>
          )}
        </form>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-surface-inset/80 px-6 py-4">
        <Chip size="sm" tone="paper">
          Starts {timeLabel.split(' to ')[0]}
        </Chip>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted">
          Places are transferable to a colleague
        </span>
      </div>
    </div>
  );
}
