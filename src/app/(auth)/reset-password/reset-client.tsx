'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FieldError, Input, Label } from '@/components/ui/field';
import { cn } from '@/lib/utils';

/** Same rule as src/lib/validation.ts, mirrored so it can be checked as you type. */
const RULES = [
  { id: 'length', label: '8 characters or more', test: (v: string) => v.length >= 8 },
  { id: 'letter', label: 'At least one letter', test: (v: string) => /[a-zA-Z]/.test(v) },
  { id: 'number', label: 'At least one number', test: (v: string) => /[0-9]/.test(v) },
];

type Status = 'idle' | 'pending' | 'done';

export function ResetClient({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const [tokenDead, setTokenDead] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const ruleState = RULES.map((rule) => ({ ...rule, passed: rule.test(password) }));
  const passwordReady = ruleState.every((rule) => rule.passed);
  const mismatch = confirm.length > 0 && confirm !== password;
  const busy = status !== 'idle';

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const problems: Record<string, string> = {};
    if (!passwordReady) problems.password = 'Eight characters, with a letter and a number.';
    if (confirm !== password) problems.confirm = 'These two do not match yet.';

    if (Object.keys(problems).length > 0) {
      setAttempt((n) => n + 1);
      setFieldError(problems);
      setError('Nearly there. Fix the two boxes below.');
      return;
    }

    setStatus('pending');
    setError(null);
    setFieldError({});

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string; fields?: Record<string, string> };

      if (!data.ok) {
        setAttempt((n) => n + 1);
        setStatus('idle');
        setFieldError(data.fields ?? {});
        setError(data.error || 'That did not work. Try again.');
        // A 400 from this route only ever means the token itself is spent,
        // expired or fake - bad passwords come back as a 422.
        if (res.status === 400) setTokenDead(true);
        return;
      }

      setStatus('done');
    } catch {
      setAttempt((n) => n + 1);
      setStatus('idle');
      setError('We could not reach the server. Check your connection, then try again.');
    }
  }

  /* ------------------------------------------------------------ TOKEN DEAD */
  if (tokenDead) {
    return (
      <div className="border border-line bg-surface shadow-panel-lg">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-grad-brand-soft px-4 py-2.5">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink">Link expired</span>
          <span aria-hidden className="font-display text-xs text-ink">
            ⏱
          </span>
        </div>

        <div className="space-y-5 p-5 sm:p-7" role="alert">
          <div className="flex items-start gap-4">
            <span
              aria-hidden
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center border border-line bg-rose/10 text-2xl shadow-panel"
            >
              ⏱
            </span>
            <div className="min-w-0">
              <h2 className="text-display-md">That link is spent</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Reset links last an hour and work exactly once. This one has either timed out, already been used, or
                been replaced by a newer request. Your password has not changed.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-dashed border-line pt-5 sm:flex-row">
            <Button href="/forgot-password" tone="tangerine" className="flex-1 justify-center">
              Send a fresh link
            </Button>
            <Button href="/login" tone="paper" className="flex-1 justify-center">
              Back to sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------------------- DONE */
  if (status === 'done') {
    return (
      <div className="border border-line bg-surface shadow-panel-lg">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-cyan/12 px-4 py-2.5">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]">Password changed</span>
          <span aria-hidden className="font-display text-xs"></span>
        </div>

        <div className="space-y-5 p-5 sm:p-7" role="status" aria-live="polite">
          <div className="flex items-start gap-4">
            <span
              aria-hidden
              className="flex h-12 w-12 flex-shrink-0 animate-fade-up items-center justify-center border border-line bg-cyan/12 text-2xl shadow-panel"
            ></span>
            <div className="min-w-0">
              <h2 className="text-display-md">Done. That was the hard part.</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Your new password is live and this link has been burned. Everything else on your account is exactly
                where you left it.
              </p>
            </div>
          </div>

          <ul className="space-y-2 border border-dashed border-line bg-cyan/10 p-4 text-xs leading-relaxed text-ink-soft">
            <li>
              <strong className="font-bold">Save it somewhere real</strong> before you close this tab. A password
              manager, not a sticky note on the laptop.
            </li>
            <li>
              <strong className="font-bold">Any other reset links are dead</strong> as of right now.
            </li>
          </ul>

          <div className="border-t border-dashed border-line pt-5">
            <Button href="/login" tone="magenta" size="lg" className="w-full">
              Sign in with it →
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------------------- FORM */
  return (
    <div className="border border-line bg-surface shadow-panel-lg">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-inset px-4 py-2.5">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink">
          Choose a new password
        </span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cyan">token ok</span>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-5 p-5 sm:p-7">
        {error && (
          <div
            key={attempt}
            role="alert"
            className="flex animate-shake items-start gap-3 border border-line bg-rose/10 p-3 shadow-panel"
          >
            <span
              aria-hidden
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center border border-line bg-grad-brand-soft font-display text-xs text-ink"
            >
              !
            </span>
            <p className="text-sm font-bold leading-snug text-ink">{error}</p>
          </div>
        )}

        <div>
          <Label htmlFor="reset-password" required hint="8+ chars, a letter, a number">
            New password
          </Label>
          <div className="relative">
            <Input
              id="reset-password"
              name="password"
              type={revealed ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (typeof event.getModifierState === 'function') setCapsOn(event.getModifierState('CapsLock'));
              }}
              onBlur={() => setCapsOn(false)}
              invalid={Boolean(fieldError.password)}
              autoComplete="new-password"
              required
              placeholder="four random words work great"
              className="pr-[74px]"
              aria-describedby="reset-rules"
            />
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              aria-pressed={revealed}
              aria-label={revealed ? 'Hide password' : 'Show password'}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 border border-line bg-surface-inset px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-cyan/12"
            >
              {revealed ? 'Hide' : 'Show'}
            </button>
          </div>

          <ul id="reset-rules" className="mt-2 flex flex-wrap gap-2">
            {ruleState.map((rule) => (
              <li
                key={rule.id}
                className={cn(
                  'inline-flex items-center gap-1.5 border border-line px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition-colors',
                  rule.passed ? 'bg-cyan/12 text-ink' : 'bg-surface text-ink-muted',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex h-3.5 w-3.5 items-center justify-center border border-line text-[9px] leading-none',
                    rule.passed ? 'bg-surface-inset text-ink' : 'bg-surface-inset',
                  )}
                >
                  {rule.passed ? '' : ''}
                </span>
                {rule.label}
              </li>
            ))}
          </ul>

          {capsOn && (
            <p className="mt-2 inline-flex items-center gap-1.5 border border-line bg-amber/12 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em]">
              <span aria-hidden>⇪</span> Caps lock is on
            </p>
          )}

          <FieldError>{fieldError.password}</FieldError>
        </div>

        <div>
          <Label htmlFor="reset-confirm" required>
            Type it again
          </Label>
          <Input
            id="reset-confirm"
            name="confirm"
            type={revealed ? 'text' : 'password'}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            invalid={mismatch || Boolean(fieldError.confirm)}
            autoComplete="new-password"
            required
            placeholder="the exact same thing"
          />
          {mismatch ? (
            <FieldError>These two do not match yet.</FieldError>
          ) : (
            <FieldError>{fieldError.confirm}</FieldError>
          )}
          {!mismatch && confirm.length > 0 && passwordReady && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink">
              <span aria-hidden className="inline-block h-2 w-2 border border-line bg-cyan/12" /> Match
            </p>
          )}
        </div>

        <Button type="submit" tone="magenta" size="lg" disabled={busy} className="w-full">
          {status === 'pending' ? 'Saving…' : 'Save it and sign in →'}
        </Button>

        <p aria-live="polite" className="sr-only">
          {status === 'pending' ? 'Saving your new password.' : error ? error : ''}
        </p>

        <p className="text-center text-xs text-ink-muted">
          Changed your mind?{' '}
          <Link href="/login" className="font-bold text-ink underline underline-offset-2">
            Go back to sign in
          </Link>{' '}
          and leave the password as it was.
        </p>
      </form>
    </div>
  );
}
