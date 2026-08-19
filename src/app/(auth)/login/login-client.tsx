'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { EnvelopeSimple, LockSimple, Eye, EyeSlash, ShieldCheck, ArrowRight, Warning, CheckCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

type Status = 'idle' | 'pending' | 'done';
type Failure = { message: string; kind: 'auth' | 'limit' | 'network' };

export function LoginClient({ redirectTo }: { redirectTo: string | null }) {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [failure, setFailure] = useState<Failure | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [touched, setTouched] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const busy = status !== 'idle';
  const emailLooksWrong = touched && email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function signIn(nextEmail: string, nextPassword: string) {
    if (busy) return;

    setStatus('pending');
    setFailure(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nextEmail, password: nextPassword }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string; role?: string };

      if (!data.ok) {
        setAttempt((n) => n + 1);
        setFailure({
          message: data.error || 'Invalid credentials. Please verify your email and password.',
          kind: res.status === 429 ? 'limit' : 'auth',
        });
        setStatus('idle');
        passwordRef.current?.focus();
        passwordRef.current?.select();
        return;
      }

      setStatus('done');
      router.push(redirectTo || (data.role === 'ADMIN' ? '/admin' : '/dashboard'));
      router.refresh();
    } catch {
      setAttempt((n) => n + 1);
      setFailure({
        message: 'Network connection issue. Please check your network and try again.',
        kind: 'network',
      });
      setStatus('idle');
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    void signIn(email.trim(), password);
  }

  function trackCaps(event: React.KeyboardEvent<HTMLInputElement>) {
    if (typeof event.getModifierState !== 'function') return;
    setCapsOn(event.getModifierState('CapsLock'));
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-cyan/30 bg-[#0B0F19]/90 p-6 backdrop-blur-2xl shadow-[0_0_50px_rgba(6,182,212,0.12)] sm:p-8">
      {/* Top ambient glow */}
      <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-cyan/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-violet/20 blur-3xl" />

      {/* Header Badge */}
      <div className="mb-6 flex items-center justify-between border-b border-cyan/20 pb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan shadow-[0_0_8px_#06b6d4]"></span>
          </span>
          <span className="font-mono text-xs font-black uppercase tracking-widest text-white">
            SECURE ACCESS GATEWAY
          </span>
        </div>
        <span className="rounded-full border border-cyan/40 bg-cyan/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan">
          TLS 1.3
        </span>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {/* Error Alert */}
        <AnimatePresence>
          {failure && (
            <motion.div
              key={attempt}
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              role="alert"
              className={cn(
                'flex items-start gap-3 rounded-2xl border p-4 shadow-lg backdrop-blur-md',
                failure.kind === 'limit'
                  ? 'border-amber/50 bg-amber/15 text-amber'
                  : 'border-rose/50 bg-rose/15 text-rose-bright',
              )}
            >
              <Warning className="h-5 w-5 flex-shrink-0 mt-0.5 text-current" />
              <div className="min-w-0 flex-1 text-xs">
                <p className="font-bold leading-snug">{failure.message}</p>
                {failure.kind === 'auth' && (
                  <p className="mt-1 text-[11px] opacity-80">
                    Need help logging in? Use{' '}
                    <Link href="/forgot-password" className="font-bold underline underline-offset-2 hover:text-white">
                      Password Reset
                    </Link>.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email Field */}
        <div className="space-y-1.5">
          <label htmlFor="login-email" className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-white/90">
            <EnvelopeSimple className="h-4 w-4 text-cyan" />
            Email Address
          </label>
          <div className="relative">
            <input
              id="login-email"
              ref={emailRef}
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setTouched(true)}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              placeholder="you@company.com"
              className={cn(
                'w-full rounded-2xl border bg-[#111726]/90 px-4 py-3.5 pl-11 font-sans text-sm font-semibold text-white placeholder:text-white/30 outline-none transition-all duration-300',
                emailLooksWrong
                  ? 'border-rose/60 focus:border-rose focus:shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                  : 'border-cyan/30 focus:border-cyan focus:shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:border-cyan/50',
              )}
            />
            <EnvelopeSimple className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan/70 pointer-events-none" />
          </div>
          {emailLooksWrong && (
            <p className="font-mono text-[10px] font-bold text-rose-bright flex items-center gap-1 mt-1">
              <span>⚠️</span> Please enter a valid email address
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-white/90">
              <LockSimple className="h-4 w-4 text-cyan" />
              Password
            </label>
            <Link
              href="/forgot-password"
              className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan hover:text-cyan-bright transition-colors"
            >
              Forgot Password?
            </Link>
          </div>

          <div className="relative">
            <input
              id="login-password"
              ref={passwordRef}
              type={revealed ? 'text' : 'password'}
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={trackCaps}
              onKeyUp={trackCaps}
              onBlur={() => setCapsOn(false)}
              autoComplete="current-password"
              required
              placeholder="••••••••••••"
              className="w-full rounded-2xl border border-cyan/30 bg-[#111726]/90 px-4 py-3.5 pl-11 pr-12 font-sans text-sm font-semibold text-white placeholder:text-white/30 outline-none transition-all duration-300 focus:border-cyan focus:shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:border-cyan/50"
            />
            <LockSimple className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan/70 pointer-events-none" />
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              aria-pressed={revealed}
              aria-label={revealed ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-white/50 hover:text-cyan transition-colors"
            >
              {revealed ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {capsOn && (
            <p className="inline-flex items-center gap-1.5 rounded-lg border border-amber/40 bg-amber/15 px-2.5 py-1 font-mono text-[10px] font-bold text-amber">
              <span>⇪</span> CAPS LOCK IS ACTIVE
            </p>
          )}
        </div>

        {/* Submit Button */}
        <motion.button
          type="submit"
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          disabled={busy}
          className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-cyan via-cyan-bright to-violet py-4 font-display text-sm font-black uppercase tracking-wider text-void shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] disabled:opacity-50"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {status === 'pending' ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-void border-t-transparent animate-spin" />
                Authenticating Network…
              </>
            ) : status === 'done' ? (
              <>
                <CheckCircle className="h-5 w-5 text-void" />
                Authenticated! Redirecting…
              </>
            ) : (
              <>
                <span>Sign In to BSA</span>
                <ArrowRight weight="bold" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </span>
        </motion.button>
      </form>
    </div>
  );
}

