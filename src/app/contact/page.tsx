import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { env } from '@/lib/env';
import { Button } from '@/components/ui/button';
import { Card, CardBar, CardBody } from '@/components/ui/card';
import { Chip, LiveDot } from '@/components/ui/badge';
import { Marquee } from '@/components/ui/marquee';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/reveal';
import { SectionHead, Sticker, Stat } from '@/components/ui/misc';
import { ContactClient, type ContactReason } from './contact-client';

/** Reads the session and ?type=, so nothing here can be cached. */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Contact the Business Security Alliance about membership, regional chapters, partnership or speaking. A person reads every message, usually within two working days.',
};

const CONTACT_EMAIL = env.emailFrom.match(/<([^>]+)>/)?.[1] ?? 'members@bsa.dev';

const REASONS: ContactReason[] = [
  {
    value: 'CONTACT',
    slug: 'general',
    label: 'Something else entirely',
    emoji: '',
    blurb: 'The catch-all. Press enquiries, corrections, or something on the site that is plainly broken.',
    prompt:
      'Tell us what is on your mind. If it is a bug, the page you were on and what you clicked is genuinely all we need.',
    reply: 'two working days',
    next: { label: 'Browse the directory', href: '/directory' },
  },
  {
    value: 'MEMBERSHIP_INQUIRY',
    slug: 'membership',
    label: 'A question about membership',
    emoji: '',
    blurb: 'Individual membership, corporate membership, or how the model works. The tiers are still being finalised.',
    prompt:
      'What do you want to know? If you already read the FAQ and it did not answer the thing, say which bit was unclear and we will fix the page too.',
    reply: 'two working days',
    next: { label: 'Read the membership page', href: '/membership' },
  },
  {
    value: 'CHAPTER_REQUEST',
    slug: 'chapter',
    label: 'Start a chapter in my region',
    emoji: '',
    blurb: 'Tell us the region and roughly how many professionals are interested. A handful is enough to begin.',
    prompt:
      'Which region and city, how many people are interested so far, and what cadence you think would work. If you have run a professional group before, mention it.',
    reply: 'three working days',
    next: { label: 'See the chapters already running', href: '/chapters' },
  },
  {
    value: 'PARTNERSHIP_INQUIRY',
    slug: 'partnership',
    label: 'A partnership or collaboration',
    emoji: '',
    blurb: 'Reciprocal arrangements with other associations, joint research, or co-hosted events.',
    prompt:
      'Who you represent, what you are proposing, and what you would want from us. If there is a deadline attached, say so.',
    reply: 'four working days',
    next: { label: 'See our partners', href: '/sponsors' },
  },
  {
    value: 'SPONSOR_INQUIRY',
    slug: 'sponsor',
    label: 'My organisation wants to partner',
    emoji: '',
    blurb: 'Partners fund the events programme and chapter activity. Partners never receive member data.',
    prompt:
      'Who you are, what you would want from the arrangement, and the budget you are working with. If recruitment is the main driver, say so - it is the most common reason and the simplest to arrange.',
    reply: 'one working day',
    next: { label: 'See who already backs us', href: '/sponsors' },
  },
];

const REASON_VALUES = REASONS.map((reason) => reason.value);

/** Slug aliases, so ?type=chapter from the footer lands on CHAPTER_REQUEST. */
const ALIASES: Record<string, string> = {
  general: 'CONTACT',
  contact: 'CONTACT',
  hello: 'CONTACT',
  bug: 'CONTACT',
  press: 'CONTACT',
  membership: 'MEMBERSHIP_INQUIRY',
  member: 'MEMBERSHIP_INQUIRY',
  join: 'MEMBERSHIP_INQUIRY',
  chapter: 'CHAPTER_REQUEST',
  chapters: 'CHAPTER_REQUEST',
  region: 'CHAPTER_REQUEST',
  partnership: 'PARTNERSHIP_INQUIRY',
  partnerships: 'PARTNERSHIP_INQUIRY',
  collaborate: 'PARTNERSHIP_INQUIRY',
  sponsor: 'SPONSOR_INQUIRY',
  sponsors: 'SPONSOR_INQUIRY',
  sponsorship: 'SPONSOR_INQUIRY',
  backer: 'SPONSOR_INQUIRY',
  partner: 'SPONSOR_INQUIRY',
};

function resolveType(raw?: string | string[]): string {
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim().toLowerCase();
  if (!value) return 'CONTACT';
  if (ALIASES[value]) return ALIASES[value];
  const upper = value.toUpperCase();
  return REASON_VALUES.includes(upper) ? upper : 'CONTACT';
}

