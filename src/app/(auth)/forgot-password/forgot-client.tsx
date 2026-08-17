'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FieldError, Input, Label } from '@/components/ui/field';
import { cn } from '@/lib/utils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 30;

type Status = 'idle' | 'pending' | 'sent';

/**
 * The confirmation is deliberately identical whether or not the address has an
 * account - the API says nothing either way, and neither does this screen.
 */
export function ForgotClient({ devMode }: { devMode: boolean }) {
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function send(address: string) {
    setStatus('pending');
    setError(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: address }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!data.ok) {
        setAttempt((n) => n + 1);
        setError(data.error || 'That did not go through. Try again in a moment.');
        setStatus(sentTo ? 'sent' : 'idle');
        return;
      }

      setSentTo(address);
      setStatus('sent');
      setCooldown(RESEND_SECONDS);
    } catch {
      setAttempt((n) => n + 1);
      setError('We could not reach the server. Check your connection, then try again.');
      setStatus(sentTo ? 'sent' : 'idle');
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'pending') return;

    const address = email.trim();
    if (!EMAIL_RE.test(address)) {
      setAttempt((n) => n + 1);
      setLocalError('Type the full address, including the bit after the @.');
      inputRef.current?.focus();
      return;
    }

    setLocalError(null);
    void send(address);
  }

  /* ---------------------------------------------------------------- SENT */
  if (status === 'sent') {
    return (
      <div className="border border-line bg-surface shadow-panel-lg">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-cyan/12 px-4 py-2.5">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]">Check your inbox</span>
          <span aria-hidden className="font-display text-xs"></span>
        </div>

        <div className="space-y-5 p-5 sm:p-7" role="status" aria-live="polite">
          <div className="flex items-start gap-4">
            <span
              aria-hidden
              className="flex h-12 w-12 flex-shrink-0 animate-fade-up items-center justify-center border border-line bg-cyan/12 text-2xl shadow-panel"
            ></span>
            <div className="min-w-0">
              <h2 className="text-display-md">On its way</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                If{' '}
                <span className="break-all border border-line bg-surface-inset px-1.5 py-0.5 font-mono text-[12px] font-bold">
                  {sentTo}
                </span>{' '}
                has a BSA account, a reset link is in the post. It works once and expires in an hour.
              </p>
            </div>
          </div>

          <div className="space-y-2 border border-dashed border-line bg-base p-4 text-xs leading-relaxed text-ink-muted">
            <p>
              <strong className="font-bold text-ink">Nothing after two minutes?</strong> Check spam and promotions, and
              make sure you typed the address you signed up with. We deliberately do not say whether an account exists,
              so no email is not the same as no account.
            </p>
            <p>Asking again retires the previous link, so always use the newest one.</p>
          </div>

          {devMode && (
            <div className="border border-line bg-surface-inset p-4 font-mono text-[11px] leading-relaxed text-ink">
              <p className="mb-1 text-cyan">dev build · console transport</p>
              <p className="text-ink/70">
                No mail provider is configured, so the whole email - reset link included - is printed to the terminal
                running <span className="text-cyan">npm run dev</span>. Copy the URL from there.
              </p>
            </div>
          )}

          {error && (
            <div key={attempt} role="alert" className="animate-shake border border-line bg-rose/10 p-3">
              <p className="text-sm font-bold leading-snug text-ink">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-dashed border-line pt-5 sm:flex-row">
            <Button href="/login" tone="ink" className="flex-1 justify-center">
              Back to sign in
            </Button>
            <button
              type="button"
              disabled={cooldown > 0}
              onClick={() => void send(sentTo)}
              className="flex-1 border border-line bg-surface px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] shadow-panel panel-hover disabled:opacity-50"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Send it again'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setStatus('idle');
              setEmail(sentTo);
              setError(null);
            }}
            className="w-full text-center font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-violet-bright underline underline-offset-2"
          >
            Use a different address
          </button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- FORM */
  return (
    <div className="border border-line bg-surface shadow-panel-lg">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-inset px-4 py-2.5">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink">
          Send me a reset link
        </span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-amber">1 hour ttl</span>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-5 p-5 sm:p-7">
        {(error || localError) && (
          <div
            key={attempt}
            role="alert"
            className={cn(
              'flex animate-shake items-start gap-3 border border-line p-3 shadow-panel',
              error ? 'bg-amber/10' : 'bg-rose/10',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'flex h-6 w-6 flex-shrink-0 items-center justify-center border border-line font-display text-xs',
                error ? 'bg-amber/12 text-ink' : 'bg-grad-brand-soft text-ink',
              )}
            >
              !
            </span>
            <p className="text-sm font-bold leading-snug text-ink">{error ?? localError}</p>
          </div>
        )}

        <div>
          <Label htmlFor="forgot-email" required>
            Email on the account
          </Label>
          <Input
            id="forgot-email"
            ref={inputRef}
            type="email"
            name="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setLocalError(null);
            }}
            invalid={Boolean(localError)}
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            placeholder="you@school.edu"
          />
          <FieldError>{localError ?? undefined}</FieldError>
        </div>

        <Button type="submit" tone="tangerine" size="lg" disabled={status === 'pending'} className="w-full">
          {status === 'pending' ? 'Sending…' : 'Email me a link →'}
        </Button>

        <p aria-live="polite" className="sr-only">
          {status === 'pending' ? 'Sending your reset link.' : ''}
        </p>

        <div className="border border-dashed border-line bg-base p-4 text-xs leading-relaxed text-ink-muted">
          <p>
            <strong className="font-bold text-ink">We will not tell you whether the account exists.</strong> The
            response is the same either way, so nobody can use this form to find out who is registered here.
          </p>
          {devMode && (
            <p className="mt-2">
              Running locally? With no mail provider configured, the reset link is printed straight to the terminal
              running <span className="border border-line bg-surface px-1 font-mono text-ink">npm run dev</span>.
            </p>
          )}
        </div>

        <p className="text-center text-xs text-ink-muted">
          Do not have an account at all?{' '}
          <Link href="/register" className="font-bold text-ink underline underline-offset-2">
            Make one
          </Link>
          .
        </p>
      </form>
    </div>
  );
}
