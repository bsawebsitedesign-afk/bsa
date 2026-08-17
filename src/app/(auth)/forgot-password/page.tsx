import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { env } from '@/lib/env';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/ui/reveal';
import { Sticker } from '@/components/ui/misc';
import { ForgotClient } from './forgot-client';

export const metadata: Metadata = {
  title: 'Reset your password',
  description: 'Send yourself a one-time BSA password reset link. It lands in your inbox and works for an hour.',
  robots: { index: false, follow: true },
};

const STEPS = [
  {
    n: '01',
    title: 'You tell us the address',
    body: 'The address on your member record. If you are not sure which one that is, contact us and we will check.',
  },
  {
    n: '02',
    title: 'A one-time link arrives',
    body: 'Usually inside a minute. It works once, it dies after an hour, and it retires every older link you asked for.',
  },
  {
    n: '03',
    title: 'You pick a new password',
    body: 'Eight characters with a letter and a number. Then you are straight back in, streak and all.',
  },
];

export default function ForgotPasswordPage() {
  return (
    <div className="overflow-x-hidden">
      <section className="relative border-b border-line bg-base">
        <div className="absolute inset-0 mesh-grid" aria-hidden />

        <div className="relative mx-auto grid max-w-container-max grid-cols-1 items-start gap-10 px-4 py-12 lg:grid-cols-12 lg:gap-14 lg:px-10 lg:py-20">
          {/* ==============================================================
 FORM COLUMN
 ============================================================== */}
          <div className="lg:col-span-6">
            <Reveal direction="down">
              <div className="mb-5 inline-flex items-center gap-2 border border-line bg-amber/12 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] shadow-panel">
                Password reset
              </div>
            </Reveal>

            <Reveal direction="up" delay={0.04}>
              <h1 className="text-display-lg">
                <span className="block">FORGOT IT?</span>
                <span className="relative inline-block">
                  <span className="relative z-10">HAPPENS.</span>
                  <span aria-hidden className="absolute -bottom-1 left-0 h-5 w-full -rotate-1 bg-amber/12 sm:h-7" />
                </span>
              </h1>
            </Reveal>

            <Reveal direction="up" delay={0.1}>
              <p className="mt-5 max-w-md text-base leading-relaxed text-ink-soft">
                Tell us the email on the account and we will send a one-time link. Nothing changes until you use it.
              </p>
            </Reveal>

            <Reveal direction="up" delay={0.16}>
              <div className="mt-7">
                <ForgotClient devMode={env.isDev} />
              </div>
            </Reveal>

            <Reveal direction="up" delay={0.2}>
              <p className="mt-6 text-center text-sm text-ink-muted lg:text-left">
                Remembered it halfway through?{' '}
                <Link
                  href="/login"
                  className="font-bold text-ink underline decoration-rose decoration-2 underline-offset-4"
                >
                  Back to sign in
                </Link>
                .
              </p>
            </Reveal>
          </div>

          {/* ==============================================================
 PANEL COLUMN - the email preview + steps
 ============================================================== */}
          <div className="lg:col-span-6">
            <Reveal direction="left" delay={0.12}>
              <div className="relative">
                <Sticker tone="magenta" rotate={8} className="absolute -right-2 -top-5 z-20 text-[10px]">
                  works once
                </Sticker>

                {/* A flat mock of the mail that is about to land. */}
                <div className="border border-line bg-surface shadow-panel-lg">
                  <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-inset px-4 py-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">
                      Inbox · preview
                    </span>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">
                      1 unread
                    </span>
                  </div>

                  <div className="space-y-1 border-b border-dashed border-line p-4 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                    <p>
                      From: <span className="text-ink">members@bsa.dev</span>
                    </p>
                    <p>
                      Subject: <span className="text-ink">Reset your BSA password</span>
                    </p>
                  </div>

                  <div className="p-5">
                    <div className="border border-line">
                      <div className="border-b border-line bg-cyan/12 px-4 py-3 font-display text-base leading-none">
                        BSA // BUILD · BREAK · SECURE
                      </div>
                      <div className="space-y-3 p-4 text-sm leading-relaxed text-ink-soft">
                        <p>Hey there,</p>
                        <p>
                          Someone asked to reset the password on your BSA account. This link works once and expires in
                          one hour.
                        </p>
                        <span className="inline-flex border border-line bg-grad-brand-soft px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink shadow-panel">
                          Reset my password
                        </span>
                        <p className="text-xs text-ink-muted">
                          If that was not you, ignore it. Nothing changes until the link is opened.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal direction="left" delay={0.18}>
              <ol className="mt-6 space-y-3">
                {STEPS.map((step, i) => (
                  <li
                    key={step.n}
                    className={`flex items-start gap-4 border border-line bg-surface p-4 shadow-panel ${
                      i % 2 === 0 ? '' : ''
                    }`}
                  >
                    <span
                      aria-hidden
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center border border-line bg-amber/12 font-display text-sm shadow-panel"
                    >
                      {step.n}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.14em]">
                        {step.title}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-ink-muted">{step.body}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-surface py-12">
        <div className="mx-auto flex max-w-container-max flex-col items-center gap-5 px-4 text-center lg:flex-row lg:justify-between lg:px-10 lg:text-left">
          <div>
            <h2 className="text-display-md">Lost the email address itself?</h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-muted">
              Addresses change when people move organisation. Contact us with your member handle and we will move the
              account to an address you can actually read.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button href="/contact" tone="ink">
              Contact the membership team
            </Button>
            <Button href="/register" tone="paper">
              Start fresh instead
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
