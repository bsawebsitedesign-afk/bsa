'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  EnvelopeSimple,
  LockSimple,
  Eye,
  EyeSlash,
  Buildings,
  At,
  CheckCircle,
  Warning,
  ArrowRight,
  Sparkle,
  ShieldCheck,
  Check,
} from '@phosphor-icons/react';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useToast } from '@/components/ui/toast';
import { cn, slugify } from '@/lib/utils';

const MEMBER_TYPES = [
  { value: 'PROFESSIONAL', label: 'Professional · In-house security role' },
  { value: 'LEADER', label: 'Executive Leader · Heads a security function / CISO' },
  { value: 'CONSULTANT', label: 'Consultant · Independent practice or advisor' },
  { value: 'VENDOR', label: 'Vendor · Product maker or service provider' },
  { value: 'ORGANISATION', label: 'Organisation · Industry body, research or institute' },
] as const;

const RULES = [
  { id: 'length', label: '8+ Characters', test: (v: string) => v.length >= 8 },
  { id: 'letter', label: 'At least 1 Letter', test: (v: string) => /[a-zA-Z]/.test(v) },
  { id: 'number', label: 'At least 1 Number', test: (v: string) => /[0-9]/.test(v) },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = 'idle' | 'pending' | 'done';

export function RegisterClient() {
  const router = useRouter();
  const toast = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [org, setOrg] = useState('');
  const [memberType, setMemberType] = useState<string>('PROFESSIONAL');
  const [handle, setHandle] = useState('');
  const [revealed, setRevealed] = useState(false);

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);

  const busy = status !== 'idle';

  const suggested = useMemo(() => slugify(fullName).replace(/-/g, '_').slice(0, 18), [fullName]);
  const previewHandle = handle || suggested || 'your_handle';

  const ruleState = RULES.map((rule) => ({ ...rule, passed: rule.test(password) }));
  const passwordReady = ruleState.every((rule) => rule.passed);
  const handleTooShort = handle.length > 0 && handle.length < 3;

  const steps = [fullName.trim().length >= 2, EMAIL_RE.test(email.trim()), passwordReady, org.trim().length >= 2];
  const done = steps.filter(Boolean).length;
  const ready = done === steps.length && !handleTooShort;

  function clearFieldError(key: string) {
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function onHandleChange(raw: string) {
    setHandle(
      raw
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .slice(0, 20),
    );
    clearFieldError('handle');
  }

  function localErrors(): Record<string, string> {
    const found: Record<string, string> = {};
    if (fullName.trim().length < 2) found.fullName = 'Tell us your full name.';
    if (!EMAIL_RE.test(email.trim())) found.email = 'Please enter a valid email address.';
    if (!passwordReady) found.password = '8 characters minimum, with a letter and a number.';
    if (org.trim().length < 2) found.org = 'Company or organisation name is required.';
    if (handleTooShort) found.handle = 'Handles must be at least 3 characters.';
    return found;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const problems = localErrors();
    if (Object.keys(problems).length > 0) {
      setAttempt((n) => n + 1);
      setFieldErrors(problems);
      setEmailTaken(false);
      setError('Please fill in the required fields before submitting.');
      return;
    }

    setStatus('pending');
    setError(null);
    setEmailTaken(false);
    setFieldErrors({});

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          org: org.trim(),
          memberType,
          ...(handle ? { handle } : {}),
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        fields?: Record<string, string>;
        role?: string;
        handle?: string;
      };

      if (!data.ok) {
        setAttempt((n) => n + 1);
        setError(data.error || 'Registration failed. Please check your details and try again.');
        setFieldErrors(data.fields ?? {});
        setEmailTaken(Boolean(data.fields?.email) && res.status === 409);
        setStatus('idle');
        return;
      }

      setStatus('done');
      toast.push({
        title: `Registration Submitted for @${data.handle ?? previewHandle}`,
        body: 'Your registration request is pending administrator activation.',
        emoji: '⏳',
        tone: 'tangerine',
      });
    } catch {
      setAttempt((n) => n + 1);
      setError('We could not reach the server. Check your connection, then try again.');
      setStatus('idle');
    }
  }

  if (status === 'done') {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-amber/40 bg-[#0D121F]/90 p-8 backdrop-blur-2xl shadow-[0_0_50px_rgba(245,158,11,0.2)] text-center space-y-5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber/40 bg-amber/15 text-3xl shadow-[0_0_20px_rgba(245,158,11,0.3)]">
          ⏳
        </div>
        <h2 className="text-2xl font-black text-white">Registration Request Submitted</h2>
        <p className="text-sm text-white/70 leading-relaxed max-w-md mx-auto">
          Welcome to the Business Security Alliance! Your member profile has been created and submitted for executive administrator verification.
        </p>
        <div className="p-4 rounded-2xl border border-dashed border-amber/30 bg-amber/10 font-mono text-xs text-amber text-left space-y-1.5">
          <p>• Account Handle: <strong className="text-white font-bold">@{handle || previewHandle}</strong></p>
          <p>• Email Address: <strong className="text-white font-bold">{email}</strong></p>
          <p>• Status: <strong className="text-amber font-bold">Pending Admin Activation</strong></p>
        </div>
        <div className="pt-3 flex flex-col sm:flex-row justify-center gap-3">
          <Link
            href="/login"
            className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 font-mono text-xs font-bold text-white hover:bg-white/20 transition-all"
          >
            Go to Sign In
          </Link>
          <Link
            href="/"
            className="rounded-2xl bg-cyan px-5 py-3 font-mono text-xs font-black text-void hover:bg-cyan-bright shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all"
          >
            Return to Home
          </Link>
        </div>

        <ConfirmationModal
          isOpen={true}
          onClose={() => setStatus('idle')}
          icon="⏳"
          badgeTone="amber"
          badgeText="PENDING ADMIN ACTIVATION"
          title="Welcome to BSA Network!"
          subtitle="Your account registration request has been submitted to executive administration for verification."
          details={[
            { label: 'Name', value: fullName },
            { label: 'Handle', value: `@${handle || previewHandle}` },
            { label: 'Email', value: email },
            { label: 'Status', value: 'Pending Approval' },
          ]}
          primaryAction={{
            label: 'Go to Sign In',
            href: '/login',
          }}
          secondaryAction={{
            label: 'Return to Home',
            href: '/',
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-cyan/30 bg-[#0B0F19]/90 p-6 backdrop-blur-2xl shadow-[0_0_50px_rgba(6,182,212,0.12)] sm:p-8">
      {/* Top Ambient Orbs */}
      <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-cyan/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-violet/20 blur-3xl" />

      {/* Header Badge & Progress Indicator */}
      <div className="mb-6 flex items-center justify-between border-b border-cyan/20 pb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan shadow-[0_0_8px_#06b6d4]"></span>
          </span>
          <span className="font-mono text-xs font-black uppercase tracking-widest text-white">
            MEMBER PROFILE REGISTRATION
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {steps.map((filled, i) => (
            <span
              key={i}
              className={cn(
                'h-2 w-6 rounded-full transition-all duration-300',
                filled ? 'bg-cyan shadow-[0_0_8px_#06b6d4]' : 'bg-white/10',
              )}
            />
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              key={attempt}
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-rose/50 bg-rose/15 p-4 text-rose-bright backdrop-blur-md shadow-lg"
            >
              <Warning className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1 text-xs">
                <p className="font-bold leading-snug">{error}</p>
                {emailTaken && (
                  <p className="mt-1 text-[11px] opacity-90">
                    An account with this email already exists.{' '}
                    <Link href="/login" className="font-bold underline hover:text-white">
                      Sign in instead
                    </Link>{' '}
                    or{' '}
                    <Link href="/forgot-password" className="font-bold underline hover:text-white">
                      reset password
                    </Link>.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Full Name & Email */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="reg-name" className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-white/90">
              <User className="h-4 w-4 text-cyan" />
              Full Name *
            </label>
            <input
              id="reg-name"
              name="fullName"
              type="text"
              value={fullName}
              onChange={(event) => {
                setFullName(event.target.value);
                clearFieldError('fullName');
              }}
              autoComplete="name"
              required
              placeholder="e.g. Dr. Sarah Jenkins"
              className={cn(
                'w-full rounded-2xl border bg-[#111726]/90 px-4 py-3.5 font-sans text-sm font-semibold text-white placeholder:text-white/30 outline-none transition-all duration-300',
                fieldErrors.fullName
                  ? 'border-rose/60 focus:border-rose focus:shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                  : 'border-cyan/30 focus:border-cyan focus:shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:border-cyan/50',
              )}
            />
            {fieldErrors.fullName && (
              <p className="font-mono text-[10px] font-bold text-rose-bright flex items-center gap-1">
                <span>⚠️</span> {fieldErrors.fullName}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-email" className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-white/90">
              <EnvelopeSimple className="h-4 w-4 text-cyan" />
              Email Address *
            </label>
            <input
              id="reg-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                clearFieldError('email');
              }}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              placeholder="you@company.com"
              className={cn(
                'w-full rounded-2xl border bg-[#111726]/90 px-4 py-3.5 font-sans text-sm font-semibold text-white placeholder:text-white/30 outline-none transition-all duration-300',
                fieldErrors.email
                  ? 'border-rose/60 focus:border-rose focus:shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                  : 'border-cyan/30 focus:border-cyan focus:shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:border-cyan/50',
              )}
            />
            {fieldErrors.email && (
              <p className="font-mono text-[10px] font-bold text-rose-bright flex items-center gap-1">
                <span>⚠️</span> {fieldErrors.email}
              </p>
            )}
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="reg-password" className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-white/90">
              <LockSimple className="h-4 w-4 text-cyan" />
              Password *
            </label>
            <span className="font-mono text-[10px] text-white/50">8+ Chars, 1 Letter, 1 Number</span>
          </div>

          <div className="relative">
            <input
              id="reg-password"
              name="password"
              type={revealed ? 'text' : 'password'}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                clearFieldError('password');
              }}
              autoComplete="new-password"
              required
              placeholder="••••••••••••"
              className={cn(
                'w-full rounded-2xl border bg-[#111726]/90 px-4 py-3.5 pr-12 font-sans text-sm font-semibold text-white placeholder:text-white/30 outline-none transition-all duration-300',
                fieldErrors.password
                  ? 'border-rose/60 focus:border-rose focus:shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                  : 'border-cyan/30 focus:border-cyan focus:shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:border-cyan/50',
              )}
            />
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

          {/* Password Rules Indicators */}
          <div className="flex flex-wrap gap-2 pt-1">
            {ruleState.map((rule) => (
              <span
                key={rule.id}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[10px] font-bold uppercase transition-all duration-300',
                  rule.passed
                    ? 'border-lime/50 bg-lime/15 text-lime shadow-[0_0_10px_rgba(132,204,22,0.2)]'
                    : 'border-white/10 bg-white/5 text-white/40',
                )}
              >
                {rule.passed ? <Check className="h-3 w-3 text-lime" /> : <span className="h-1.5 w-1.5 rounded-full bg-white/30" />}
                {rule.label}
              </span>
            ))}
          </div>
          {fieldErrors.password && (
            <p className="font-mono text-[10px] font-bold text-rose-bright flex items-center gap-1">
              <span>⚠️</span> {fieldErrors.password}
            </p>
          )}
        </div>

        {/* Company & Role */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="reg-org" className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-white/90">
              <Buildings className="h-4 w-4 text-cyan" />
              Company / Organisation *
            </label>
            <input
              id="reg-org"
              name="org"
              type="text"
              value={org}
              onChange={(event) => {
                setOrg(event.target.value);
                clearFieldError('org');
              }}
              autoComplete="organization"
              required
              placeholder="e.g. Aegis Security Systems"
              className={cn(
                'w-full rounded-2xl border bg-[#111726]/90 px-4 py-3.5 font-sans text-sm font-semibold text-white placeholder:text-white/30 outline-none transition-all duration-300',
                fieldErrors.org
                  ? 'border-rose/60 focus:border-rose focus:shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                  : 'border-cyan/30 focus:border-cyan focus:shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:border-cyan/50',
              )}
            />
            {fieldErrors.org && (
              <p className="font-mono text-[10px] font-bold text-rose-bright flex items-center gap-1">
                <span>⚠️</span> {fieldErrors.org}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-stage" className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-white/90">
              <ShieldCheck className="h-4 w-4 text-cyan" />
              Industry Role Category
            </label>
            <select
              id="reg-stage"
              name="memberType"
              value={memberType}
              onChange={(event) => setMemberType(event.target.value)}
              className="w-full rounded-2xl border border-cyan/30 bg-[#111726]/90 px-4 py-3.5 font-sans text-xs font-bold text-white outline-none transition-all duration-300 focus:border-cyan focus:shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:border-cyan/50"
            >
              {MEMBER_TYPES.map((option) => (
                <option key={option.value} value={option.value} className="bg-[#0B0F19] text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Handle Picker */}
        <div className="rounded-2xl border border-cyan/25 bg-[#090D16]/80 p-4 backdrop-blur-xl space-y-2">
          <label htmlFor="reg-handle" className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-cyan">
            <At className="h-4 w-4 text-cyan" />
            Pick Your Network Handle (Optional)
          </label>

          <div className="relative flex items-center">
            <span className="absolute left-3.5 font-mono text-sm font-black text-cyan">@</span>
            <input
              id="reg-handle"
              name="handle"
              type="text"
              value={handle}
              onChange={(event) => onHandleChange(event.target.value)}
              maxLength={20}
              placeholder={suggested || 'lowercase_and_numbers'}
              className="w-full rounded-xl border border-cyan/30 bg-[#111726]/90 px-4 py-2.5 pl-8 font-mono text-xs font-bold text-white placeholder:text-white/30 outline-none focus:border-cyan focus:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-medium text-white/60">
            <span>
              Directory Handle Preview:{' '}
              <strong className="font-mono text-cyan">@{previewHandle}</strong>
            </span>
            <span className="font-mono text-[10px] text-white/40">
              {handle ? `${20 - handle.length} chars left` : 'Auto-generated if left blank'}
            </span>
          </div>

          {handleTooShort && (
            <p className="font-mono text-[10px] font-bold text-rose-bright">⚠️ Handles require at least 3 characters.</p>
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
                Submitting Access Request…
              </>
            ) : (
              <>
                <span>Submit Access Request</span>
                <ArrowRight weight="bold" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </span>
        </motion.button>
      </form>
    </div>
  );
}

