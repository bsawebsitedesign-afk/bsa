import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Chip, type ChipTone } from '@/components/ui/badge';
import { Marquee } from '@/components/ui/marquee';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/reveal';
import { Avatar, ProgressMeter, SectionHead, Stat } from '@/components/ui/misc';
import { accentFor, cn, formatDate, formatMonth, parseList, relativeTime, type Accent } from '@/lib/utils';

export const revalidate = 30;

/* -------------------------------------------------------------------------- */

const ACCENT: Record<Accent, { bar: string; solid: string; wash: string }> = {
  lime: { bar: 'bg-cyan/12 text-ink', solid: 'bg-cyan/12', wash: 'bg-cyan/10' },
  magenta: { bar: 'bg-grad-brand-soft text-ink', solid: 'bg-grad-brand-soft', wash: 'bg-rose/10' },
  violet: { bar: 'bg-violet/15 text-ink', solid: 'bg-violet/15', wash: 'bg-violet/12' },
  tangerine: { bar: 'bg-amber/12 text-ink', solid: 'bg-amber/12', wash: 'bg-amber/10' },
  cobalt: { bar: 'bg-violet-deep/18 text-ink', solid: 'bg-violet-deep/18', wash: 'bg-violet-deep/15' },
};

/** PROVISIONAL membership categories - the model is not confirmed by the client. */
const MEMBER_TYPE: Record<string, { label: string; chip: ChipTone; line: string }> = {
  PROFESSIONAL: {
    label: 'Professional',
    chip: 'cobalt',
    line: 'Practising security professional working in-house.',
  },
  LEADER: {
    label: 'Leader',
    chip: 'violet',
    line: 'Leads a security function and carries the budget for it.',
  },
  CONSULTANT: {
    label: 'Consultant',
    chip: 'tangerine',
    line: 'Independent or advisory practice, working across clients.',
  },
  VENDOR: {
    label: 'Vendor',
    chip: 'magenta',
    line: 'Supplies products, systems or services to the industry.',
  },
  ORGANISATION: {
    label: 'Organisation',
    chip: 'lime',
    line: 'Institute, association or research body in the sector.',
  },
};

const CHAPTER_ROLE: Record<string, ChipTone> = {
  CHAIR: 'magenta',
  COMMITTEE: 'violet',
  MEMBER: 'paper',
};

/* -------------------------------------------------------------------------- */

export async function generateMetadata({ params }: { params: { handle: string } }): Promise<Metadata> {
  try {
    const profile = await prisma.memberProfile.findUnique({
      where: { handle: params.handle },
      select: {
        fullName: true,
        handle: true,
        headline: true,
        org: true,
        field: true,
        location: true,
        privacy: { select: { isPublic: true, showOrg: true } },
      },
    });

    if (!profile || !profile.privacy?.isPublic) {
      return {
        title: 'Member not found',
        description: 'That profile does not exist, or the member has chosen to keep it private.',
      };
    }

    const org = profile.privacy.showOrg ? ` ${profile.org}.` : '';

    return {
      title: `${profile.fullName} - ${profile.headline}`,
      description: `${profile.fullName}: ${profile.headline}.${org} ${profile.field}, ${profile.location}. Profile in the BSA member directory.`,
    };
  } catch (err) {
    return { title: 'BSA Member Profile', description: 'Business Security Alliance member directory profile.' };
  }
}

/* -------------------------------------------------------------------------- */