export default async function ContactPage({ searchParams }: { searchParams?: { type?: string | string[] } }) {
  const initialType = resolveType(searchParams?.type);
  const session = await getSession();

  let chapterCount = 0;
  let mentorCount = 0;
  let memberCount = 0;

  try {
    const fetched = await Promise.all([
      prisma.chapter.count({ where: { isActive: true } }),
      prisma.memberProfile.count({ where: { openToMentoring: true } }),
      prisma.memberProfile.count(),
    ]);
    chapterCount = fetched[0];
    mentorCount = fetched[1];
    memberCount = fetched[2];
  } catch (err) {
    console.error('Contact Page DB Error:', err);
  }

  const active = REASONS.find((reason) => reason.value === initialType) ?? REASONS[0];

  const ROUTES = [
    {
      title: 'Your chapter committee',
      kicker: 'Fastest for anything local',
      tone: 'violet' as const,
      emoji: '◈',
      body: 'A venue, an agenda item, an introduction to someone in the region - the committee running your chapter will answer that faster and better than the central inbox will.',
      meta: 'Usually the same week',
      cta: { label: 'Find your chapter →', href: '/chapters' },
    },
    {
      title: 'Email',
      kicker: 'For the long ones',
      tone: 'tangerine' as const,
      emoji: '',
      body: `${CONTACT_EMAIL} reaches the same people this form does. Use it for attachments, long threads, and anything you want a paper trail for.`,
      meta: 'Same reply windows as the form',
      cta: { label: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
    },
    {
      title: 'The committees',
      kicker: 'For policy and guidance',
      tone: 'lime' as const,
      emoji: '',
      body: 'Consultation responses, guidance notes and shared research are run by member committees. Say which piece of work you mean and the enquiry goes straight to its chair.',
      meta: 'Answered after the next committee sitting',
      cta: { label: 'What the committees do →', href: '/about' },
    },
  ];

  const SELF_SERVE = [
    {
      href: '/membership',
      emoji: '🎁',
      title: 'Is it really free?',
      body: 'The membership page covers eligibility, corporate membership and what the model currently looks like.',
    },
    {
      href: '/chapters',
      emoji: '📍',
      title: 'Is there a chapter in my region?',
      body: `Check the list first - ${chapterCount} are live. If yours is not there, come back and pick the chapter reason above.`,
    },
    {
      href: '/directory',
      emoji: '👥',
      title: 'I want a mentor',
      body: `${mentorCount} members have ticked "happy to mentor". Messaging one directly works faster than asking us to make the introduction.`,
    },
    {
      href: '/events',
      emoji: '📅',
      title: 'Can I attend without joining?',
      body: 'Each event page states whether it is open, members-only, or held under the Chatham House rule, and shows both rates.',
    },
  ];

  return (
    <div className="overflow-x-hidden">
      {/* ==================================================================
 HERO
 ================================================================== */}
      <section className="relative border-b border-line bg-base">
        <div className="absolute inset-0 mesh-grid" aria-hidden />

        <div className="relative mx-auto max-w-container-max px-4 py-14 lg:px-10 lg:py-20">
          <div className="max-w-3xl">
            <Reveal direction="down">
              <div className="mb-6 inline-flex flex-wrap items-center gap-2 border border-line bg-surface px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] shadow-panel">
                A person reads these · no ticket numbers · no chatbot
              </div>
            </Reveal>

            <Reveal direction="up" delay={0.05}>
              <h1 className="text-display-lg">
                <span className="block">SAY</span>
                <span className="relative inline-block">
                  <span className="relative z-10">SOMETHING.</span>
                  <span aria-hidden className="absolute -bottom-1 left-0 h-5 w-full -rotate-1 bg-cyan/12 sm:h-8" />
                </span>
              </h1>
            </Reveal>

            <Reveal direction="up" delay={0.12}>
              <p className="mt-7 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
                Questions about joining, starting a chapter, mentoring, or backing us. Also fine: telling us a page is
                broken, that a listing is out of date, or that you have just taken a new post and wanted somebody to
                know. <strong className="text-cyan px-0.5 font-bold">There is no wrong message.</strong>
              </p>
            </Reveal>

            <Reveal direction="up" delay={0.18}>
              <div className="mt-8 flex flex-wrap gap-2">
                {REASONS.map((reason) => {
                  const isActive = reason.value === active.value;
                  return (
                    <Link
                      key={reason.slug}
                      href={`/contact?type=${reason.slug}`}
                      scroll={false}
                      aria-current={isActive ? 'true' : undefined}
                      className={`inline-flex items-center gap-1.5 border border-line px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition-[transform,box-shadow] duration-100 ${
                        isActive
                          ? '-translate-x-[1px] -translate-y-[1px] bg-surface-inset text-ink shadow-panel'
                          : 'bg-surface text-ink hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-panel'
                      }`}
                    >
                      <span aria-hidden>{reason.emoji}</span>
                      {reason.label}
                    </Link>
                  );
                })}
              </div>
            </Reveal>

            <Reveal direction="up" delay={0.24}>
              <div className="mt-9 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat value="2 days" label="Typical reply" tone="lime" />
                <Stat value={mentorCount} label="Mentors on call" tone="paper" />
                <Stat
                  value={memberCount.toLocaleString()}
                  label="People already in"
                  tone="paper"
                  className="col-span-2 sm:col-span-1"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <Marquee
        tone="violet"
        speed="normal"
        items={[
          'NO CHATBOT',
          'NO TICKET NUMBER',
          'NO SALES CALL',
          'A HUMAN READS EVERY ONE',
          'ASK THE OBVIOUS QUESTION',
        ]}
      />

      {/* ==================================================================
 FORM + SIDEBAR
 ================================================================== */}
      <section className="border-b border-line bg-surface py-14 lg:py-20">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-7">
              <Reveal>
                <div className="relative">
                  <Sticker tone="lime" rotate={-8} className="absolute -left-2 -top-5 z-20 text-[10px]">
                    {active.reply}
                  </Sticker>
                  {/* Keyed so a ?type= deep link re-seeds the form's own state. */}
                  <ContactClient
                    key={initialType}
                    reasons={REASONS}
                    initialType={initialType}
                    signedInEmail={session?.email ?? null}
                  />
                </div>
              </Reveal>
            </div>

            <div className="lg:col-span-5">
              <div className="space-y-5 lg:sticky lg:top-24">
                <Reveal direction="left" delay={0.08}>
                  <Card>
                    <CardBar tone="ink">
                      <span>What to expect</span>
                    </CardBar>
                    <CardBody>
                      <ul className="space-y-3 font-mono text-xs leading-relaxed text-ink-soft">
                        <li className="flex items-start gap-2">
                          <span className="text-cyan">✦</span> A human will reply directly from their personal email.
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-cyan">✦</span> No automated drip campaigns or aggressive sales funnels.
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-cyan">✦</span> Your details are stored strictly to process your inquiry.
                        </li>
                      </ul>

                      <p className="mt-4 border border-dashed border-line bg-cyan/10 px-3 py-2.5 text-xs leading-relaxed text-ink-soft">
                        Heard nothing once the window has closed? Send it again rather than assuming it was ignored -
                        messages do occasionally get buried, and we would rather you chased us.
                      </p>
                    </CardBody>
                  </Card>
                </Reveal>

                <RevealGroup className="space-y-5">
                  {ROUTES.map((route) => (
                    <RevealItem key={route.title}>
                      <Card>
                        <CardBar tone={route.tone}>
                          <span>
                            <span aria-hidden>{route.emoji}</span> {route.title}
                          </span>
                          <span className="flex-shrink-0">{route.kicker}</span>
                        </CardBar>
                        <CardBody>
                          <p className="text-sm leading-relaxed text-ink-muted">{route.body}</p>
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-line pt-3">
                            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                              {route.meta}
                            </span>
                            <Button href={route.cta.href} tone="ink" size="sm">
                              {route.cta.label}
                            </Button>
                          </div>
                        </CardBody>
                      </Card>
                    </RevealItem>
                  ))}
                </RevealGroup>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================
 TRY THESE FIRST
 ================================================================== */}
      <section className="border-b border-line bg-base py-16 lg:py-20">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <SectionHead
            kicker="Might be quicker"
            tone="tangerine"
            title={
              <>
                Four things people ask us that the site already <span className="text-gradient">answers</span>
              </>
            }
            blurb="Not a brush-off. If the page does not actually answer it, tell us and we will rewrite the page."
          />

          <RevealGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SELF_SERVE.map((item) => (
              <RevealItem key={item.href} className="h-full">
                <Link
                  href={item.href}
                  className="group flex h-full flex-col justify-between rounded-2xl border border-line bg-surface/90 p-6 backdrop-blur-md transition-all duration-300 hover:border-cyan/50 hover:shadow-panel-lg"
                >
                  <div>
                    <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-cyan/30 bg-cyan/15 text-2xl transition-all group-hover:scale-110 group-hover:border-cyan">
                      {item.emoji}
                    </span>
                    <h3 className="text-lg font-extrabold text-white transition-colors group-hover:text-cyan">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.body}</p>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-line/60 pt-4 font-mono text-xs font-bold text-cyan transition-transform group-hover:translate-x-1">
                    <span>HAVE A LOOK</span>
                    <span>→</span>
                  </div>
                </Link>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ==================================================================
 CLOSING BAND
 ================================================================== */}
      <section className="border-b border-line bg-violet/15 py-14 text-ink lg:py-16">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <Reveal>
            <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <Chip tone="lime" className="mb-4">
                  Seriously, no wrong door
                </Chip>
                <h2 className="text-display-md text-ink">If you are not sure it is worth sending, send it</h2>
                <p className="mt-3 text-sm leading-relaxed text-ink/75">
                  Half the good things here started as a message someone almost did not write. A chapter, two
                  corrections to a chapter roster and one conference speaker all came in through this form.
                </p>
              </div>
              <div className="flex flex-shrink-0 flex-wrap gap-3">
                <Button href="/register" tone="lime" size="lg">
                  Or just join
                </Button>
                <Button href="/about" tone="paper" size="lg">
                  Who you are messaging
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
