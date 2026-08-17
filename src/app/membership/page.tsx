import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardBar, CardBody } from '@/components/ui/card';
import { Chip, LiveDot } from '@/components/ui/badge';
import { Marquee } from '@/components/ui/marquee';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/reveal';
import { Counter } from '@/components/ui/counter';
import { SectionHead, Sticker, Stat } from '@/components/ui/misc';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Membership',
  description:
    'How membership of the Business Security Alliance works: what a member gets, the provisional member categories, how to join, and how to send a membership enquiry.',
};

/**
 * Editorial note for content the client has not yet supplied.
 *
 * Development only. In production it renders nothing: a visitor deciding whether
 * to join should never be told, in a highlighted box, that the product is
 * unwritten. The gap is better left silent than advertised.
 */
function Placeholder({ title, children }: { title: string; children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className="rounded-lg border border-dashed border-amber/40 bg-amber/[0.07] p-5">
      <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-amber">
        Editorial note · not rendered in production
      </p>
      <p className="text-base font-semibold leading-snug text-ink">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{children}</p>
    </div>
  );
}

/**
 * PROVISIONAL member categories. These mirror the values the platform records
 * today; the client has not confirmed the membership model, so they are
 * indicative only and the copy must not depend on them being final.
 */
const MEMBER_TYPES: {
  key: string;
  name: string;
  tone: 'lime' | 'violet' | 'magenta' | 'tangerine' | 'cobalt';
  who: string;
  body: string;
}[] = [
  {
    key: 'PROFESSIONAL',
    name: 'Professional',
    tone: 'lime',
    who: 'In-house practitioners',
    body: 'Security managers, operations leads, analysts, investigators, architects and assurance specialists with day-to-day responsibility inside an organisation.',
  },
  {
    key: 'LEADER',
    name: 'Leader',
    tone: 'violet',
    who: 'Accountable for the function',
    body: 'Heads of security, directors, CISOs and executives who answer to a board. Closed roundtables and the executive resources are aimed at this group.',
  },
  {
    key: 'CONSULTANT',
    name: 'Consultant',
    tone: 'magenta',
    who: 'Independent practices',
    body: 'Independent advisers, interim leaders and small consultancies. Visibility in the directory and referral routes matter most here.',
  },
  {
    key: 'VENDOR',
    name: 'Vendor',
    tone: 'tangerine',
    who: 'Makers and providers',
    body: 'Manufacturers, systems integrators, guarding companies and managed service providers, listed as practitioners rather than as advertisements.',
  },
  {
    key: 'ORGANISATION',
    name: 'Organisation',
    tone: 'cobalt',
    who: 'Bodies and institutes',
    body: 'Research organisations, institutes, training bodies and other associations working alongside the alliance.',
  },
];

const FAQ = [
  {
    q: 'Who is eligible to join?',
    a: 'The alliance is for people working in security in some capacity - in-house, in consultancy, for a vendor or service provider, or in research and policy. There is no seniority requirement and no requirement to hold a particular certification. Formal eligibility criteria form part of the membership model that is still being confirmed, so if your situation is unusual, send an enquiry and you will get a direct answer rather than a guess.',
  },
  {
    q: 'What does membership cost?',
    a: 'No pricing is published, because the membership model has not been confirmed. Nothing on this site charges you for membership today: you can create a profile, appear in the directory, join a chapter and use the resources without a payment step. Events are separate - ticketed events show a member rate and a non-member rate on the event page itself. When the model is confirmed, the fee structure will be published here in full rather than quoted privately.',
  },
  {
    q: 'Can my organisation join as a whole team?',
    a: 'Corporate and group membership is one of the arrangements still being confirmed. The platform records an "organisation" member type, but it is a placeholder rather than a defined product. In the meantime, teams generally join as individuals, which keeps each profile attached to the person rather than the employer. If you want to arrange something for a whole security function, send a membership enquiry with the size of the team and we will come back with the current position in writing.',
  },
  {
    q: 'Do I have to join a chapter?',
    a: 'No. Chapter membership is optional and you can belong to more than one. Chapters are regional groups with their own committee, meeting cadence and contact address; joining is a switch on your profile rather than a separate application. Everything else - the directory, the resources, the opportunities board and the central events programme - works with or without a chapter.',
  },
  {
    q: 'What if there is no chapter in my region?',
    a: 'Use the alliance without one, and tell us. Chapters form when enough members in a region ask for one and a committee comes forward to run it. The chapter request form asks which region, roughly how many people are interested, and whether anyone is willing to sit on the committee. That is the whole process at the start.',
  },
  {
    q: 'What happens to my details?',
    a: 'Your profile is yours to control. Seven separate switches govern whether the profile is public, whether you appear in directory search, and whether your organisation, email address, phone number, LinkedIn and website are shown. Email and phone are off by default. You can be listed and findable without being contactable by every route, and you can hide the profile entirely while continuing to use the rest of the platform.',
  },
  {
    q: 'Can non-members attend events?',
    a: 'It depends on the event, and each event page says which. Some sessions are open and sell a non-member rate. Others are members only, limited to people with direct operational responsibility, or held under the Chatham House rule with a written summary circulated to members afterwards. Ticketed events carry a member rate that is lower than the standard rate.',
  },
  {
    q: 'What happens when I change jobs?',
    a: 'Nothing breaks. Membership is individual, so the profile follows you rather than your employer. Update your organisation, job title and discipline and you stay in the directory and in your chapter. This is the main practical argument for joining as a person rather than being added to a corporate list.',
  },
];

