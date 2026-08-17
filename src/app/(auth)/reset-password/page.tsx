import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/ui/reveal';
import { Sticker } from '@/components/ui/misc';
import { ResetClient } from './reset-client';

/** The token lives in the query string, so nothing here can be cached. */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Choose a new password',
  description: 'Finish your BSA password reset and sign back in.',
  robots: { index: false, follow: false },
};

const RECEIPT = [
  { label: 'Password re-hashed', detail: 'Stored as a bcrypt hash. Nobody at BSA can read it, us included.' },
  { label: 'This link burned', detail: 'One use only. Opening it again after you save does nothing.' },
  { label: 'Older links retired', detail: 'Every other reset link on your account stops working at the same moment.' },
  {
    label: 'Nothing else changes',
    detail: 'Your profile, registrations, chapter membership and saved progress stay exactly as they were.',
  },
];

const TIPS = [
  {
    emoji: '',
    title: 'Four random words beat one clever word',
    body: '"copper-otter-lamp-77" is longer, easier to remember and far harder to crack than "P@ssw0rd".',
  },
  {
    emoji: '',
    title: 'Let a password manager hold it',
    body: 'Bitwarden and the one built into your browser are both free. You only need to remember the one key.',
  },
  {
    emoji: '',
    title: 'Do not reuse your uni login',
    body: 'Shared passwords are how one leaked site turns into five compromised accounts. You know this. Do it anyway.',
  },
];

export default function ResetPasswordPage({ searchParams }: { searchParams?: { token?: string | string[] } }) {
  const rawToken = searchParams?.token;
  const raw = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  const token = typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null;

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
              <div className="mb-5 inline-flex items-center gap-2 border border-line bg-surface px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] shadow-panel">
                <span
                  aria-hidden
                  className={`inline-block h-2 w-2 border border-line ${token ? 'bg-cyan/12' : 'bg-grad-brand-soft animate-caret-blink'}`}
                />
                {token ? 'Link detected · finish below' : 'No link detected'}
              </div>
            </Reveal>

            <Reveal direction="up" delay={0.04}>
              <h1 className="text-display-lg">
                <span className="block">NEW</span>
                <span className="relative inline-block">
                  <span className="relative z-10">PASSWORD.</span>
                  <span aria-hidden className="absolute -bottom-1 left-0 h-5 w-full -rotate-1 bg-cyan/12 sm:h-7" />
                </span>
              </h1>
            </Reveal>

            <Reveal direction="up" delay={0.1}>
              <p className="mt-5 max-w-md text-base leading-relaxed text-ink-soft">
                {token
                  ? 'Pick something you will actually remember. Once you save it, this link stops working and you can sign in again.'
                  : 'This page needs the one-time link from your reset email. Without that token there is nothing here to change.'}
              </p>
            </Reveal>

            <Reveal direction="up" delay={0.16}>
              <div className="mt-7">
                {token ? (
                  <ResetClient token={token} />
                ) : (
                  /* ------------------------------------------------------
 INVALID LINK STATE
 ------------------------------------------------------ */
                  <div className="border border-line bg-surface shadow-panel-lg">
                    <div className="flex items-center justify-between gap-3 border-b border-line bg-grad-brand-soft px-4 py-2.5">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink">
                        Link missing or broken
                      </span>
                      <span aria-hidden className="font-display text-xs text-ink"></span>
                    </div>

                    <div className="space-y-5 p-5 sm:p-7">
                      <div className="flex items-start gap-4">
                        <span
                          aria-hidden
                          className="flex h-12 w-12 flex-shrink-0 items-center justify-center border border-line bg-rose/10 text-2xl shadow-panel"
                        ></span>
                        <div className="min-w-0">
                          <h2 className="text-display-md">No token in that URL</h2>
                          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                            Reset links look like{' '}
                            <code className="break-all border border-line bg-surface-inset px-1 font-mono text-[12px]">
                              /reset-password?token=…
                            </code>
                            . Mail clients sometimes chop the end off, so try opening the link from the email again, or
                            copy the whole address by hand.
                          </p>
                        </div>
                      </div>

                      <ul className="space-y-2 border border-dashed border-line bg-base p-4 text-xs leading-relaxed text-ink-muted">
                        <li>
                          <strong className="font-bold text-ink">Links last one hour.</strong> After that you need a
                          fresh one, and asking for a new link retires the old.
                        </li>
                        <li>
                          <strong className="font-bold text-ink">They work once.</strong> If you already reset your
                          password with this link, it is spent.
                        </li>
                      </ul>

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
                )}
              </div>
            </Reveal>

            <Reveal direction="up" delay={0.2}>
              <p className="mt-6 text-center text-sm text-ink-muted lg:text-left">
                Still stuck after two links?{' '}
                <Link
                  href="/contact"
                  className="font-bold text-ink underline decoration-rose decoration-2 underline-offset-4"
                >
                  Contact the membership team
                </Link>{' '}
                and a human will fix it.
              </p>
            </Reveal>
          </div>

          {/* ==============================================================
 PANEL COLUMN - receipt + tips
 ============================================================== */}
          <div className="lg:col-span-6">
            <Reveal direction="left" delay={0.12}>
              <div className="relative">
                <Sticker tone="lime" rotate={-7} className="absolute -left-3 -top-5 z-20 text-[10px]">
                  one-time link
                </Sticker>

                <div className="border border-line bg-surface-inset text-ink shadow-panel-lg">
                  <div className="flex items-center justify-between gap-3 border-b border-line-bright/25 px-4 py-2.5">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink/60">
                      what happens when you save
                    </span>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-cyan">
                      receipt
                    </span>
                  </div>

                  <ul className="divide-y-2 divide-line/15">
                    {RECEIPT.map((row) => (
                      <li key={row.label} className="flex items-start gap-3 p-4">
                        <span
                          aria-hidden
                          className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center border border-cyan/40 bg-cyan/12 font-display text-[10px] leading-none text-ink"
                        ></span>
                        <span className="min-w-0">
                          <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink">
                            {row.label}
                          </span>
                          <span className="mt-1 block text-xs leading-relaxed text-ink/70">{row.detail}</span>
                        </span>
                      </li>
                    ))}
                  </ul>

                  <p className="border-t border-line-bright/25 p-4 font-mono text-[11px] leading-relaxed text-ink/60">
                    <span className="text-ink">$</span> bsa reset --token ***** --confirm
                    <span
                      aria-hidden
                      className="ml-1 inline-block h-3 w-2 animate-caret-blink bg-cyan/12 align-middle"
                    />
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal direction="left" delay={0.18}>
              <div className="mt-6 space-y-3">
                {TIPS.map((tip, i) => (
                  <div
                    key={tip.title}
                    className={`flex items-start gap-4 border border-line bg-surface p-4 shadow-panel ${
                      i % 2 === 0 ? '' : ''
                    }`}
                  >
                    <span
                      aria-hidden
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center border border-line bg-cyan/10 text-lg shadow-panel"
                    >
                      {tip.emoji}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.14em]">
                        {tip.title}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-ink-muted">{tip.body}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-cyan/12 py-12">
        <div className="relative mx-auto flex max-w-container-max flex-col items-center gap-5 px-4 text-center lg:flex-row lg:justify-between lg:px-10 lg:text-left">
          <div>
            <h2 className="text-display-md">While you are in here</h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-soft">
              A reset is a good moment to look over the rest of the account. Once you are signed back in, your dashboard
              holds the privacy switches, your handle and everything the directory shows about you.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button href="/login" tone="ink">
              Sign in
            </Button>
            <Button href="/directory" tone="paper">
              Go to my dashboard
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