export default async function MemberPage({ params }: { params: { handle: string } }) {
  let profile: any = null;

  try {
    profile = await prisma.memberProfile.findUnique({
      where: { handle: params.handle },
      select: {
        userId: true,
        fullName: true,
        handle: true,
        headline: true,
        jobTitle: true,
        org: true,
        field: true,
        memberType: true,
        location: true,
        bio: true,
        yearsExperience: true,
        avatarUrl: true,
        linkedinUrl: true,
        websiteUrl: true,
        twitterUrl: true,
        phone: true,
        contactEmail: true,
        specialties: true,
        skills: true,
        openToOpportunities: true,
        openToMentoring: true,
        openToSpeaking: true,
        lastActiveAt: true,
        createdAt: true,
        privacy: {
          select: {
            isPublic: true,
            showEmail: true,
            showPhone: true,
            showOrg: true,
            showLinkedIn: true,
            showWebsite: true,
          },
        },
        user: {
          select: {
            email: true,
            memberships: {
              orderBy: { joinedAt: 'asc' },
              select: {
                role: true,
                joinedAt: true,
                chapter: {
                  select: { slug: true, name: true, emoji: true, region: true, city: true, country: true },
                },
              },
            },
          },
        },
      },
    });
  } catch (err) {
    console.error('Member Profile DB Error on Serverless:', err);
  }

  if (!profile || !profile.privacy?.isPublic) notFound();

  const privacy = profile.privacy;
  const now = new Date();

  const [moduleRows, eventsAttended, eventsUpcoming, peers, session] = await Promise.all([
    prisma.resourceModule.findMany({
      where: { progress: { some: { userId: profile.userId } } },
      select: {
        resourceId: true,
        resource: {
          select: { slug: true, title: true, emoji: true, _count: { select: { modules: true } } },
        },
      },
    }),
    prisma.eventRegistration.count({
      where: { userId: profile.userId, status: 'CONFIRMED', event: { eventDate: { lt: now } } },
    }),
    prisma.eventRegistration.count({
      where: { userId: profile.userId, status: 'CONFIRMED', event: { eventDate: { gte: now } } },
    }),
    prisma.memberProfile.findMany({
      where: {
        field: profile.field,
        handle: { not: profile.handle },
        privacy: { isPublic: true, searchableInDirectory: true },
      },
      orderBy: { fullName: 'asc' },
      take: 4,
      select: {
        handle: true,
        fullName: true,
        jobTitle: true,
        org: true,
        location: true,
        avatarUrl: true,
        memberType: true,
        privacy: { select: { showOrg: true } },
      },
    }),
    getSession(),
  ]);

  /* Roll module completions up into per-resource progress. */
  const byResource = new Map<string, { slug: string; title: string; emoji: string; done: number; total: number }>();
  for (const row of moduleRows) {
    const existing = byResource.get(row.resourceId);
    if (existing) {
      existing.done += 1;
    } else {
      byResource.set(row.resourceId, {
        slug: row.resource.slug,
        title: row.resource.title,
        emoji: row.resource.emoji,
        done: 1,
        total: row.resource._count.modules,
      });
    }
  }
  const resourceProgress = Array.from(byResource.values()).sort(
    (a, b) => b.done / Math.max(b.total, 1) - a.done / Math.max(a.total, 1) || a.title.localeCompare(b.title),
  );
  const resourcesCompleted = resourceProgress.filter((r) => r.total > 0 && r.done >= r.total).length;

  const accent = ACCENT[accentFor(profile.handle)];
  const type = MEMBER_TYPE[profile.memberType] ?? {
    label: profile.memberType,
    chip: 'paper' as ChipTone,
    line: '',
  };

  // Deduplicate specialties and skills to prevent any redundancy
  const rawSpecialties = parseList(profile.specialties);
  const specialties = Array.from(new Set(rawSpecialties.map((s) => s.trim()))).filter(Boolean);

  const rawSkills = parseList(profile.skills);
  const lowerSpecialties = new Set(specialties.map((s) => s.toLowerCase()));
  const skills = Array.from(new Set(rawSkills.map((s) => s.trim()))).filter(
    (s) => Boolean(s) && !lowerSpecialties.has(s.toLowerCase()),
  );

  const tickerItems = Array.from(new Set([...specialties, ...skills]));

  // Deduplicate chapters
  const seenChapters = new Set<string>();
  const chapters = (profile.user.memberships ?? []).filter((m: any) => {
    if (seenChapters.has(m.chapter.slug)) return false;
    seenChapters.add(m.chapter.slug);
    return true;
  });

  const isYou = session?.userId === profile.userId;
  const firstName = profile.fullName.split(' ')[0];
  const roleLine = privacy.showOrg
    ? `${profile.jobTitle || profile.headline} at ${profile.org}`
    : profile.jobTitle || profile.headline;

  const displayEmail = profile.contactEmail || profile.user.email;

  const links: { kind: string; label: string; href: string; emoji: string }[] = [];
  if (privacy.showEmail && displayEmail) {
    links.push({ kind: 'Email', label: displayEmail, href: `mailto:${displayEmail}`, emoji: '' });
  }
  if (privacy.showPhone && profile.phone) {
    links.push({
      kind: 'Telephone',
      label: profile.phone,
      href: `tel:${profile.phone.replace(/\s+/g, '')}`,
      emoji: '',
    });
  }
  if (privacy.showLinkedIn && profile.linkedinUrl) {
    links.push({ kind: 'LinkedIn', label: 'Professional profile', href: profile.linkedinUrl, emoji: '' });
  }
  if (privacy.showWebsite && profile.websiteUrl) {
    links.push({ kind: 'Website', label: 'Organisation or practice site', href: profile.websiteUrl, emoji: '' });
  }
  if (profile.twitterUrl) {
    links.push({ kind: 'X', label: 'Public posts', href: profile.twitterUrl, emoji: '𝕏' });
  }

  const availability = [
    profile.openToOpportunities && {
      title: 'Open to opportunities',
      body: 'Considering roles, partnerships, referrals or new client work.',
      className: 'bg-cyan/12 text-ink',
      emoji: '💼',
    },
    profile.openToMentoring && {
      title: 'Available to mentor',
      body: 'Willing to advise other members one to one.',
      className: 'bg-violet/15 text-ink',
      emoji: '🎓',
    },
    profile.openToSpeaking && {
      title: 'Available to speak',
      body: 'Open to panels, briefings, webinars and chapter sessions.',
      className: 'bg-amber/12 text-ink',
      emoji: '🎙️',
    },
  ].filter(Boolean) as { title: string; body: string; className: string; emoji: string }[];

  const statCells = [
    { value: profile.yearsExperience ?? '-', label: 'Years in the industry' },
    { value: chapters.length, label: chapters.length === 1 ? 'Chapter' : 'Chapters' },
    { value: eventsAttended, label: 'Events attended' },
    { value: resourcesCompleted, label: 'Resources completed' },
  ];

  return (
    <div className="overflow-x-hidden">
      {/* ==================================================================
 PROFILE HEADER
 ================================================================== */}
      <section className="relative border-b border-line bg-surface-inset py-12 lg:py-16">
        <div className="absolute inset-0 mesh-dots opacity-30" aria-hidden />

        <div className="relative mx-auto max-w-container-max px-4 lg:px-10">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/directory"
              className="inline-flex items-center gap-2 border border-line-bright/40 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink/80 transition-colors hover:border-cyan/40 hover:text-cyan"
            >
              ← Member directory
            </Link>
            <div className="flex items-center gap-2">
              {isYou ? (
                <Button href="/dashboard?tab=profile" tone="lime" size="sm">
                  ✏️ Edit my profile
                </Button>
              ) : (
                <Button href={`/community?dm=${profile.userId}`} tone="lime" size="sm">
                  💬 Send Direct Message
                </Button>
              )}
            </div>
          </div>

          <div className="relative">
            <div aria-hidden className={cn('absolute inset-0 rotate-1 border border-line', accent.solid)} />

            <article className="relative border border-line bg-surface shadow-panel-lg">
              <div
                className={cn(
                  'flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] sm:text-[11px]',
                  accent.bar,
                )}
              >
                <span>Member profile</span>
                <span className="flex flex-wrap items-center gap-3">
                  <span>
                    Member since {formatMonth(profile.createdAt)} {new Date(profile.createdAt).getFullYear()}
                  </span>
                  <span className="border border-line bg-surface-inset px-2 py-0.5 text-ink">{type.label}</span>
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6 p-5 sm:p-7 md:grid-cols-[auto,1fr] md:gap-8">
                {/* Portrait */}
                <div className="flex flex-col items-center gap-3">
                  <div className={cn('border border-line p-2 shadow-panel', accent.wash)}>
                    <Avatar name={profile.fullName} src={profile.avatarUrl} size="xl" className="border" />
                  </div>
                  <p className="text-center font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                    Active {relativeTime(profile.lastActiveAt)}
                  </p>
                </div>

                {/* Identity */}
                <div className="min-w-0">
                  <h1 className="text-display-lg">{profile.fullName}</h1>
                  <p className="mt-2 font-mono text-sm font-bold tracking-[0.06em] text-violet-bright">
                    @{profile.handle}
                  </p>

                  <p className="mt-4 max-w-2xl text-lg font-bold leading-snug text-ink">{roleLine}</p>
                  <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink-soft">{profile.headline}</p>

                  <div className="mt-5 flex flex-wrap gap-1.5">
                    <Chip tone={type.chip}>{type.label}</Chip>
                    <Chip tone="ink">{profile.field}</Chip>
                    <Chip>📍 {profile.location}</Chip>
                    {profile.yearsExperience !== null && <Chip>{profile.yearsExperience} years in the industry</Chip>}
                  </div>

                  {availability.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-2">
                      {availability.map((item) => (
                        <p
                          key={item.title}
                          className={cn(
                            'flex items-center gap-2 border border-line px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] shadow-panel',
                            item.className,
                          )}
                        >
                          <span aria-hidden>{item.emoji}</span> {item.title}
                        </p>
                      ))}
                    </div>
                  )}

                  {links.length > 0 && (
                    <div className="mt-6">
                      <Button href={links[0].href} tone="ink" size="sm">
                        Contact via {links[0].kind}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Record strip */}
              <dl className="grid grid-cols-2 border-t border-line sm:grid-cols-4">
                {statCells.map((cell, i) => (
                  <div
                    key={cell.label}
                    className={cn(
                      'border-line p-3 text-center',
                      i % 2 === 0 && 'border-r',
                      i < 2 && 'border-b sm:border-b-0',
                      'sm:border-r sm:last:border-r-0',
                      i % 2 === 0 ? 'bg-surface' : 'bg-base',
                    )}
                  >
                    <dd className="font-display text-2xl leading-none sm:text-3xl">{cell.value}</dd>
                    <dt className="mt-1.5 font-mono text-[9px] font-bold uppercase leading-tight tracking-[0.1em] text-ink-muted">
                      {cell.label}
                    </dt>
                  </div>
                ))}
              </dl>
            </article>
          </div>

          <p className="mt-6 max-w-2xl font-mono text-[11px] leading-relaxed text-ink/60">
            {type.line} Membership categories are provisional and may change. This profile shows only what {firstName}{' '}
            has chosen to make public.
          </p>
        </div>
      </section>

      {tickerItems.length >= 3 && <Marquee tone="lime" speed="slow" items={tickerItems} separator="·" />}

      {/* ==================================================================
 BACKGROUND
 ================================================================== */}
      <section className="border-b border-line bg-base py-14 lg:py-20">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
            {/* Bio, specialties, skills */}
            <div className="space-y-6 lg:col-span-2">
              <Reveal>
                <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md shadow-panel-lg overflow-hidden">
                  <div className="flex items-center justify-between border-b border-line bg-surface-inset/80 px-6 py-4">
                    <span className="text-base font-extrabold text-white">Background</span>
                    <span className="rounded-full bg-cyan/20 border border-cyan/40 px-3 py-1 font-mono text-xs font-bold text-cyan">{profile.field}</span>
                  </div>
                  <div className="p-6">
                    <p className="text-base leading-relaxed text-ink-soft">{profile.bio}</p>
                  </div>
                </div>
              </Reveal>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <Reveal delay={0.05}>
                  <div className="h-full rounded-2xl border border-line bg-surface/90 backdrop-blur-md shadow-panel-lg overflow-hidden flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b border-line bg-surface-inset/80 px-6 py-4">
                      <span className="text-base font-extrabold text-white">Specialties</span>
                      <span className="rounded-full bg-cyan/20 border border-cyan/40 px-2.5 py-0.5 font-mono text-xs font-bold text-cyan">{specialties.length}</span>
                    </div>
                    <div className="p-6 flex-1">
                      {specialties.length ? (
                        <ul className="flex flex-wrap gap-2">
                          {specialties.map((specialty) => (
                            <li key={specialty}>
                              <span className="inline-block rounded-full bg-cyan/15 border border-cyan/30 text-cyan text-xs font-bold px-3.5 py-1.5 shadow-sm">
                                {specialty}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs leading-relaxed text-ink-muted">
                          No specialties listed. The bio above is the better guide.
                        </p>
                      )}
                    </div>
                  </div>
                </Reveal>

                <Reveal delay={0.1}>
                  <div className="h-full rounded-2xl border border-line bg-surface/90 backdrop-blur-md shadow-panel-lg overflow-hidden flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b border-line bg-surface-inset/80 px-6 py-4">
                      <span className="text-base font-extrabold text-white">Skills</span>
                      <span className="rounded-full bg-magenta/20 border border-magenta/40 px-2.5 py-0.5 font-mono text-xs font-bold text-magenta">{skills.length}</span>
                    </div>
                    <div className="p-6 flex-1">
                      {skills.length ? (
                        <ul className="flex flex-wrap gap-2">
                          {skills.map((skill) => (
                            <li key={skill}>
                              <span className="inline-block rounded-full bg-magenta/15 border border-magenta/30 text-magenta text-xs font-bold px-3.5 py-1.5 shadow-sm">
                                {skill}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs leading-relaxed text-ink-muted">No skills listed yet.</p>
                      )}
                    </div>
                  </div>
                </Reveal>
              </div>

              {/* Professional development */}
              <Reveal delay={0.05}>
                <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md shadow-panel-lg overflow-hidden">
                  <div className="flex items-center justify-between border-b border-line bg-surface-inset/80 px-6 py-4">
                    <span className="text-base font-extrabold text-white">Professional Development</span>
                    <span className="rounded-full bg-violet/20 border border-violet/40 px-3 py-1 font-mono text-xs font-bold text-violet-bright">
                      {resourcesCompleted} complete · {eventsUpcoming} upcoming
                    </span>
                  </div>
                  <div className="space-y-4 p-6">
                    {resourceProgress.length ? (
                      <ul className="space-y-4">
                        {resourceProgress.map((resource) => (
                          <li key={resource.slug}>
                            <Link
                              href={`/resources/${resource.slug}`}
                              className="group block rounded-xl border border-line bg-base p-4 transition-all hover:border-cyan/40 hover:bg-surface-raised"
                            >
                              <span className="flex items-center gap-3">
                                <span aria-hidden className="text-xl">
                                  {resource.emoji}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-white group-hover:text-cyan transition-colors">
                                  {resource.title}
                                </span>
                                {resource.total > 0 && resource.done >= resource.total && (
                                  <Chip size="sm" tone="lime">
                                    Complete
                                  </Chip>
                                )}
                              </span>
                              <ProgressMeter
                                className="mt-3"
                                done={resource.done}
                                total={Math.max(resource.total, resource.done)}
                                label="Modules"
                                tone="violet"
                              />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm leading-relaxed text-ink-muted">
                        No resource modules recorded yet. Members work through the resource library at their own pace,
                        and nothing is required.
                      </p>
                    )}
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Contact, chapters, participation */}
            <div className="space-y-6">
              <Reveal direction="left">
                <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md shadow-panel-lg overflow-hidden">
                  <div className="border-b border-line bg-surface-inset/80 px-6 py-4">
                    <span className="text-base font-extrabold text-white">Contact</span>
                  </div>
                  <div className="p-6">
                    {links.length ? (
                      <ul className="space-y-3">
                        {links.map((link) => (
                          <li key={link.kind}>
                            <a
                              href={link.href}
                              target={
                                link.href.startsWith('mailto:') || link.href.startsWith('tel:') ? undefined : '_blank'
                              }
                              rel="noopener noreferrer"
                              className="flex items-center gap-3.5 rounded-xl border border-line bg-base p-3.5 transition-all hover:border-cyan/40 hover:bg-surface-raised group"
                            >
                              <span aria-hidden className="text-xl shrink-0">
                                {link.emoji}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-cyan">
                                  {link.kind}
                                </span>
                                <span className="block truncate text-sm font-extrabold text-white group-hover:text-cyan transition-colors">{link.label}</span>
                              </span>
                              <span aria-hidden className="text-sm font-bold text-cyan group-hover:translate-x-0.5 transition-transform">
                                ↗
                              </span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs leading-relaxed text-ink-muted">
                        {firstName} has not published contact details. That is a privacy setting, not an oversight - a
                        chapter meeting or an event is the way to make the introduction.
                      </p>
                    )}
                  </div>
                </div>
              </Reveal>

              <Reveal direction="left" delay={0.06}>
                <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md shadow-panel-lg overflow-hidden">
                  <div className="flex items-center justify-between border-b border-line bg-surface-inset/80 px-6 py-4">
                    <span className="text-base font-extrabold text-white">Regional Chapters</span>
                    <span className="rounded-full bg-cyan/20 border border-cyan/40 px-2.5 py-0.5 font-mono text-xs font-bold text-cyan">{chapters.length}</span>
                  </div>
                  <div className="p-6">
                    {chapters.length ? (
                      <ul className="space-y-3">
                        {chapters.map((membership: any) => {
                          const icon = membership.chapter.emoji && membership.chapter.emoji !== '⬡' ? membership.chapter.emoji : '📍';
                          return (
                            <li key={membership.chapter.slug}>
                              <Link
                                href={`/chapters/${membership.chapter.slug}`}
                                className="flex items-center gap-3.5 rounded-xl border border-line bg-base p-3.5 transition-all hover:border-cyan/40 hover:bg-surface-raised group"
                              >
                                <span aria-hidden className="text-xl shrink-0">
                                  {icon}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-extrabold text-white group-hover:text-cyan transition-colors">{membership.chapter.name}</span>
                                  <span className="block truncate font-mono text-[10px] uppercase tracking-wider text-ink-muted mt-0.5">
                                    {membership.chapter.city}, {membership.chapter.country}
                                  </span>
                                </span>
                                <Chip size="sm" tone={CHAPTER_ROLE[membership.role] ?? 'paper'}>
                                  {membership.role}
                                </Chip>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-xs leading-relaxed text-ink-muted">Not a member of a regional chapter yet.</p>
                    )}
                  </div>
                </div>
              </Reveal>

              <Reveal direction="left" delay={0.12}>
                <div className="grid grid-cols-2 gap-3">
                  <Stat value={eventsAttended} label="Events attended" tone="paper" />
                  <Stat value={eventsUpcoming} label="Events booked" tone="violet" />
                </div>
              </Reveal>

              <Reveal direction="left" delay={0.16}>
                <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg">
                  <p className="font-mono text-xs font-extrabold uppercase tracking-wider text-cyan">
                    Availability & Intent
                  </p>
                  {availability.length ? (
                    <ul className="mt-4 space-y-3">
                      {availability.map((item) => (
                        <li key={item.title} className="rounded-xl border border-line bg-base p-3.5">
                          <p className="text-sm font-extrabold text-white flex items-center gap-2">
                            <span>{item.emoji}</span> {item.title}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-ink-soft">{item.body}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                      {firstName} has not marked any current availability. Listed in the directory, but not advertising
                      for opportunities, mentoring or speaking right now.
                    </p>
                  )}
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================
 SAME DISCIPLINE
 ================================================================== */}
      {peers.length > 0 && (
        <section className="border-b border-line bg-surface py-14 lg:py-20">
          <div className="mx-auto max-w-container-max px-4 lg:px-10">
            <SectionHead
              kicker="Same discipline"
              title={`Also working in ${profile.field}`}
              action={
                <Button href={`/directory?q=${encodeURIComponent(profile.field)}`} tone="ink" arrow>
                  See all in this discipline
                </Button>
              }
            />

            <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {peers.map((peer) => {
                const peerType = MEMBER_TYPE[peer.memberType];
                return (
                  <RevealItem key={peer.handle}>
                    <Link
                      href={`/members/${peer.handle}`}
                      className="group flex h-full flex-col border border-line bg-base p-4 shadow-panel panel-hover"
                    >
                      <Avatar name={peer.fullName} src={peer.avatarUrl} size="md" />
                      <h3 className="mt-3 text-base leading-tight transition-colors group-hover:text-violet-bright">
                        {peer.fullName}
                      </h3>
                      <p className="mt-1 flex-1 text-xs leading-relaxed text-ink-muted">
                        {peer.jobTitle}
                        {peer.privacy?.showOrg ? ` at ${peer.org}` : ''}
                      </p>
                      <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">
                        ▸ {peer.location}
                      </p>
                      {peerType && (
                        <div className="mt-2">
                          <Chip size="sm" tone={peerType.chip}>
                            {peerType.label}
                          </Chip>
                        </div>
                      )}
                    </Link>
                  </RevealItem>
                );
              })}
            </RevealGroup>
          </div>
        </section>
      )}

      {/* ==================================================================
 CTA
 ================================================================== */}
      <section className="relative overflow-hidden border-b border-line bg-cyan/12 py-16 lg:py-20">
        <div className="absolute inset-0 mesh-dots opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-container-max px-4 text-center lg:px-10">
          <Reveal>
            <h2 className="text-display-md mx-auto max-w-3xl">
              {links.length > 0 ? (
                <>
                  Get in touch with <span className="text-extrude">{firstName}</span> directly
                </>
              ) : (
                <>
                  Find the rest of the <span className="text-extrude">industry</span>
                </>
              )}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-ink-soft sm:text-base">
              {links.length > 0
                ? 'Be specific about what you are asking for and why you asked this person. Members reply far more often to a clear, short request.'
                : 'The directory holds every member who chose to be listed, searchable by discipline, region, specialty and availability.'}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {links.length > 0 ? (
                <Button href={links[0].href} tone="ink" size="lg">
                  Contact via {links[0].kind}
                </Button>
              ) : (
                <Button href="/membership" tone="ink" size="lg">
                  Apply for membership
                </Button>
              )}
              <Button href="/directory" tone="paper" size="lg">
                Back to the directory
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
