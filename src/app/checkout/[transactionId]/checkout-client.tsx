'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardBar, CardBody } from '@/components/ui/card';
import { Chip } from '@/components/ui/badge';
import { Input, Label } from '@/components/ui/field';
import { Sticker } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

export interface CheckoutClientProps {
  transactionId: string;
  provider: string;
  /** Pre-formatted on the server via formatMoney. */
  amountLabel: string;
  ticketName: string;
  eventSlug: string;
  eventTitle: string;
  dateLabel: string;
  timeLabel: string;
  location: string;
  attendeeName: string;
  attendeeEmail: string;
  registrationCode: string;
  cpdHours: number;
}

interface ConfirmResponse {
  ok?: boolean;
  error?: string;
  settled?: boolean;
  alreadySettled?: boolean;
  cancelled?: boolean;
  registrationCode?: string;
}

const PAY_STEPS = [
  'opening a session with the gateway',
  'checking the place is still held',
  'settling the transaction',
  'issuing the registration reference',
];

/* -------------------------------------------------------------------------- */
/* Reference block  */
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

      <div className="mt-5 space-y-1.5 border-t border-dashed border-line pt-4">
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

export function CheckoutClient(props: CheckoutClientProps) {
  const {
    transactionId,
    provider,
    amountLabel,
    ticketName,
    eventSlug,
    eventTitle,
    dateLabel,
    timeLabel,
    location,
    attendeeName,
    attendeeEmail,
    registrationCode,
    cpdHours,
  } = props;

  const router = useRouter();
  const toast = useToast();

  const [status, setStatus] = useState<'idle' | 'processing' | 'cancelling' | 'paid'>('idle');
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errorNonce, setErrorNonce] = useState(0);
  const [code, setCode] = useState(registrationCode);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const id of pending) window.clearTimeout(id);
    };
  }, []);

  const busy = status === 'processing' || status === 'cancelling';

  const fail = (message: string) => {
    setError(message);
    setErrorNonce((n) => n + 1);
  };

  async function settle(outcome: 'SUCCESS' | 'CANCEL') {
    if (busy) return;
    setError(null);
    setStatus(outcome === 'SUCCESS' ? 'processing' : 'cancelling');

    if (outcome === 'SUCCESS') {
      setLog([]);
      PAY_STEPS.forEach((step, i) => {
        timers.current.push(window.setTimeout(() => setLog((current) => [...current, step]), 260 * (i + 1)));
      });
    }

    try {
      const [res] = await Promise.all([
        fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId, outcome }),
        }),
        // The gateway is instant; the pause is so the state change is legible.
        new Promise((resolve) => setTimeout(resolve, outcome === 'SUCCESS' ? 1150 : 450)),
      ]);
      const data = (await res.json()) as ConfirmResponse;

      if (!data.ok) {
        setStatus('idle');
        fail(data.error ?? 'The gateway did not answer. Nothing was taken - try again.');
        return;
      }

      if (outcome === 'CANCEL') {
        toast.push({
          title: 'Checkout cancelled',
          body: 'The place returned to the pool. No charge was made.',
          emoji: '↩',
          tone: 'tangerine',
        });
        router.push(`/events/${eventSlug}`);
        router.refresh();
        return;
      }

      if (data.registrationCode) setCode(data.registrationCode);
      setStatus('paid');
      toast.success('Payment settled', `Your place at ${eventTitle} is confirmed.`);
      router.refresh();
    } catch {
      setStatus('idle');
      fail('The connection dropped mid-payment. Reload this page before trying again.');
    }
  }

  /* ------------------------------ Paid state ------------------------------ */

  if (status === 'paid') {
    return (
      <Card className="border shadow-panel-lg">
        <CardBar tone="lime">
          <span>Payment settled</span>
          <span>{amountLabel}</span>
        </CardBar>
        <CardBody className="space-y-4">
          <ReferenceBlock
            code={code}
            name={attendeeName}
            eventTitle={eventTitle}
            dateLabel={dateLabel}
            timeLabel={timeLabel}
            location={location}
            cpdHours={cpdHours}
          />

          <p className="text-xs leading-relaxed text-ink-muted">
            The receipt and reference are on their way to{' '}
            <span className="font-mono font-bold text-ink-soft">{attendeeEmail}</span>. Transaction{' '}
            <span className="font-mono font-bold text-ink-soft">{transactionId}</span> was settled against the
            development gateway, so no money actually moved.
          </p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button href={`/events/${eventSlug}`} tone="ink" size="sm" className="w-full">
              Event details
            </Button>
            <Button href="/dashboard" tone="paper" size="sm" className="w-full">
              My registrations
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  /* -------------------------------- Gateway ------------------------------- */

  return (
    <Card className="relative border shadow-panel-lg">
      <CardBar tone="ink">
        <span>Payment</span>
        <span className="text-ink">{provider}</span>
      </CardBar>

      <CardBody className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">Amount due</p>
            <p className="mt-1 font-display text-4xl leading-none">{amountLabel}</p>
            <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
              {ticketName}
            </p>
          </div>
          <Sticker tone="magenta" rotate={6} className="mt-1 max-w-[130px] text-[9px] leading-snug">
            DEV GATEWAY - no real money moves
          </Sticker>
        </div>

        {/* Deliberately dead card form */}
        <fieldset disabled className="relative border border-dashed border-line bg-surface-inset/50 p-4">
          <legend className="border border-line bg-surface px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-ink-muted">
            Card details · switched off
          </legend>

          <span
            aria-hidden
            className="pointer-events-none absolute right-3 top-8 -rotate-12 border border-violet/40 px-2 py-1 font-display text-[10px] uppercase text-rose"
          >
            Not wired up
          </span>

          <div className="space-y-3 opacity-55">
            <div>
              <Label htmlFor="fake-card">Card number</Label>
              <Input id="fake-card" value="4242 4242 4242 4242" readOnly tabIndex={-1} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="fake-exp">Expiry</Label>
                <Input id="fake-exp" value="12 / 34" readOnly tabIndex={-1} />
              </div>
              <div>
                <Label htmlFor="fake-cvc">CVC</Label>
                <Input id="fake-cvc" value="•••" readOnly tabIndex={-1} />
              </div>
            </div>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
            These fields do nothing. There is no card processor behind this build, so the buttons below simply flip the
            transaction record in the database.
          </p>
        </fieldset>

        {/* Processing theatre */}
        {status === 'processing' && (
          <div className="border border-line bg-surface-inset p-4 font-mono text-[11px] leading-relaxed text-ink">
            <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-ink/60">gateway log</p>
            {log.map((line) => (
              <p key={line} className="animate-fade-up">
                <span className="text-cyan">→</span> {line}
              </p>
            ))}
            <p>
              <span className="ml-0 inline-block h-3 w-2 animate-caret-blink bg-cyan/12 align-middle" />
            </p>
          </div>
        )}

        {error && (
          <div key={errorNonce} role="alert" className="animate-shake border border-line bg-rose/10 p-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-rose">Gateway declined</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">{error}</p>
          </div>
        )}

        <p aria-live="polite" className="sr-only">
          {status === 'processing' ? 'Processing your payment' : status === 'cancelling' ? 'Cancelling checkout' : ''}
        </p>

        <div className="space-y-2">
          <Button
            tone="magenta"
            size="lg"
            className={cn('w-full', busy && 'pointer-events-none')}
            disabled={busy}
            onClick={() => settle('SUCCESS')}
          >
            {status === 'processing' ? 'Contacting the gateway…' : `Pay ${amountLabel}`}
          </Button>

          <Button tone="paper" size="md" className="w-full" disabled={busy} onClick={() => settle('CANCEL')}>
            {status === 'cancelling' ? 'Releasing the place…' : 'Cancel and release my place'}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-line pt-3">
          <Chip size="sm" tone="paper">
            Development gateway
          </Chip>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted">{transactionId}</span>
        </div>
      </CardBody>
    </Card>
  );
}