export default async function MembershipPage() {
  const [types, fields, chapters, counts] = await Promise.all([
    prisma.memberProfile.findMany({ select: { memberType: true } }),
    prisma.memberProfile.findMany({ select: { field: true } }),
    prisma.chapter.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { slug: true, name: true, region: true, emoji: true, meetingCadence: true, country: true },
    }),
    Promise.all([
      prisma.memberProfile.count(),
      prisma.chapter.count({ where: { isActive: true } }),
      prisma.event.count({ where: { status: { in: ['UPCOMING', 'LIVE'] } } }),
      prisma.resource.count({ where: { isPublished: true } }),
      prisma.resourceModule.count(),
      prisma.opportunity.count({ where: { isPublished: true } }),
      prisma.sponsor.count({ where: { isPublished: true } }),
      prisma.memberProfile.count({ where: { openToMentoring: true } }),
    ]),
  ]);

  const [
    memberCount,
    chapterCount,
    upcomingEventCount,
    resourceCount,
    moduleCount,
    opportunityCount,
    partnerCount,
    mentoringCount,
  ] = counts;

  const typeTally = types.reduce<Record<string, number>>((acc, row) => {
    acc[row.memberType] = (acc[row.memberType] ?? 0) + 1;
    return acc;
  }, {});

  const disciplineCount = new Set(fields.map((row) => row.field)).size;
  const countryCount = new Set(chapters.map((chapter) => chapter.country)).size;

  const BENEFITS = [
    {
      n: '01',
      title: 'A listing in the member directory',
      tone: 'lime' as const,
      href: '/directory',
      cta: 'See the directory',
      body: `Your profile carries your role, organisation, discipline, location, specialisms and how much experience you have. ${memberCount} members are listed across ${disciplineCount} disciplines, and every one of them can be filtered and contacted.`,
      meta: `${memberCount} profiles · ${mentoringCount} open to mentoring`,
    },
    {
      n: '02',
      title: 'Access to your regional chapter',
      tone: 'violet' as const,
      href: '/chapters',
      cta: 'Find your chapter',
      body: `${chapterCount} chapters across ${countryCount} countries, each with a committee, a published roster and its own meeting cadence. Join one, or several, and you appear on the roster for the members in your region.`,
      meta: `${chapterCount} chapters · monthly and quarterly`,
    },
    {
      n: '03',
      title: 'The events programme',
      tone: 'magenta' as const,
      href: '/events',
      cta: 'See what is on',
      body: 'The annual conference, working sessions, webinars, closed-door roundtables and chapter networking evenings. Members get the member rate on ticketed events, and CPD hours are recorded against your profile.',
      meta: `${upcomingEventCount} upcoming · CPD recorded`,
    },
    {
      n: '04',
      title: 'Practitioner resources',
      tone: 'tangerine' as const,
      href: '/resources',
      cta: 'Browse resources',
      body: `Module-based guidance written by members doing the work: building a function, convergence, third-party risk and board reporting. Your progress is tracked so you can pick a resource back up where you left it.`,
      meta: `${resourceCount} resources · ${moduleCount} modules`,
    },
    {
      n: '05',
      title: 'The opportunities board',
      tone: 'cobalt' as const,
      href: '/opportunities',
      cta: 'See opportunities',
      body: 'Senior roles, consulting partnerships, invitations to tender, calls for speakers and non-executive appointments, posted by members and partner organisations. Apply through the site and the listing owner gets your details directly.',
      meta: `${opportunityCount} live listings`,
    },
  ];

  return (
    <div className="overflow-x-hidden">
      {/* ==================================================================
 HERO
 ================================================================== */}
      <section className="relative border-b border-line bg-base">
        <div className="absolute inset-0 mesh-grid" aria-hidden />

        <div className="relative mx-auto grid max-w-container-max grid-cols-1 items-start gap-10 px-4 py-14 lg:grid-cols-12 lg:gap-12 lg:px-10 lg:py-20">
          <div className="lg:col-span-7">
            <Reveal direction="down">
              <div className="mb-6 inline-flex flex-wrap items-center gap-2 border border-line bg-surface px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] shadow-panel">
                {memberCount.toLocaleString()} members · {chapterCount} chapters · {countryCount} countries
              </div>
            </Reveal>

            <Reveal direction="up" delay={0.05}>
              <h1 className="relative tracking-tight font-extrabold uppercase leading-[0.88]">
                <span className="relative inline-block text-5xl sm:text-7xl lg:text-8xl font-extrabold text-3d-pop tracking-tight">
                  HOW MEMBERSHIP
                  <span className="absolute -right-6 -top-4 text-cyan text-2xl animate-pulse">✦</span>
                </span>
                <span className="relative block text-5xl sm:text-7xl lg:text-8xl font-accent font-bold lowercase italic text-3d-pop-cyan -mt-3 sm:-mt-6 lg:-mt-8 rotate-[-3.5deg] drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]">
                  works for you!
                  <span className="absolute -left-6 bottom-2 text-white text-3xl animate-bounce">✦</span>
                </span>
              </h1>
            </Reveal>

            <Reveal direction="up" delay={0.12}>
              <p className="mt-7 max-w-xl text-base leading-relaxed text-white sm:text-lg font-normal" style={{ color: '#FFFFFF' }}>
                Membership is individual. You create a profile, decide what is visible, join the chapter covering your
                region, and use the directory, events, resources and opportunities.{' '}
                <strong className="text-[#00F0FF] px-0.5 font-bold" style={{ color: '#00F0FF' }}>
                  The formal membership model is still being confirmed
                </strong>{' '}
                - everything on this page marked as provisional will be replaced with the alliance&apos;s own wording.
              </p>
            </Reveal>

            <Reveal direction="up" delay={0.18}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button href="/register" tone="magenta" size="lg">
                  Create a profile
                </Button>
                <Button href="/contact?type=membership" tone="paper" size="lg">
                  Send a membership enquiry
                </Button>
              </div>
            </Reveal>

            <Reveal direction="up" delay={0.24}>
              <div className="mt-10 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat value={<Counter to={memberCount} />} label="Members" tone="lime" />
                <Stat value={<Counter to={chapterCount} />} label="Chapters" tone="paper" />
                <Stat value={<Counter to={upcomingEventCount} />} label="Upcoming events" tone="paper" />
                <Stat value={<Counter to={opportunityCount} />} label="Opportunities" tone="paper" />
              </div>
            </Reveal>
          </div>

          {/* What you get */}
          <div className="lg:col-span-5">
            <Reveal direction="left" delay={0.15}>
              <div className="relative pt-4">
                <span className="absolute left-6 -top-2 z-20 rounded-full bg-magenta px-3 py-1 font-mono text-[11px] font-bold text-white shadow-md border border-magenta-bright uppercase tracking-wider">
                  ✦ What you actually get
                </span>

                <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md shadow-panel-lg overflow-hidden">
                  <div className="border-b border-line bg-surface-inset/80 px-6 py-4">
                    <p className="text-lg font-extrabold text-white">Included With Membership</p>
                    <p className="mt-1 font-mono text-xs font-semibold text-cyan flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-cyan animate-pulse" /> Live counts, read real-time from database
                    </p>
                  </div>

                  <ul className="divide-y divide-line/60 px-6">
                    {[
                      ['👥 Directory Listing', `${memberCount} members`],
                      ['📍 Regional Chapters', `${chapterCount} active`],
                      ['📅 Events Programme', `${upcomingEventCount} upcoming`],
                      ['📚 Practitioner Resources', `${moduleCount} modules`],
                      ['💼 Opportunities Board', `${opportunityCount} listings`],
                      ['🤝 Partner Programme', `${partnerCount} partners`],
                    ].map(([item, value]) => (
                      <li key={item} className="flex items-center justify-between gap-3 py-3.5">
                        <span className="text-sm font-semibold text-white">
                          {item}
                        </span>
                        <span className="rounded-full bg-cyan/20 border border-cyan/40 px-3 py-1 font-mono text-xs font-bold text-cyan shrink-0">
                          {value}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="border-t border-line bg-cyan/15 px-6 py-4 text-center">
                    <p className="font-mono text-xs font-bold uppercase tracking-wider text-cyan">
                      💡 Fees & Tiers: Pending Client Confirmation
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <Marquee
        tone="lime"
        speed="normal"
        items={[
          'DIRECTORY LISTING',
          'REGIONAL CHAPTERS',
          'EVENTS PROGRAMME',
          'PRACTITIONER RESOURCES',
          'OPPORTUNITIES BOARD',
          'CPD HOURS',
        ]}
      />

      {/* ==================================================================
 MEMBER CATEGORIES - provisional
 ================================================================== */}
      <section id="categories" className="border-b border-line bg-surface py-16 lg:py-20">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <SectionHead
            kicker="Member categories"
            tone="tangerine"
            title={
              <>
                Five types, all of them <span className="text-gradient">provisional</span>
              </>
            }
            blurb="The platform records a member type on every profile so the directory can be filtered sensibly. Treat the list below as a working draft, not as a published membership structure."
            action={
              <Button href="/contact?type=membership" tone="ink">
                Ask about your category →
              </Button>
            }
          />

          <Reveal>
            <div className="mb-6">
              <Placeholder title="The membership model is not confirmed">
                Categories, eligibility criteria, fees, joining terms and any benefits attached to a particular level
                all sit with the client and have not been supplied. The five types below are the values the platform
                currently records and are shown so you can see how the directory behaves - they are indicative only and
                are expected to change. Supply the confirmed model and this section becomes the real tier table.
              </Placeholder>
            </div>
          </Reveal>

          <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {MEMBER_TYPES.map((type, i) => {
              const count = typeTally[type.key] ?? 0;
              return (
                <RevealItem key={type.key} className="h-full">
                  <Card className="flex h-full flex-col" tilt={(i % 2 === 0 ? 1 : 2) as 1 | 2}>
                    <CardBar tone={type.tone}>
                      <span>{type.name}</span>
                      <span className="flex-shrink-0">{type.key}</span>
                    </CardBar>
                    <CardBody className="flex flex-1 flex-col">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                        {type.who}
                      </p>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{type.body}</p>
                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-dashed border-line pt-3">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                          Currently recorded
                        </span>
                        <span className="font-display text-lg leading-none">{count}</span>
                      </div>
                    </CardBody>
                  </Card>
                </RevealItem>
              );
            })}

            <RevealItem className="h-full">
              <div className="flex h-full flex-col justify-between border border-line bg-base p-5 shadow-panel">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink-muted">
                    None of these fit
                  </p>
                  <h3 className="mt-2 text-xl leading-tight">Tell us and it gets recorded</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    Edge cases are how a membership model gets fixed. If none of the five describe what you do, say so
                    in an enquiry - it feeds directly into the model the alliance is confirming.
                  </p>
                </div>
                <Button href="/contact?type=membership" tone="ink" className="mt-5 w-full">
                  Send an enquiry
                </Button>
              </div>
            </RevealItem>
          </RevealGroup>
        </div>
      </section>

      {/* ==================================================================
 WHAT A MEMBER GETS
 ================================================================== */}
      <section className="border-b border-line bg-base py-16 lg:py-20">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <SectionHead
            tone="violet"
            title="Everything here is switched on today"
            blurb="Not a benefits list written in advance of the product. Every item below is a live part of this platform with a number attached to it."
            action={
              <Button href="/register" tone="ink">
                Create a profile →
              </Button>
            }
          />

          <div className="space-y-5">
            {BENEFITS.map((benefit, i) => (
              <Reveal key={benefit.n} direction={i % 2 === 0 ? 'right' : 'left'} delay={Math.min(i * 0.04, 0.2)}>
                <Card>
                  <CardBar tone={benefit.tone}>
                    <span>{benefit.n}</span>
                    <span className="flex-shrink-0 truncate">{benefit.meta}</span>
                  </CardBar>
                  <CardBody className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                    <div className="lg:col-span-5">
                      <h3 className="text-2xl leading-tight">{benefit.title}</h3>
                    </div>
                    <div className="lg:col-span-7 lg:border-l lg:border-dashed lg:border-line lg:pl-6">
                      <p className="text-sm leading-relaxed text-ink-soft">{benefit.body}</p>
                      <Button href={benefit.href} tone="paper" size="sm" className="mt-4">
                        {benefit.cta} →
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================================
 HOW TO JOIN
 ================================================================== */}
      <section className="border-b border-line bg-violet/15 py-16 text-ink lg:py-20">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <span className="mb-3 inline-block border border-line bg-cyan/12 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink shadow-panel">
                How to join
              </span>
              <h2 className="text-display-md text-ink">Four steps, in one sitting</h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/80">
                Registration creates your profile immediately. You are searchable in the directory as soon as it is
                complete, unless you switch that off.
              </p>
            </div>
            <Button href="/register" tone="lime">
              Start now →
            </Button>
          </div>

          <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: '01',
                title: 'Create the account',
                body: 'Name, work email, password, organisation, job title and the discipline you work in. Pick a handle - it becomes the address of your public profile.',
                tone: 'lime' as const,
              },
              {
                n: '02',
                title: 'Complete the profile',
                body: 'A short biography, your specialisms and skills, years in the industry, location and any links. This is what other members search against, so it is worth ten minutes.',
                tone: 'magenta' as const,
              },
              {
                n: '03',
                title: 'Set your visibility',
                body: 'Seven switches: public profile, directory listing, organisation, email, phone, LinkedIn and website. Email and phone start switched off.',
                tone: 'tangerine' as const,
              },
              {
                n: '04',
                title: 'Join your chapter',
                body: `Pick the chapter covering your region from the ${chapterCount} active ones and you appear on its roster. Then register for whatever is next on the calendar.`,
                tone: 'cobalt' as const,
              },
            ].map((step, i) => (
              <RevealItem key={step.n} className="h-full">
                <Card className="flex h-full flex-col" tilt={(i % 2 === 0 ? 1 : 2) as 1 | 2}>
                  <CardBar tone={step.tone}>
                    <span>Step {step.n}</span>
                    <span aria-hidden>✦</span>
                  </CardBar>
                  <CardBody className="flex flex-1 flex-col">
                    <h3 className="text-xl leading-tight">{step.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">{step.body}</p>
                  </CardBody>
                </Card>
              </RevealItem>
            ))}
          </RevealGroup>

          <Reveal delay={0.1}>
            <div className="mt-6 grid grid-cols-1 gap-5 border border-line bg-surface p-6 shadow-panel-lg lg:grid-cols-12 lg:p-8">
              <div className="lg:col-span-7">
                <h3 className="text-2xl leading-tight">Would rather ask a person first</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  Membership enquiries go to a monitored inbox and get a written reply. Say what you do, where you are
                  and what you are hoping to get out of the alliance, and the answer will be specific rather than a
                  brochure. Group arrangements for a whole security function go to the same place.
                </p>
                {chapters.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {chapters.slice(0, 8).map((chapter) => (
                      <Link key={chapter.slug} href={`/chapters/${chapter.slug}`} className="panel-hover">
                        <Chip size="sm">
                          <span aria-hidden>{chapter.emoji}</span> {chapter.region}
                        </Chip>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center gap-3 lg:col-span-5">
                <Button href="/contact?type=membership" tone="magenta" className="w-full">
                  Membership enquiry
                </Button>
                <Button href="/contact?type=chapter" tone="paper" className="w-full">
                  Propose a chapter
                </Button>
                <Button href="/contact?type=sponsor" tone="paper" className="w-full">
                  Partner with BSA
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ==================================================================
 FAQ
 ================================================================== */}
      <section className="border-b border-line bg-surface py-16 lg:py-20">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <SectionHead
            tone="magenta"
            title={
              <>
                The questions the inbox <span className="text-rose px-1">actually gets</span>
              </>
            }
            blurb="Answered as directly as the confirmed facts allow. Where something is genuinely not settled yet, that is what it says."
            action={
              <Button href="/contact?type=membership" tone="ink">
                Ask something else →
              </Button>
            }
          />

          <div className="mx-auto max-w-3xl space-y-4">
            {FAQ.map((item, i) => (
              <details
                key={item.q}
                className="group border border-white/20 bg-surface/95 shadow-[0_10px_30px_rgba(0,0,0,0.4)] open:shadow-panel transition-colors rounded-2xl overflow-hidden"
                {...(i === 0 ? { open: true } : {})}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-white transition-colors hover:bg-surface-raised [&::-webkit-details-marker]:hidden">
                  <span className="font-display text-base sm:text-lg font-black text-white leading-snug group-hover:text-cyan transition-colors">
                    {item.q}
                  </span>
                  <span
                    aria-hidden
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-cyan/40 bg-cyan/10 font-display text-lg font-black text-cyan transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <div className="border-t border-white/10 px-5 py-4 bg-base/80">
                  <p className="text-sm font-medium leading-relaxed text-white/85">{item.a}</p>
                </div>
              </details>
            ))}
          </div>

          <Reveal delay={0.1}>
            <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-4 border border-cyan/40 bg-cyan/10 p-6 rounded-2xl shadow-panel sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold leading-relaxed text-white/90">
                <strong className="font-extrabold text-white">Want to see it before you decide?</strong> The directory, the chapters and
                the events programme are all readable without an account. Look at who is already listed, then decide.
              </p>
              <Button href="/directory" tone="magenta" className="flex-shrink-0 font-extrabold" arrow>
                Open the directory
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ==================================================================
  CTA
  ================================================================== */}
      <section className="relative overflow-hidden border-b border-line bg-base py-16 text-white lg:py-20">
        <div className="absolute inset-0 mesh-grid opacity-20" aria-hidden />
        <div className="relative mx-auto max-w-container-max px-4 text-center lg:px-10">
          <Reveal>
            <Sticker tone="lime" rotate={-6} className="mb-6">
              ✦ {memberCount} MEMBERS LISTED
            </Sticker>

            <h2 className="relative tracking-tight font-extrabold uppercase leading-[0.88]">
              <span className="relative inline-block text-4xl sm:text-6xl lg:text-7xl font-extrabold text-3d-pop tracking-tight">
                GET LISTED.
                <span className="absolute -right-6 -top-4 text-cyan text-2xl animate-pulse">✦</span>
              </span>
              <span className="relative block text-4xl sm:text-6xl lg:text-7xl font-accent font-bold lowercase italic text-3d-pop-cyan -mt-2 sm:-mt-5 rotate-[-2.5deg] drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]">
                get found!
              </span>
            </h2>

            <p className="mx-auto mt-6 max-w-xl text-base font-semibold leading-relaxed text-white/85 sm:text-lg">
              A profile takes ten minutes and puts you in front of the rest of the industry. If the membership model
              matters to your decision, ask first - the answer will be honest about what is confirmed and what is not.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button href="/register" tone="magenta" size="lg" className="font-extrabold shadow-panel" arrow>
                Create a profile
              </Button>
              <Button href="/contact?type=membership" tone="ink" size="lg" className="font-extrabold border border-white/20 text-white hover:border-cyan">
                Send an enquiry
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
              <Chip tone="lime" size="sm" className="font-extrabold">
                {memberCount} members
              </Chip>
              <Chip tone="violet" size="sm" className="font-extrabold">
                {chapterCount} chapters
              </Chip>
              <Chip tone="tangerine" size="sm" className="font-extrabold">
                {disciplineCount} disciplines
              </Chip>
              <Chip tone="cobalt" size="sm" className="font-extrabold">
                Model pending confirmation
              </Chip>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
