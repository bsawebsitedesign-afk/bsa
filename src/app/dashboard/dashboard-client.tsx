'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardBar, CardBody } from '@/components/ui/card';
import { Chip, LiveDot } from '@/components/ui/badge';
import { FieldError, Input, Label, Select, Textarea, Toggle } from '@/components/ui/field';
import { Counter } from '@/components/ui/counter';
import { Avatar, EmptyState, ProgressMeter, SectionHead, Stat, Sticker } from '@/components/ui/misc';
import { Modal } from '@/components/ui/modal';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { MediaDirectory } from '@/components/media/media-directory';
import { useToast } from '@/components/ui/toast';
import { cn, formatDate, formatDay, formatMonth, percent, relativeTime } from '@/lib/utils';

/* ========================================================================== */
/* Types  */
/* ========================================================================== */

export type TabKey = 'overview' | 'profile' | 'media' | 'privacy' | 'security' | 'activity';

/** How the member currently appears to everyone else. Derived from privacy. */
export type DirectoryVisibility = 'LISTED' | 'UNLISTED' | 'HIDDEN';

export interface DashProfileForm {
  fullName: string;
  handle: string;
  headline: string;
  org: string;
  jobTitle: string;
  field: string;
  memberType: string;
  location: string;
  bio: string;
  /** Held as a string so the number input can legitimately be empty. */
  yearsExperience: string;
  phone: string;
  contactEmail: string;
  avatarUrl: string;
  linkedinUrl: string;
  websiteUrl: string;
  specialties: string[];
  skills: string[];
  openToOpportunities: boolean;
  openToMentoring: boolean;
  openToSpeaking: boolean;
}

export interface DashPrivacy {
  isPublic: boolean;
  searchableInDirectory: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showOrg: boolean;
  showLinkedIn: boolean;
  showWebsite: boolean;
}

export interface DashStats {
  eventsRegistered: number;
  cpdHours: number;
  resourcesInProgress: number;
  resourcesComplete: number;
  chaptersJoined: number;
  applicationsSubmitted: number;
  modulesDone: number;
  totalModules: number;
  totalResources: number;
}

export interface DashRegistration {
  id: string;
  registrationCode: string;
  status: string;
  registeredAt: string;
  eventSlug: string;
  eventTitle: string;
  eventCategory: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  locationType: string;
  venueName: string | null;
  cpdHours: number;
  ticketName: string;
  ticketPrice: number;
  ticketCurrency: string;
  checkoutTransactionId: string | null;
  amountDue: number | null;
  amountDueCurrency: string;
  isPast: boolean;
}

export interface DashModuleDone {
  id: string;
  title: string;
  minutes: number;
  completedAt: string;
  resourceSlug: string;
  resourceTitle: string;
  resourceEmoji: string;
  resourceLevel: string;
  resourceModuleTotal: number;
}

export interface DashMembership {
  slug: string;
  name: string;
  region: string;
  city: string;
  country: string;
  emoji: string;
  meetingCadence: string;
  role: string;
  joinedAt: string;
}

export interface DashApplication {
  id: string;
  slug: string;
  title: string;
  org: string;
  type: string;
  locationType: string;
  location: string;
  status: string;
  deadline: string | null;
  createdAt: string;
}

export interface SuggestedResource {
  slug: string;
  title: string;
  summary: string;
  emoji: string;
  level: string;
  estHours: number;
  moduleCount: number;
}

export interface SuggestedChapter {
  slug: string;
  name: string;
  region: string;
  city: string;
  country: string;
  emoji: string;
  meetingCadence: string;
  memberCount: number;
}

export interface SuggestedEvent {
  slug: string;
  title: string;
  category: string;
  eventDate: string;
  startTime: string;
  location: string;
  locationType: string;
  cpdHours: number;
  isPaid: boolean;
}

interface DashboardClientProps {
  initialTab: TabKey;
  email: string;
  role: string;
  emailVerified: boolean;
  memberSince: string;
  profile: DashProfileForm;
  privacy: DashPrivacy;
  visibility: DirectoryVisibility;
  stats: DashStats;
  registrations: DashRegistration[];
  modulesDone: DashModuleDone[];
  memberships: DashMembership[];
  applications: DashApplication[];
  suggestedResource: SuggestedResource | null;
  suggestedChapter: SuggestedChapter | null;
  suggestedEvent: SuggestedEvent | null;
}

/** Every route in this app answers with this envelope. */
interface ApiReply {
  ok: boolean;
  error?: string;
  fields?: Record<string, string>;
}

/* ========================================================================== */
/* Static copy and lookups  */
/* ========================================================================== */

const TABS: Array<{ key: TabKey; label: string; emoji: string }> = [
  { key: 'overview', label: 'Overview', emoji: '▣' },
  { key: 'profile', label: 'Profile', emoji: '👤' },
  { key: 'media', label: 'Media Assets', emoji: '🖼️' },
  { key: 'privacy', label: 'Privacy', emoji: '◐' },
  { key: 'security', label: 'Security', emoji: '🔒' },
  { key: 'activity', label: 'Activity', emoji: '≡' },
];

/**
 * PROVISIONAL. The client has not signed off the membership model, so these
 * categories are placeholders and the copy below deliberately does not lean
 * on them meaning anything permanent.
 */
const MEMBER_TYPE_OPTIONS = [
  { value: 'PROFESSIONAL', label: 'Professional - practising in a security role' },
  { value: 'LEADER', label: 'Leader - running a security function or team' },
  { value: 'CONSULTANT', label: 'Consultant - independent adviser or practice' },
  { value: 'VENDOR', label: 'Vendor - supplying the security industry' },
  { value: 'ORGANISATION', label: 'Organisation - representing a body or employer' },
];

const MEMBER_TYPE_LABEL: Record<string, string> = {
  PROFESSIONAL: 'Professional',
  LEADER: 'Leader',
  CONSULTANT: 'Consultant',
  VENDOR: 'Vendor',
  ORGANISATION: 'Organisation',
};

const EVENT_EMOJI: Record<string, string> = {
  CONFERENCE: '🏛️',
  WORKSHOP: '🛠️',
  ROUNDTABLE: '💬',
  WEBINAR: '💻',
  NETWORKING: '🤝',
  SUMMIT: '⚡',
};

function eventEmoji(category: string): string {
  return EVENT_EMOJI[category] ?? '📅';
}

const OPPORTUNITY_LABEL: Record<string, string> = {
  ROLE: 'Role',
  PARTNERSHIP: 'Partnership',
  RFP: 'RFP',
  SPEAKING: 'Speaking',
  BOARD_POSITION: 'Board position',
};

const APP_STATUS_TONE: Record<string, 'lime' | 'magenta' | 'violet' | 'tangerine' | 'ink' | 'paper'> = {
  RECEIVED: 'paper',
  REVIEWING: 'tangerine',
  SHORTLISTED: 'lime',
  CLOSED: 'ink',
};

const APP_STATUS_COPY: Record<string, string> = {
  RECEIVED: 'Submitted. Nobody has opened it yet.',
  REVIEWING: 'Being read by the organisation that posted it.',
  SHORTLISTED: 'Shortlisted. Expect contact by email.',
  CLOSED: 'Closed. This listing is no longer taking applications.',
};

const CHAPTER_ROLE_TONE: Record<string, 'paper' | 'violet' | 'magenta'> = {
  MEMBER: 'paper',
  COMMITTEE: 'violet',
  CHAIR: 'magenta',
};

const VISIBILITY_COPY: Record<
  DirectoryVisibility,
  { label: string; detail: string; tone: 'lime' | 'tangerine' | 'ink' }
> = {
  LISTED: {
    label: 'Listed in the directory',
    detail:
      'Members and visitors can find you at /directory by discipline, region, member type and availability, then open your profile.',
    tone: 'lime',
  },
  UNLISTED: {
    label: 'Reachable by link only',
    detail:
      'Your profile page works for anyone who has the link, but you do not appear in directory search or filters. Nobody will come across you by accident.',
    tone: 'tangerine',
  },
  HIDDEN: {
    label: 'Hidden from everyone',
    detail:
      'Your public profile returns Not Found and you are absent from the directory. Your account, registrations and progress are untouched.',
    tone: 'ink',
  },
};

const SPECIALTY_SUGGESTIONS = [
  'Corporate security',
  'Risk management',
  'Physical security',
  'Security operations',
  'Investigations',
  'Crisis management',
  'Business continuity',
  'Supply chain security',
];

const SKILL_SUGGESTIONS = [
  'Risk assessment',
  'Incident response',
  'Threat intelligence',
  'Vendor selection',
  'Contract management',
  'Audit',
  'Training delivery',
  'Budget planning',
];

/** Local copy so this client bundle never pulls in the node-only payment lib. */
function money(amount: number, currency = 'USD'): string {
  if (amount === 0) return 'Free';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

function errorFor(fields: Record<string, string>, key: string): string | undefined {
  if (fields[key]) return fields[key];
  const nested = Object.keys(fields).find((k) => k.startsWith(`${key}.`));
  return nested ? fields[nested] : undefined;
}

/* ========================================================================== */
/* Profile completeness  */
/* ========================================================================== */

export interface CompletenessItem {
  key: string;
  label: string;
  why: string;
  todo: string;
  done: boolean;
}

/**
 * Six fields, each of which changes whether another member can find you or
 * decide to contact you. Kept identical to the count the server renders in
 * the page header.
 */
function completenessItems(form: DashProfileForm): CompletenessItem[] {
  const bioLength = form.bio.trim().length;

  return [
    {
      key: 'bio',
      label: 'Bio of 60 characters or more',
      why: 'The first thing anyone reads once they open your profile.',
      todo:
        bioLength === 0
          ? 'Two or three sentences: what you do, and what you are useful for.'
          : `${60 - bioLength} more characters.`,
      done: bioLength >= 60,
    },
    {
      key: 'avatarUrl',
      label: 'Profile photo',
      why: 'Shown on every directory card and at the top of your profile.',
      todo: 'Paste the URL of a headshot. A company photo is fine.',
      done: form.avatarUrl.trim().length > 0,
    },
    {
      key: 'specialties',
      label: 'At least one specialty',
      why: 'Directory search matches on these. A specialty you leave out is a search you never appear in.',
      todo: 'Add the areas people should come to you about.',
      done: form.specialties.length > 0,
    },
    {
      key: 'skills',
      label: 'At least one skill',
      why: 'Also matched by directory search, and listed on your profile.',
      todo: 'Add what you can actually do, not what you have read about.',
      done: form.skills.length > 0,
    },
    {
      key: 'linkedinUrl',
      label: 'LinkedIn link',
      why: 'The route most members will use to reach you. Shown only while the LinkedIn switch is on.',
      todo: 'Paste your LinkedIn profile URL.',
      done: form.linkedinUrl.trim().length > 0,
    },
    {
      key: 'yearsExperience',
      label: 'Years of experience',
      why: 'Drives the experience sort in the directory and sets expectations before a first conversation.',
      todo: 'A whole number between 0 and 60.',
      done: form.yearsExperience.trim().length > 0,
    },
  ];
}

/* ========================================================================== */
/* Shells  */
/* ========================================================================== */

function Panel({ tabKey, active, children }: { tabKey: TabKey; active: boolean; children: React.ReactNode }) {
  const reduced = useReducedMotion();

  return (
    <div
      role="tabpanel"
      id={`dashpanel-${tabKey}`}
      aria-labelledby={`dashtab-${tabKey}`}
      tabIndex={0}
      hidden={!active}
      className={cn('focus:outline-none', !active && 'hidden')}
    >
      {reduced ? (
        children
      ) : (
        <motion.div
          initial={false}
          animate={{ opacity: active ? 1 : 0, y: active ? 0 : 12 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}

function Band({
  tone = 'paper',
  children,
  className,
}: {
  tone?: 'paper' | 'bone' | 'violet' | 'ink';
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    paper: 'bg-surface',
    bone: 'bg-base',
    violet: 'bg-violet/15 text-ink',
    ink: 'bg-surface-inset text-ink',
  };
  return (
    <section className={cn('border-b border-line py-12 lg:py-16', tones[tone], className)}>
      <div className="mx-auto max-w-container-max px-4 lg:px-10">{children}</div>
    </section>
  );
}

/* ========================================================================== */
/* Tag input  */
/* ========================================================================== */

function TagInput({
  id,
  label,
  hint,
  values,
  max,
  placeholder,
  suggestions,
  invalid,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  values: string[];
  max: number;
  placeholder: string;
  suggestions: string[];
  invalid?: boolean;
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const atCap = values.length >= max;

  const addMany = useCallback(
    (raws: string[]) => {
      const next = [...values];
      for (const raw of raws) {
        const cleaned = raw.trim().replace(/\s+/g, ' ').slice(0, 40);
        if (!cleaned) continue;
        if (next.length >= max) break;
        if (next.some((v) => v.toLowerCase() === cleaned.toLowerCase())) continue;
        next.push(cleaned);
      }
      if (next.length !== values.length) onChange(next);
    },
    [max, onChange, values],
  );

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    // Pasting "risk, resilience, investigations" should land as three tags.
    if (value.includes(',')) {
      const parts = value.split(',');
      const tail = parts.pop() ?? '';
      addMany(parts);
      setDraft(tail.trimStart());
      return;
    }
    setDraft(value);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addMany([draft]);
      setDraft('');
      return;
    }
    if (event.key === 'Backspace' && draft === '' && values.length > 0) {
      event.preventDefault();
      onChange(values.slice(0, -1));
    }
  }

  const open = suggestions.filter((s) => !values.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 6);

  return (
    <div>
      <Label htmlFor={id} hint={`${values.length}/${max}`}>
        {label}
      </Label>

      <div
        className={cn(
          'flex w-full flex-wrap items-center gap-1.5 border border-line bg-surface p-2',
          invalid && 'border-violet/40 bg-rose/10',
        )}
      >
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex animate-fade-up items-center gap-1.5 border border-line bg-cyan/10 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em]"
          >
            {value}
            <button
              type="button"
              onClick={() => onChange(values.filter((v) => v !== value))}
              aria-label={`Remove ${value}`}
              className="text-rose transition-transform hover:scale-125"
            ></button>
          </span>
        ))}

        <input
          id={id}
          type="text"
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (draft.trim()) {
              addMany([draft]);
              setDraft('');
            }
          }}
          disabled={atCap}
          placeholder={atCap ? `${max} is the maximum` : placeholder}
          className="min-w-[10rem] flex-1 bg-transparent px-1 py-1 font-sans text-sm text-ink outline-none placeholder:text-ink-muted disabled:cursor-not-allowed"
        />
      </div>

      <p className="mt-1.5 text-[11px] leading-snug text-ink-muted">{hint}</p>

      {!atCap && open.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-ink-muted">Common ones</span>
          {open.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addMany([suggestion])}
              className="border border-dashed border-line bg-base px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted transition-colors hover:border-solid hover:bg-cyan/12 hover:text-ink"
            >
              + {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ========================================================================== */
/* Overview  */
/* ========================================================================== */

function MemberCard({
  profile,
  memberships,
  visibility,
}: {
  profile: DashProfileForm;
  memberships: DashMembership[];
  visibility: DirectoryVisibility;
}) {
  const state = VISIBILITY_COPY[visibility];
  const roleLine = [profile.jobTitle || profile.headline, profile.org].filter(Boolean).join(' at ');

  return (
    <div className="relative rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4 mb-6">
        <span className="font-mono text-xs font-extrabold uppercase tracking-wider text-white/80">Member Record</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan/40 bg-cyan/20 px-3 py-1 font-mono text-xs font-bold text-cyan shadow-panel">
          <LiveDot tone="cyan" /> {state.label}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start lg:col-span-7">
          <Avatar
            name={profile.fullName}
            src={profile.avatarUrl || null}
            size="xl"
            className="shadow-panel border-2 border-cyan/40 shrink-0"
          />

          <div className="min-w-0">
            <h2 className="text-3xl font-black text-white leading-tight tracking-tight">{profile.fullName}</h2>
            <p className="mt-1 font-mono text-xs font-bold uppercase tracking-wider text-cyan">
              @{profile.handle}
            </p>
            {roleLine && <p className="mt-2 text-base font-extrabold leading-snug text-white/90">{roleLine}</p>}
            {profile.headline && profile.jobTitle && (
              <p className="mt-1 text-sm font-medium leading-relaxed text-ink-soft">{profile.headline}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Chip size="sm" tone="violet">
                {MEMBER_TYPE_LABEL[profile.memberType] ?? profile.memberType}
              </Chip>
              {profile.field && <Chip size="sm">{profile.field}</Chip>}
              {profile.location && <Chip size="sm">{profile.location}</Chip>}
              {profile.yearsExperience && <Chip size="sm">{profile.yearsExperience} yrs exp</Chip>}
              {profile.openToOpportunities && (
                <Chip size="sm" tone="lime">
                  Open to opportunities
                </Chip>
              )}
              {profile.openToMentoring && (
                <Chip size="sm" tone="violet">
                  Mentoring
                </Chip>
              )}
              {profile.openToSpeaking && (
                <Chip size="sm" tone="tangerine">
                  Speaking
                </Chip>
              )}
            </div>

            <div className="mt-5 border-t border-line pt-4">
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-cyan mb-2">Regional Chapters</p>
              {memberships.length === 0 ? (
                <p className="text-xs font-medium leading-relaxed text-ink-soft">
                  Not in a regional chapter yet. Chapters are where members in the same part of the world actually meet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {memberships.map((membership) => (
                    <Link key={membership.slug} href={`/chapters/${membership.slug}`}>
                      <Chip size="sm" tone="paper" className="transition-all hover:border-cyan hover:bg-cyan/20">
                        <span aria-hidden>{membership.emoji}</span> {membership.name}
                      </Chip>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div
            className={cn(
              'h-full rounded-2xl border border-line p-5 backdrop-blur-md flex flex-col justify-between',
              state.tone === 'lime' ? 'border-cyan/40 bg-cyan/15' : state.tone === 'tangerine' ? 'border-amber/40 bg-amber/15' : 'bg-surface/80',
            )}
          >
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-cyan mb-2">
                Directory Visibility Status
              </p>
              <h4 className="text-xl font-black text-white tracking-tight">{state.label}</h4>
              <p className="mt-2 text-xs font-medium leading-relaxed text-white/90">{state.detail}</p>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
              <Button href={`/members/${profile.handle}`} tone="paper" size="sm">
                View public profile →
              </Button>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan">
                Edit on Privacy Tab
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompletenessPanel({
  items,
  handle,
  onEditProfile,
}: {
  items: CompletenessItem[];
  handle: string;
  onEditProfile: () => void;
}) {
  const done = items.filter((item) => item.done).length;
  const missing = items.filter((item) => !item.done);
  const pct = percent(done, items.length);

  return (
    <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg overflow-hidden">
      <div className="flex items-center justify-between border-b border-line pb-4 mb-6">
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan">Profile Completeness & Findability</span>
        <span className="rounded-full bg-cyan/20 border border-cyan/40 px-3.5 py-1 font-mono text-xs font-bold text-cyan">{pct}%</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-center">
        <div className="lg:col-span-5">
          <ProgressMeter
            done={done}
            total={items.length}
            label="Fields that affect how findable you are"
            tone={missing.length === 0 ? 'lime' : 'violet'}
          />

          <p className="mt-4 text-sm font-medium leading-relaxed text-white/90">
            This is not a score for its own sake. Directory search matches on your specialties and skills, the sort
            order uses years of experience, and your photo and bio are what someone reads before deciding whether to get
            in touch.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button tone="magenta" size="sm" onClick={onEditProfile}>
              {missing.length === 0 ? 'Edit my profile' : `Fill in the last ${missing.length} →`}
            </Button>
            <Button href={`/members/${handle}`} tone="paper" size="sm">
              See public profile
            </Button>
          </div>
        </div>

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-7">
          {items.map((item) => (
            <li
              key={item.key}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-4 transition-all duration-300',
                item.done ? 'border-cyan/50 bg-cyan/15 text-white' : 'border-line bg-surface/80 text-white/90',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-black shadow-panel',
                  item.done ? 'border-cyan/60 bg-cyan/30 text-cyan' : 'border-line bg-surface-inset text-white/40',
                )}
              >
                {item.done ? '✓' : '○'}
              </span>
              <span className="min-w-0">
                <span className="block font-black text-xs uppercase tracking-wider text-white">{item.label}</span>
                <span className="mt-1 block text-xs font-medium leading-relaxed text-white/80">
                  {item.done ? item.why : item.todo}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function RegistrationStub({ reg }: { reg: DashRegistration }) {
  const pending = reg.status === 'PENDING_PAYMENT';
  const cancelled = reg.status === 'CANCELLED';

  return (
    <li
      className={cn(
        'flex flex-col rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-5 shadow-panel-lg transition-all duration-300 sm:flex-row gap-5',
        pending ? 'border-amber/50 bg-amber/10' : cancelled ? 'border-rose/50 bg-surface/60' : 'hover:border-cyan/40',
      )}
    >
      <div className="flex flex-shrink-0 items-center gap-4 sm:w-[160px] sm:flex-col sm:items-start sm:justify-center border-b border-line pb-4 sm:border-b-0 sm:border-r sm:pr-5 sm:pb-0">
        <span className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-2xl border border-cyan/40 bg-cyan/20 text-cyan shadow-panel">
          <span className="font-display text-2xl font-black leading-none">{formatDay(reg.eventDate)}</span>
          <span className="font-mono text-xs font-extrabold uppercase tracking-wider">
            {formatMonth(reg.eventDate)}
          </span>
        </span>
        <div className="min-w-0">
          <Chip size="sm" tone="violet">
            <span aria-hidden>{eventEmoji(reg.eventCategory)}</span> {reg.eventCategory}
          </Chip>
          <p className="mt-2 font-mono text-xs font-bold uppercase tracking-wider text-cyan">
            {reg.isPast ? 'Already Held' : relativeTime(reg.eventDate)}
          </p>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <Link href={`/events/${reg.eventSlug}`} className="group block">
          <h3 className="text-xl font-black tracking-tight text-white transition-colors group-hover:text-cyan">{reg.eventTitle}</h3>
        </Link>
        <p className="mt-1.5 font-mono text-xs font-bold text-cyan uppercase tracking-wider">
          {reg.startTime} to {reg.endTime} · {reg.locationType.replace('_', ' ')}
        </p>
        <p className="mt-1 text-xs font-medium leading-relaxed text-white/90">
          {reg.venueName ? `${reg.venueName}, ` : ''}
          {reg.location}
        </p>

        <div className="mt-3.5 flex flex-wrap gap-2">
          <Chip size="sm">{reg.ticketName}</Chip>
          <Chip size="sm" tone={reg.ticketPrice > 0 ? 'tangerine' : 'lime'}>
            {money(reg.ticketPrice, reg.ticketCurrency)}
          </Chip>
          {reg.cpdHours > 0 && (
            <Chip size="sm" tone="violet">
              {reg.cpdHours} CPD {reg.cpdHours === 1 ? 'hour' : 'hours'}
            </Chip>
          )}
          <Chip size="sm" tone="paper">
            Booked {formatDate(reg.registeredAt, { month: 'short', day: 'numeric' })}
          </Chip>
        </div>

        {pending && (
          <div className="mt-4 rounded-xl border border-amber/40 bg-amber/15 p-4 text-white shadow-panel" role="status">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-amber">Payment Pending</p>
            <p className="mt-1 text-xs font-medium leading-relaxed text-white/90">
              Your place is held but unpaid, so this reference is not yet valid at the door.
              {reg.amountDue !== null && ` ${money(reg.amountDue, reg.amountDueCurrency)} is outstanding.`}
            </p>
            {reg.checkoutTransactionId ? (
              <Button href={`/checkout/${reg.checkoutTransactionId}`} tone="magenta" size="sm" className="mt-3">
                Resume payment →
              </Button>
            ) : (
              <p className="mt-2 font-mono text-xs uppercase tracking-wider text-white/80">
                No open payment session. Start again from the event page.
              </p>
            )}
          </div>
        )}

        {cancelled && (
          <p className="mt-3 rounded-xl border border-dashed border-rose/30 bg-rose/10 p-3 text-xs font-medium leading-relaxed text-white/90">
            This registration was cancelled and the place returned to the pool.
          </p>
        )}
      </div>

      <div className="flex flex-shrink-0 flex-col justify-between gap-3 border-t border-line pt-4 sm:w-[200px] sm:border-l sm:pl-5 sm:pt-0 sm:border-t-0">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-cyan">Reference Code</p>
          <p
            className={cn(
              'mt-1.5 rounded-xl border px-3 py-2 text-center font-mono text-sm font-black tracking-widest shadow-panel',
              pending || cancelled ? 'border-line bg-surface-inset text-white/40 line-through' : 'border-cyan/40 bg-cyan/20 text-cyan',
            )}
          >
            {reg.registrationCode}
          </p>
          <p className="mt-2 text-xs font-medium leading-relaxed text-white/80">
            {pending || cancelled
              ? 'Not valid for entry.'
              : 'Quote this code on arrival. A screenshot on your phone is fine.'}
          </p>
        </div>

        <Button href={`/events/${reg.eventSlug}`} tone="paper" size="sm" className="w-full">
          Event details →
        </Button>
      </div>
    </li>
  );
}

function OverviewPanel({
  profile,
  stats,
  registrations,
  memberships,
  visibility,
  items,
  suggestedResource,
  suggestedChapter,
  suggestedEvent,
  onEditProfile,
}: {
  profile: DashProfileForm;
  stats: DashStats;
  registrations: DashRegistration[];
  memberships: DashMembership[];
  visibility: DirectoryVisibility;
  items: CompletenessItem[];
  suggestedResource: SuggestedResource | null;
  suggestedChapter: SuggestedChapter | null;
  suggestedEvent: SuggestedEvent | null;
  onEditProfile: () => void;
}) {
  const upcoming = registrations.filter((reg) => !reg.isPast && reg.status !== 'CANCELLED');
  const unpaid = upcoming.filter((reg) => reg.status === 'PENDING_PAYMENT');

  return (
    <>
      <Band tone="paper">
        <MemberCard profile={profile} memberships={memberships} visibility={visibility} />

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
          <Stat tone="lime" label="Events registered" value={<Counter to={stats.eventsRegistered} />} />
          <Stat tone="violet" label="CPD hours booked" value={<Counter to={stats.cpdHours} />} />
          <Stat
            tone="paper"
            label={`Resources in progress of ${stats.totalResources}`}
            value={
              <span>
                <Counter to={stats.resourcesInProgress} />
                <span className="text-lg opacity-50">/{stats.totalResources}</span>
              </span>
            }
          />
          <Stat tone="tangerine" label="Chapters joined" value={<Counter to={stats.chaptersJoined} />} />
          <Stat tone="paper" label="Applications submitted" value={<Counter to={stats.applicationsSubmitted} />} />
        </div>

        <div className="mt-6">
          <CompletenessPanel items={items} handle={profile.handle} onEditProfile={onEditProfile} />
        </div>
      </Band>

      {/* ---------------------------------------------------------------- */}
      <Band tone="bone">
        <SectionHead
          kicker="Your registrations"
          tone="tangerine"
          title={
            <>
              Places held in <span className="text-amber px-1">your name</span>
            </>
          }
          blurb="Each reference is unique to your registration. Quote it on arrival, or forward it to whoever books your travel."
          action={
            <Button href="/events" tone="ink">
              Browse events →
            </Button>
          }
        />

        {unpaid.length > 0 && (
          <div
            role="status"
            className="mb-6 border border-line bg-grad-brand-soft p-4 text-ink shadow-panel sm:flex sm:items-center sm:justify-between sm:gap-4"
          >
            <p className="text-sm leading-relaxed">
              <strong className="font-display uppercase">
                {unpaid.length} registration{unpaid.length === 1 ? '' : 's'} awaiting payment.
              </strong>{' '}
              Held places are released when an event reaches capacity, so complete payment to keep yours.
            </p>
          </div>
        )}

        {upcoming.length === 0 ? (
          <EmptyState
            title="Nothing booked"
            blurb="Conferences, roundtables, workshops and webinars, most of them carrying CPD hours. The full history stays on the Activity tab."
            action={
              <Button href="/events" tone="magenta">
                See what is coming up
              </Button>
            }
          />
        ) : (
          <ul className="space-y-5">
            {upcoming.map((reg) => (
              <RegistrationStub key={reg.id} reg={reg} />
            ))}
          </ul>
        )}
      </Band>

      {/* ---------------------------------------------------------------- */}
      <Band tone="violet">
        <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="mb-3 inline-block border border-line bg-cyan/12 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink shadow-panel">
              Worth doing next
            </span>
            <h2 className="text-display-md text-ink">Where to go next</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/75">
              Chosen from what you have not done yet, not from a schedule. Ignore any of them without consequence.
            </p>
          </div>
          <Sticker tone="lime" rotate={-5} className="self-start text-[10px]">
            {stats.modulesDone} of {stats.totalModules} modules read
          </Sticker>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Resource */}
          <Card className="flex h-full flex-col text-ink" tilt={1}>
            <CardBar tone="violet">
              <span>Resource</span>
              <span>Learn</span>
            </CardBar>
            <CardBody className="flex flex-1 flex-col">
              {suggestedResource ? (
                <>
                  <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    <Chip size="sm" tone="paper">
                      <span aria-hidden>{suggestedResource.emoji}</span> {suggestedResource.level}
                    </Chip>
                    <Chip size="sm">{suggestedResource.moduleCount} modules</Chip>
                    <Chip size="sm">~{suggestedResource.estHours}h</Chip>
                  </div>
                  <h3 className="text-xl leading-tight">{suggestedResource.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">{suggestedResource.summary}</p>
                  <Button href={`/resources/${suggestedResource.slug}`} tone="violet" className="mt-4 w-full">
                    Open it →
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-xl leading-tight">You have opened every resource</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
                    All {stats.totalResources} of them. If your practice has a guide worth publishing here, the
                    committee will read it.
                  </p>
                  <Button href="/contact" tone="ink" className="mt-4 w-full">
                    Propose a resource
                  </Button>
                </>
              )}
            </CardBody>
          </Card>

          {/* Chapter */}
          <Card className="flex h-full flex-col text-ink" tilt={2}>
            <CardBar tone="lime">
              <span>Chapter</span>
              <span>Participate</span>
            </CardBar>
            <CardBody className="flex flex-1 flex-col">
              {suggestedChapter ? (
                <>
                  <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    <Chip size="sm" tone="paper">
                      <span aria-hidden>{suggestedChapter.emoji}</span> {suggestedChapter.region}
                    </Chip>
                    <Chip size="sm">{suggestedChapter.meetingCadence}</Chip>
                    <Chip size="sm">{suggestedChapter.memberCount} members</Chip>
                  </div>
                  <h3 className="text-xl leading-tight">{suggestedChapter.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
                    Based in {suggestedChapter.city}, {suggestedChapter.country}. Joining puts you on the list for their
                    meetings and tells other members which part of the world you work in.
                  </p>
                  <Button href={`/chapters/${suggestedChapter.slug}`} tone="lime" className="mt-4 w-full">
                    Look at this chapter →
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-xl leading-tight">You are in every active chapter</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
                    If your region is not represented yet, chapters start with one person willing to host the first
                    meeting.
                  </p>
                  <Button href="/contact" tone="ink" className="mt-4 w-full">
                    Ask about a new chapter
                  </Button>
                </>
              )}
            </CardBody>
          </Card>

          {/* Event */}
          <Card className="flex h-full flex-col text-ink" tilt={3}>
            <CardBar tone="tangerine">
              <span>Event</span>
              <span>Connect</span>
            </CardBar>
            <CardBody className="flex flex-1 flex-col">
              {suggestedEvent ? (
                <>
                  <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    <Chip size="sm" tone="paper">
                      <span aria-hidden>{eventEmoji(suggestedEvent.category)}</span> {suggestedEvent.category}
                    </Chip>
                    <Chip size="sm">{suggestedEvent.locationType.replace('_', ' ')}</Chip>
                    {suggestedEvent.cpdHours > 0 && <Chip size="sm">{suggestedEvent.cpdHours} CPD</Chip>}
                  </div>
                  <h3 className="text-xl leading-tight">{suggestedEvent.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
                    {formatDate(suggestedEvent.eventDate, { weekday: 'long', month: 'long', day: 'numeric' })} at{' '}
                    {suggestedEvent.startTime}. {suggestedEvent.location}.{' '}
                    {suggestedEvent.isPaid ? 'Paid registration.' : 'Free to members.'}
                  </p>
                  <Button href={`/events/${suggestedEvent.slug}`} tone="tangerine" className="mt-4 w-full">
                    Register →
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-xl leading-tight">Nothing on the calendar you have not booked</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
                    New dates go up regularly. Chapters also run their own sessions between the national events.
                  </p>
                  <Button href="/chapters" tone="ink" className="mt-4 w-full">
                    Check the chapters
                  </Button>
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </Band>
    </>
  );
}

/* ========================================================================== */
/* Profile panel  */
/* ========================================================================== */

function ProfilePanel({
  form,
  setField,
  baseline,
  onReset,
  fieldErrors,
  formError,
  pending,
  savedAt,
  onSubmit,
  items,
}: {
  form: DashProfileForm;
  setField: <K extends keyof DashProfileForm>(key: K, value: DashProfileForm[K]) => void;
  baseline: DashProfileForm;
  onReset: () => void;
  fieldErrors: Record<string, string>;
  formError: string | null;
  pending: boolean;
  savedAt: string | null;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  items: CompletenessItem[];
}) {
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
  const done = items.filter((item) => item.done).length;
  const missing = items.filter((item) => !item.done);

  return (
    <Band tone="bone">
      <SectionHead
        tone="violet"
        title={
          <>
            What other members <span className="text-gradient">actually see</span>
          </>
        }
        blurb="One record feeds your public profile, your directory card and the filters people search with. Write it the way you would introduce yourself to someone useful."
        action={
          <Button href={`/members/${baseline.handle}`} tone="paper">
            View it live →
          </Button>
        }
      />

      <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {/* 01 - identity */}
          <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-5">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan">01 · Who You Are</span>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="p-fullName" required>
                  Full name
                </Label>
                <Input
                  id="p-fullName"
                  value={form.fullName}
                  onChange={(e) => setField('fullName', e.target.value)}
                  invalid={Boolean(fieldErrors.fullName)}
                  maxLength={80}
                  autoComplete="name"
                />
                <FieldError>{fieldErrors.fullName}</FieldError>
              </div>

              <div>
                <Label htmlFor="p-handle" hint="letters, numbers, underscores" required>
                  Handle
                </Label>
                <div className="flex">
                  <span className="flex items-center rounded-l-md border border-r-0 border-line bg-surface-inset px-3 font-mono text-sm font-bold text-cyan">
                    @
                  </span>
                  <Input
                    id="p-handle"
                    value={form.handle}
                    onChange={(e) => setField('handle', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    invalid={Boolean(fieldErrors.handle)}
                    maxLength={20}
                    autoComplete="username"
                    className="w-auto min-w-0 flex-1 rounded-l-none"
                  />
                </div>
                <FieldError>{fieldErrors.handle}</FieldError>
                {!fieldErrors.handle && form.handle !== baseline.handle && (
                  <p className="mt-1.5 font-mono text-xs font-bold uppercase tracking-wider text-amber">
                    Your existing profile link stops working when you save this.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="p-jobTitle" hint={`${form.jobTitle.length}/120`}>
                  Job title
                </Label>
                <Input
                  id="p-jobTitle"
                  value={form.jobTitle}
                  onChange={(e) => setField('jobTitle', e.target.value)}
                  invalid={Boolean(fieldErrors.jobTitle)}
                  maxLength={120}
                  placeholder="Head of Corporate Security"
                  autoComplete="organization-title"
                />
                <FieldError>{fieldErrors.jobTitle}</FieldError>
              </div>

              <div>
                <Label htmlFor="p-org" required>
                  Organisation
                </Label>
                <Input
                  id="p-org"
                  value={form.org}
                  onChange={(e) => setField('org', e.target.value)}
                  invalid={Boolean(fieldErrors.org)}
                  maxLength={100}
                  placeholder="Employer, practice or body"
                  autoComplete="organization"
                />
                <FieldError>{fieldErrors.org}</FieldError>
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="p-headline" hint={`${form.headline.length}/120`}>
                  Headline
                </Label>
                <Input
                  id="p-headline"
                  value={form.headline}
                  onChange={(e) => setField('headline', e.target.value)}
                  invalid={Boolean(fieldErrors.headline)}
                  maxLength={120}
                  placeholder="One line on what you are responsible for"
                />
                <FieldError>{fieldErrors.headline}</FieldError>
              </div>

              <div>
                <Label htmlFor="p-field" hint="one discipline">
                  Discipline
                </Label>
                <Input
                  id="p-field"
                  value={form.field}
                  onChange={(e) => setField('field', e.target.value)}
                  invalid={Boolean(fieldErrors.field)}
                  maxLength={60}
                  placeholder="Corporate Security, Risk, Cyber…"
                />
                <FieldError>{fieldErrors.field}</FieldError>
                <p className="mt-1.5 text-xs font-medium leading-relaxed text-white/80">
                  The directory groups members by this exact string, so match how others write it.
                </p>
              </div>

              <div>
                <Label htmlFor="p-memberType">Membership category</Label>
                <Select
                  id="p-memberType"
                  value={form.memberType}
                  onChange={(e) => setField('memberType', e.target.value)}
                  invalid={Boolean(fieldErrors.memberType)}
                >
                  {MEMBER_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-surface text-white">
                      {option.label}
                    </option>
                  ))}
                </Select>
                <FieldError>{fieldErrors.memberType}</FieldError>
                <p className="mt-2 rounded-xl border border-dashed border-line bg-amber/10 p-2.5 text-xs font-medium leading-relaxed text-white/90">
                  The membership model is provisional and has not been confirmed. These categories carry no fee or entitlement, and whatever you pick now can change later.
                </p>
              </div>

              <div>
                <Label htmlFor="p-location" hint="City, Country">
                  Location
                </Label>
                <Input
                  id="p-location"
                  value={form.location}
                  onChange={(e) => setField('location', e.target.value)}
                  invalid={Boolean(fieldErrors.location)}
                  maxLength={100}
                  placeholder="Manchester, United Kingdom"
                />
                <FieldError>{fieldErrors.location}</FieldError>
                <p className="mt-1.5 text-xs font-medium leading-relaxed text-white/80">
                  The directory reads the part after the last comma as your region filter.
                </p>
              </div>

              <div>
                <Label htmlFor="p-yearsExperience" hint="0 - 60">
                  Years of experience
                </Label>
                <Input
                  id="p-yearsExperience"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={60}
                  value={form.yearsExperience}
                  onChange={(e) => setField('yearsExperience', e.target.value)}
                  invalid={Boolean(fieldErrors.yearsExperience)}
                  placeholder="12"
                />
                <FieldError>{fieldErrors.yearsExperience}</FieldError>
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="p-bio" hint={`${form.bio.trim().length}/900 · 60+ counts as complete`}>
                  Bio
                </Label>
                <Textarea
                  id="p-bio"
                  value={form.bio}
                  onChange={(e) => setField('bio', e.target.value)}
                  invalid={Boolean(fieldErrors.bio)}
                  maxLength={900}
                  placeholder="What you are responsible for, the problems you have handled, and what another member could sensibly ask you about."
                />
                <FieldError>{fieldErrors.bio}</FieldError>
              </div>
            </div>
          </div>

          {/* 02 - contact */}
          <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-5">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan">02 · Contact and Links</span>
              <span className="font-mono text-xs font-bold uppercase text-white/70">Full URLs</span>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="p-contactEmail" hint="optional">
                  Public Contact Email
                </Label>
                <Input
                  id="p-contactEmail"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setField('contactEmail', e.target.value)}
                  invalid={Boolean(fieldErrors.contactEmail)}
                  maxLength={120}
                  placeholder="contact@domain.com"
                  autoComplete="email"
                />
                <FieldError>{fieldErrors.contactEmail}</FieldError>
              </div>

              <div>
                <Label htmlFor="p-phone" hint="optional">
                  Phone
                </Label>
                <Input
                  id="p-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  invalid={Boolean(fieldErrors.phone)}
                  maxLength={40}
                  placeholder="+44 …"
                  autoComplete="tel"
                />
                <FieldError>{fieldErrors.phone}</FieldError>
              </div>

              <div className="sm:col-span-2 rounded-xl border border-line bg-surface-inset/80 p-4">
                <Label htmlFor="p-avatarUrl">Profile Picture</Label>
                <div className="mt-2 flex flex-col sm:flex-row items-center gap-4">
                  <Avatar name={form.fullName} src={form.avatarUrl} size="lg" className="border-2 border-cyan/40" />
                  <div className="flex-1 space-y-2.5 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-cyan px-4 py-2 text-xs font-black text-void transition-opacity hover:opacity-90 shadow-panel">
                        <span>📷</span> Upload Photo File
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                alert('Please select an image smaller than 5MB.');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                if (evt.target?.result) {
                                  setField('avatarUrl', evt.target.result as string);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {form.avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setField('avatarUrl', '')}
                          className="rounded-xl border border-rose/40 bg-rose/10 px-3.5 py-2 text-xs font-bold text-rose hover:bg-rose/20 transition-colors"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                    {form.avatarUrl?.startsWith('data:image/') ? (
                      <div className="flex items-center gap-2 rounded-xl border border-cyan/40 bg-cyan/20 px-3.5 py-2 text-xs font-bold text-cyan">
                        <span>✅ Custom photo uploaded and ready to save</span>
                      </div>
                    ) : (
                      <Input
                        id="p-avatarUrl"
                        type="text"
                        value={form.avatarUrl}
                        onChange={(e) => setField('avatarUrl', e.target.value)}
                        invalid={Boolean(fieldErrors.avatarUrl)}
                        placeholder="Or paste direct image URL (https://…)"
                      />
                    )}
                  </div>
                </div>
                <FieldError>{fieldErrors.avatarUrl}</FieldError>
              </div>

              <div>
                <Label htmlFor="p-linkedinUrl">LinkedIn</Label>
                <Input
                  id="p-linkedinUrl"
                  type="url"
                  value={form.linkedinUrl}
                  onChange={(e) => setField('linkedinUrl', e.target.value)}
                  invalid={Boolean(fieldErrors.linkedinUrl)}
                  placeholder="https://linkedin.com/in/you"
                />
                <FieldError>{fieldErrors.linkedinUrl}</FieldError>
              </div>

              <div>
                <Label htmlFor="p-websiteUrl">Website</Label>
                <Input
                  id="p-websiteUrl"
                  type="url"
                  value={form.websiteUrl}
                  onChange={(e) => setField('websiteUrl', e.target.value)}
                  invalid={Boolean(fieldErrors.websiteUrl)}
                  placeholder="https://…"
                />
                <FieldError>{fieldErrors.websiteUrl}</FieldError>
              </div>

              <p className="text-xs font-medium leading-relaxed text-white/80 sm:col-span-2">
                Your phone number, LinkedIn, and website only appear publicly while the matching switch on the Privacy
                tab is turned on. Blank fields are omitted entirely.
              </p>
            </div>
          </div>

          {/* 03 - expertise */}
          <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-5">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan">03 · Expertise & Skills</span>
              <span className="font-mono text-xs font-bold uppercase text-white/70">Press Enter or comma to add</span>
            </div>
            <div className="space-y-6">
              <TagInput
                id="p-specialties"
                label="Specialties"
                hint="Areas people should approach you about. Directory search matches on every one of these."
                values={form.specialties}
                max={12}
                placeholder="Type and press Enter…"
                suggestions={SPECIALTY_SUGGESTIONS}
                invalid={Boolean(errorFor(fieldErrors, 'specialties'))}
                onChange={(next) => setField('specialties', next)}
              />
              <FieldError>{errorFor(fieldErrors, 'specialties')}</FieldError>

              <TagInput
                id="p-skills"
                label="Skills"
                hint="Practical capability rather than job history. Also matched by directory search."
                values={form.skills}
                max={16}
                placeholder="Type and press Enter…"
                suggestions={SKILL_SUGGESTIONS}
                invalid={Boolean(errorFor(fieldErrors, 'skills'))}
                onChange={(next) => setField('skills', next)}
              />
              <FieldError>{errorFor(fieldErrors, 'skills')}</FieldError>
            </div>
          </div>

          {/* 04 - availability */}
          <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-5">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan">04 · What You Are Open To</span>
              <span className="font-mono text-xs font-bold uppercase text-white/70">Filterable</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Toggle
                checked={form.openToOpportunities}
                onChange={(next) => setField('openToOpportunities', next)}
                label="Open to opportunities"
                description="Roles, partnerships, RFPs and board positions. Members can filter the directory down to just this."
              />
              <Toggle
                checked={form.openToMentoring}
                onChange={(next) => setField('openToMentoring', next)}
                label="Open to mentoring"
                description="Take occasional questions from members earlier in their career."
              />
              <Toggle
                checked={form.openToSpeaking}
                onChange={(next) => setField('openToSpeaking', next)}
                label="Open to speaking"
                description="Organisers looking for panellists and session leads filter on this."
              />
            </div>
          </div>

          {formError && (
            <div
              role="alert"
              className="animate-shake rounded-xl border border-rose/40 bg-rose/20 p-4 text-sm font-bold text-white shadow-panel"
            >
              {formError}
            </div>
          )}

          <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-cyan/40 bg-surface/95 backdrop-blur-xl p-4 shadow-2xl sm:flex-row sm:items-center sm:justify-between">
            <p aria-live="polite" className="font-mono text-xs font-bold uppercase tracking-wider text-cyan">
              {pending
                ? 'Saving changes…'
                : dirty
                  ? '⚠️ Unsaved profile changes'
                  : savedAt
                    ? `✓ Saved at ${savedAt}`
                    : `${done} of ${items.length} key fields filled in`}
            </p>
            <div className="flex flex-shrink-0 gap-3">
              <Button type="button" tone="paper" onClick={onReset} disabled={!dirty || pending}>
                Undo
              </Button>
              <Button type="submit" tone="magenta" disabled={pending || !dirty}>
                {pending ? 'Saving…' : 'Save profile →'}
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5 lg:col-span-4">
          <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg lg:sticky lg:top-[150px]">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan">Findability Index</span>
              <span className="rounded-full bg-cyan/20 border border-cyan/40 px-3 py-0.5 font-mono text-xs font-bold text-cyan">{percent(done, items.length)}%</span>
            </div>
            <div className="space-y-4">
              <ProgressMeter done={done} total={items.length} tone={missing.length === 0 ? 'lime' : 'violet'} />

              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.key} className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className={cn(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-black',
                        item.done ? 'border-cyan/50 bg-cyan/20 text-cyan' : 'border-line bg-surface-inset text-white/40',
                      )}
                    >
                      {item.done ? '✓' : '○'}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          'block text-xs font-extrabold leading-snug',
                          item.done ? 'text-white/50 line-through' : 'text-white',
                        )}
                      >
                        {item.label}
                      </span>
                      {!item.done && <span className="block text-xs font-medium leading-relaxed text-white/80">{item.todo}</span>}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="border-t border-line pt-3 text-xs font-medium leading-relaxed text-white/80">
                {missing.length === 0
                  ? 'Every field that affects search is filled in. Save and your directory card updates immediately.'
                  : `Still empty: ${missing.map((item) => item.label.toLowerCase()).join(', ')}.`}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan">Directory Card Preview</span>
            </div>
            <div>
              <div className="flex items-start gap-3.5">
                <Avatar name={form.fullName || 'BSA member'} src={form.avatarUrl || null} size="lg" className="border-2 border-cyan/40" />
                <div className="min-w-0">
                  <p className="truncate text-lg font-black tracking-tight text-white">
                    {form.fullName || 'Your name'}
                  </p>
                  <p className="truncate font-mono text-xs font-bold text-cyan">
                    @{form.handle || 'handle'}
                  </p>
                  <p className="mt-1.5 text-xs font-medium leading-relaxed text-white/80">
                    {[form.jobTitle || form.headline, form.org].filter(Boolean).join(' at ') ||
                      'Job title and organisation show here.'}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Chip size="sm" tone="violet">
                  {MEMBER_TYPE_LABEL[form.memberType] ?? form.memberType}
                </Chip>
                {form.field && <Chip size="sm">{form.field}</Chip>}
                {form.location && <Chip size="sm">{form.location}</Chip>}
              </div>

              {form.bio.trim() && (
                <p className="mt-4 border-t border-line pt-3 text-xs font-medium leading-relaxed text-white/80">
                  {form.bio.trim().slice(0, 220)}
                  {form.bio.trim().length > 220 ? '…' : ''}
                </p>
              )}

              {(form.specialties.length > 0 || form.skills.length > 0) && (
                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3">
                  {form.specialties.slice(0, 5).map((specialty) => (
                    <Chip key={`sp-${specialty}`} size="sm" tone="lime">
                      {specialty}
                    </Chip>
                  ))}
                  {form.skills.slice(0, 4).map((skill) => (
                    <Chip key={`sk-${skill}`} size="sm" tone="paper">
                      {skill}
                    </Chip>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </Band>
  );
}

/* ========================================================================== */
/* Privacy panel  */
/* ========================================================================== */

const PRIVACY_KEYS: Array<keyof DashPrivacy> = [
  'isPublic',
  'searchableInDirectory',
  'showOrg',
  'showEmail',
  'showPhone',
  'showLinkedIn',
  'showWebsite',
];

const PRIVACY_COPY: Record<keyof DashPrivacy, { label: string; description: string }> = {
  isPublic: {
    label: 'Public profile page',
    description:
      'Controls whether /members/your-handle exists. Off, and the page returns Not Found for everyone but you, and you drop out of the directory whatever the other switches say.',
  },
  searchableInDirectory: {
    label: 'Listed in the member directory',
    description:
      'Puts you in /directory, where anyone can filter by discipline, region, membership category and availability, and search your name, job title, organisation, specialties and skills. Off, and your profile still opens for anyone holding the link.',
  },
  showOrg: {
    label: 'Show my organisation',
    description:
      'Prints your employer beside your job title on your profile and directory card. Off, and only the job title shows.',
  },
  showEmail: {
    label: 'Show my email address',
    description:
      'Publishes your sign-in email on your public profile as a contact route. Anyone who can open the page can read and copy it.',
  },
  showPhone: {
    label: 'Show my phone number',
    description:
      'Publishes the phone number from your profile on the same public page. Does nothing until the phone field is filled in.',
  },
  showLinkedIn: {
    label: 'Show my LinkedIn link',
    description: 'Adds LinkedIn to the contact links on your profile. Only appears if the field is filled in.',
  },
  showWebsite: {
    label: 'Show my website link',
    description: 'Adds your website to the contact links on your profile. Only appears if the field is filled in.',
  },
};

function PrivacyPanel({ initial, handle }: { initial: DashPrivacy; handle: string }) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState<DashPrivacy>(initial);
  const [baseline, setBaseline] = useState<DashPrivacy>(initial);
  const [pending, setPending] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty = PRIVACY_KEYS.some((key) => values[key] !== baseline[key]);
  const onCount = PRIVACY_KEYS.filter((key) => values[key]).length;

  async function save() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/user/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = (await res.json()) as ApiReply;

      if (!data.ok) {
        setError(data.error ?? 'That did not save. Try again in a moment.');
        return;
      }

      setBaseline(values);
      setSavedAt(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
      toast.success('Privacy saved', 'Live across the directory and your profile now.');
      router.refresh();
    } catch {
      setError('Could not reach the server. Check your connection and save again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Band tone="paper">
      <SectionHead
        tone="magenta"
        title={
          <>
            You decide what <span className="text-rose px-1">leaves this page</span>
          </>
        }
        blurb="Seven switches, each described exactly. Nothing here is sold, and none of it is passed to partners or sponsors."
        action={
          <Button href={`/members/${handle}`} tone="ink">
            See what others see →
          </Button>
        }
      />

      {!values.isPublic && (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 border border-line bg-surface-inset p-4 text-ink shadow-panel"
        >
          <span aria-hidden className="font-display text-xl leading-none">
            ◐
          </span>
          <p className="text-sm leading-relaxed">
            <strong className="font-display uppercase">Your profile is switched off.</strong> With the public page
            hidden, the switches below have nothing to act on - nobody can reach the page to see any of it. Your
            registrations, chapter memberships and reading progress are unaffected.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {PRIVACY_KEYS.map((key) => (
          <Toggle
            key={key}
            checked={values[key]}
            onChange={(next) => setValues((current) => ({ ...current, [key]: next }) as DashPrivacy)}
            label={PRIVACY_COPY[key].label}
            description={PRIVACY_COPY[key].description}
            disabled={pending}
          />
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-5 animate-shake border border-line bg-grad-brand-soft p-4 text-sm font-bold text-ink shadow-panel"
        >
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 border border-line bg-violet/15 p-4 text-ink shadow-panel-lg sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite" className="font-mono text-[11px] font-bold uppercase tracking-[0.12em]">
          {pending
            ? 'Saving…'
            : dirty
              ? `${onCount} of 7 switched on · unsaved`
              : savedAt
                ? `Saved at ${savedAt}`
                : `${onCount} of 7 switched on`}
        </p>
        <div className="flex flex-shrink-0 gap-2">
          <Button type="button" tone="paper" onClick={() => setValues(baseline)} disabled={!dirty || pending}>
            Undo
          </Button>
          <Button type="button" tone="lime" onClick={save} disabled={!dirty || pending}>
            {pending ? 'Saving…' : 'Save privacy'}
          </Button>
        </div>
      </div>
    </Band>
  );
}

/* ========================================================================== */
/* Security panel  */
/* ========================================================================== */

function SecurityPanel({
  email,
  role,
  emailVerified,
  memberSince,
}: {
  email: string;
  role: string;
  emailVerified: boolean;
  memberSince: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [pending, setPending] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const checks = [
    { label: 'At least 8 characters', ok: newPassword.length >= 8 },
    { label: 'At least one letter', ok: /[a-zA-Z]/.test(newPassword) },
    { label: 'At least one number', ok: /[0-9]/.test(newPassword) },
  ];
  const strength = checks.filter((check) => check.ok).length;

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFields({});
    setDone(false);

    if (newPassword !== confirmPassword) {
      setFields({ confirmPassword: 'These two do not match.' });
      return;
    }
    if (strength < 3) {
      setFields({ newPassword: 'Eight characters with at least one letter and one number.' });
      return;
    }

    setPending(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as ApiReply;

      if (!data.ok) {
        setError(data.error ?? 'That did not go through. Try again.');
        setFields(data.fields ?? {});
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setDone(true);
      toast.success('Password changed', 'This device stays signed in.');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    setError(null);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      router.push('/');
      router.refresh();
    } catch {
      setSigningOut(false);
      setError('Sign out did not go through. Try again, or clear this site’s cookies.');
    }
  }

  return (
    <Band tone="bone">
      <SectionHead
        kicker="Security"
        tone="tangerine"
        title="Account and access"
        blurb="One password, one session cookie, no third-party sign-in. Deliberately short."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg overflow-hidden">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan">Account Credentials</span>
              <span className="rounded-full border border-cyan/40 bg-cyan/20 px-3 py-1 font-mono text-xs font-bold text-cyan">{role}</span>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Email', value: email },
                { label: 'Role', value: role === 'ADMIN' ? 'Admin Access (/admin active)' : 'Member' },
                { label: 'Email Verified', value: emailVerified ? 'Yes (Verified)' : 'Pending verification' },
                {
                  label: 'Member Since',
                  value: formatDate(memberSince, { month: 'long', day: 'numeric', year: 'numeric' }),
                },
                { label: 'Sign-in Method', value: 'Email and Password' },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line/60 pb-3 last:border-b-0"
                >
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan/90">
                    {row.label}
                  </span>
                  <span className="min-w-0 break-all text-right text-sm font-extrabold text-white">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-line bg-surface/80 p-5 backdrop-blur-md">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-cyan mb-1">
              Forgotten Password?
            </p>
            <p className="text-xs font-medium leading-relaxed text-white/90">
              Sign out, then click the password reset link on the sign-in page to receive a 1-hour secure reset token via email.
            </p>
          </div>
        </div>

        <div className="lg:col-span-7">
          <form onSubmit={changePassword} noValidate className="rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-6 shadow-panel-lg">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-5">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan">Change Password</span>
            </div>
            <div className="space-y-5">
              <div>
                <Label htmlFor="s-current" required>
                  Current password
                </Label>
                <Input
                  id="s-current"
                  type={reveal ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  invalid={Boolean(fields.currentPassword)}
                  autoComplete="current-password"
                  required
                />
                <FieldError>{fields.currentPassword}</FieldError>
              </div>

              <div>
                <Label htmlFor="s-new" required>
                  New password
                </Label>
                <Input
                  id="s-new"
                  type={reveal ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  invalid={Boolean(fields.newPassword)}
                  autoComplete="new-password"
                  required
                />
                <FieldError>{fields.newPassword}</FieldError>

                <div className="mt-3 flex items-center gap-2" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={cn(
                        'h-2.5 flex-1 rounded-full transition-all duration-300',
                        i < strength ? (strength === 3 ? 'bg-cyan shadow-panel' : 'bg-amber') : 'bg-surface-inset',
                      )}
                    />
                  ))}
                </div>
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
                  {checks.map((check) => (
                    <li
                      key={check.label}
                      className={cn(
                        'font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5',
                        check.ok ? 'text-cyan font-black' : 'text-white/60',
                      )}
                    >
                      <span>{check.ok ? '✓' : '○'}</span> {check.label}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <Label htmlFor="s-confirm" required>
                  New password again
                </Label>
                <Input
                  id="s-confirm"
                  type={reveal ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  invalid={Boolean(fields.confirmPassword)}
                  autoComplete="new-password"
                  required
                />
                <FieldError>{fields.confirmPassword}</FieldError>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white/90">
                <input
                  type="checkbox"
                  checked={reveal}
                  onChange={(e) => setReveal(e.target.checked)}
                  className="h-4 w-4 accent-cyan"
                />
                Show password text
              </label>

              {error && (
                <div
                  role="alert"
                  className="animate-shake rounded-xl border border-rose/40 bg-rose/15 p-4 text-sm font-bold text-white shadow-panel"
                >
                  {error}
                </div>
              )}

              {done && (
                <div
                  role="status"
                  className="animate-fade-up rounded-xl border border-cyan/40 bg-cyan/20 p-4 text-sm font-bold text-cyan shadow-panel"
                >
                  ✓ Password changed successfully! Use your new password next time you log in.
                </div>
              )}

              <Button
                type="submit"
                tone="magenta"
                disabled={pending || !currentPassword || !newPassword || !confirmPassword}
                className="w-full"
              >
                {pending ? 'Changing…' : 'Change password →'}
              </Button>
            </div>
          </form>

          <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-rose/40 bg-surface/90 backdrop-blur-md p-6 text-white shadow-panel-lg sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-md">
              <p className="text-xl font-black uppercase tracking-tight text-white">Sign Out of This Device</p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-white/90">
                Clears your session cookie in this browser only. All your saved profile data remains saved.
              </p>
            </div>
            <Button type="button" tone="magenta" onClick={signOut} disabled={signingOut} className="flex-shrink-0">
              {signingOut ? 'Signing out…' : 'Sign out'}
            </Button>
          </div>
        </div>
      </div>
    </Band>
  );
}

/* ========================================================================== */
/* Activity panel  */
/* ========================================================================== */

interface ResourceGroup {
  slug: string;
  title: string;
  emoji: string;
  level: string;
  total: number;
  latest: string;
  modules: DashModuleDone[];
}

function groupByResource(modulesDone: DashModuleDone[]): ResourceGroup[] {
  const groups = new Map<string, ResourceGroup>();

  for (const mod of modulesDone) {
    const existing = groups.get(mod.resourceSlug);
    if (existing) {
      existing.modules.push(mod);
      if (mod.completedAt > existing.latest) existing.latest = mod.completedAt;
      continue;
    }
    groups.set(mod.resourceSlug, {
      slug: mod.resourceSlug,
      title: mod.resourceTitle,
      emoji: mod.resourceEmoji,
      level: mod.resourceLevel,
      total: mod.resourceModuleTotal,
      latest: mod.completedAt,
      modules: [mod],
    });
  }

  return Array.from(groups.values()).sort((a, b) => b.latest.localeCompare(a.latest));
}

function ActivityPanel({
  registrations,
  modulesDone,
  applications,
  memberships,
  stats,
}: {
  registrations: DashRegistration[];
  modulesDone: DashModuleDone[];
  applications: DashApplication[];
  memberships: DashMembership[];
  stats: DashStats;
}) {
  const groups = useMemo(() => groupByResource(modulesDone), [modulesDone]);
  const minutesRead = modulesDone.reduce((sum, mod) => sum + mod.minutes, 0);

  return (
    <>
      {/* Registrations */}
      <Band tone="paper">
        <SectionHead
          tone="tangerine"
          title={
            <>
              Every event you <span className="text-amber px-1">signed up for</span>
            </>
          }
          blurb={
            registrations.length > 0
              ? `${registrations.length} registration${registrations.length === 1 ? '' : 's'} on record, carrying ${stats.cpdHours} confirmed CPD hours. Newest first.`
              : 'No registrations on record yet.'
          }
          action={
            <Button href="/events" tone="ink">
              Events calendar →
            </Button>
          }
        />

        {registrations.length === 0 ? (
          <EmptyState
            title="No registrations yet"
            blurb="Roundtables and webinars are the low-commitment way in. Most are free to members and carry CPD hours."
            action={
              <Button href="/events" tone="tangerine">
                See the calendar
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2.5">
            {registrations.map((reg) => (
              <li key={reg.id}>
                <Link
                  href={`/events/${reg.eventSlug}`}
                  className="group flex flex-wrap items-center gap-3 border border-line bg-base p-3 shadow-panel panel-hover"
                >
                  <span
                    aria-hidden
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center border border-line bg-amber/10 text-lg"
                  >
                    {eventEmoji(reg.eventCategory)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-sm uppercase transition-colors group-hover:text-violet-bright">
                      {reg.eventTitle}
                    </span>
                    <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                      {formatDate(reg.eventDate)} · {reg.location} · {reg.ticketName}
                      {reg.cpdHours > 0 ? ` · ${reg.cpdHours} CPD` : ''}
                    </span>
                  </span>
                  <Chip
                    size="sm"
                    tone={reg.status === 'CONFIRMED' ? 'lime' : reg.status === 'PENDING_PAYMENT' ? 'magenta' : 'paper'}
                  >
                    {reg.status.replace('_', ' ')}
                  </Chip>
                  <span className="font-mono text-[11px] font-bold tracking-[0.12em] text-ink-muted">
                    {reg.registrationCode}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Band>

      {/* Resource progress */}
      <Band tone="bone">
        <SectionHead
          tone="violet"
          title="Modules you have completed"
          blurb={
            modulesDone.length > 0
              ? `${modulesDone.length} of ${stats.totalModules} published modules and ${stats.resourcesComplete} resource${stats.resourcesComplete === 1 ? '' : 's'} finished end to end, roughly ${minutesRead} minutes of reading.`
              : 'Resources are short modules in sequence, written by practitioners. Nothing completed yet.'
          }
          action={
            <Button href="/resources" tone="paper">
              All resources →
            </Button>
          }
        />

        {groups.length === 0 ? (
          <EmptyState
            title="No modules completed"
            blurb="Each module is around twenty minutes. Four of them and you can hold your own in the conversation."
            action={
              <Button href="/resources" tone="violet">
                Open the resources
              </Button>
            }
          />
        ) : (
          <ul className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {groups.map((group) => (
              <li key={group.slug} className="border border-line bg-surface shadow-panel">
                <CardBar tone="violet">
                  <span className="truncate">
                    <span aria-hidden>{group.emoji}</span> {group.title}
                  </span>
                  <span>{group.level}</span>
                </CardBar>
                <CardBody className="space-y-4">
                  <ProgressMeter
                    done={group.modules.length}
                    total={group.total}
                    label="Modules complete"
                    tone={group.modules.length >= group.total ? 'lime' : 'violet'}
                  />

                  <ul className="space-y-2">
                    {group.modules.map((mod) => (
                      <li
                        key={mod.id}
                        className="flex items-start gap-2.5 border-b border-dashed border-line pb-2 last:border-b-0 last:pb-0"
                      >
                        <span
                          aria-hidden
                          className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center border border-line bg-cyan/12 text-[10px] font-bold"
                        ></span>
                        <span className="min-w-0">
                          <Link
                            href={`/resources/${group.slug}#module-${mod.id}`}
                            className="block text-sm font-bold leading-snug transition-colors hover:text-violet-bright"
                          >
                            {mod.title}
                          </Link>
                          <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                            {mod.minutes} min · completed {formatDate(mod.completedAt)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>

                  {group.modules.length < group.total && (
                    <Button href={`/resources/${group.slug}`} tone="paper" size="sm" className="w-full">
                      Continue this resource →
                    </Button>
                  )}
                </CardBody>
              </li>
            ))}
          </ul>
        )}
      </Band>

      {/* Applications + chapters */}
      <Band tone="paper">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div>
            <div className="mb-6">
              <span className="mb-3 inline-block border border-line bg-amber/12 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] shadow-panel">
                Applications
              </span>
              <h2 className="text-display-md">What you put yourself forward for</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                Roles, partnerships, RFPs, speaking slots and board positions. Status is set by the organisation that
                posted the listing.
              </p>
            </div>

            {applications.length === 0 ? (
              <EmptyState
                title="No applications yet"
                blurb="The opportunities board carries work as well as roles: partnerships, tenders and speaking invitations."
                action={
                  <Button href="/opportunities" tone="tangerine">
                    See the board
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-3">
                {applications.map((app) => (
                  <li key={app.id} className="border border-line bg-base p-4 shadow-panel">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Link href={`/opportunities/${app.slug}`} className="group min-w-0">
                        <p className="font-display text-base uppercase leading-tight transition-colors group-hover:text-violet-bright">
                          {app.title}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                          {app.org} · {OPPORTUNITY_LABEL[app.type] ?? app.type} · {app.location} · {app.locationType}
                        </p>
                      </Link>
                      <Chip size="sm" tone={APP_STATUS_TONE[app.status] ?? 'paper'}>
                        {app.status}
                      </Chip>
                    </div>
                    <p className="mt-2.5 border-t border-dashed border-line pt-2 text-xs leading-relaxed text-ink-muted">
                      {APP_STATUS_COPY[app.status] ?? 'Status unknown.'} Submitted {relativeTime(app.createdAt)}
                      {app.deadline ? ` · closes ${formatDate(app.deadline)}` : ''}.
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="mb-6">
              <span className="mb-3 inline-block border border-line bg-cyan/12 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] shadow-panel">
                Chapters
              </span>
              <h2 className="text-display-md">Where you turn up</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                Regional chapters run their own meetings between the national events. Your role and join date are
                visible to the chapter organisers.
              </p>
            </div>

            {memberships.length === 0 ? (
              <EmptyState
                title="Not in a chapter"
                blurb="Chapters are the difference between a directory listing and a network you can actually call on."
                action={
                  <Button href="/chapters" tone="lime">
                    Find your region
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-4">
                {memberships.map((membership) => (
                  <li key={membership.slug}>
                    <Link
                      href={`/chapters/${membership.slug}`}
                      className="group flex items-center gap-4 rounded-2xl border border-line bg-surface/90 backdrop-blur-md p-5 shadow-panel-lg transition-all duration-300 hover:border-cyan/50 hover:shadow-cyan/10 hover:-translate-y-1"
                    >
                      <span
                        aria-hidden
                        className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-cyan/40 bg-cyan/20 text-2xl shadow-panel"
                      >
                        {membership.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2.5">
                          <span className="font-black text-lg text-white transition-colors group-hover:text-cyan">
                            {membership.name}
                          </span>
                          <Chip size="sm" tone={CHAPTER_ROLE_TONE[membership.role] ?? 'violet'}>
                            {membership.role}
                          </Chip>
                        </span>
                        <span className="mt-1 block font-mono text-xs font-bold text-cyan">
                          {membership.region} · {membership.city}, {membership.country} · {membership.meetingCadence}
                        </span>
                        <span className="mt-1 block text-xs font-medium text-white/80">
                          Joined {formatDate(membership.joinedAt, { month: 'long', year: 'numeric' })}
                        </span>
                      </span>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan/40 bg-cyan/20 text-cyan transition-transform group-hover:translate-x-1">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Band>
    </>
  );
}

/* ========================================================================== */
/* Root  */
/* ========================================================================== */

export function DashboardClient({
  initialTab,
  email,
  role,
  emailVerified,
  memberSince,
  profile,
  privacy,
  visibility,
  stats,
  registrations,
  modulesDone,
  memberships,
  applications,
  suggestedResource,
  suggestedChapter,
  suggestedEvent,
}: DashboardClientProps) {
  const router = useRouter();
  const toast = useToast();

  const [active, setActive] = useState<TabKey>(initialTab);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const [form, setForm] = useState<DashProfileForm>(profile);
  const [baseline, setBaseline] = useState<DashProfileForm>(profile);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSavedAt, setProfileSavedAt] = useState<string | null>(null);

  // The editor's meter tracks what you are typing; the Overview meter reports
  // what is actually saved, so neither of them lies about the current state.
  const liveItems = useMemo(() => completenessItems(form), [form]);
  const savedItems = useMemo(() => completenessItems(baseline), [baseline]);
  const savedDone = savedItems.filter((item) => item.done).length;

  const selectTab = useCallback((key: TabKey) => {
    setActive(key);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (key === 'overview') url.searchParams.delete('tab');
      else url.searchParams.set('tab', key);
      // Once the notice has been read there is no reason to keep it in the URL.
      url.searchParams.delete('denied');
      window.history.replaceState(null, '', `${url.pathname}${url.search}`);

      const anchor = document.getElementById('dashboard-tabs');
      if (anchor && anchor.getBoundingClientRect().top < 0) {
        anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, []);

  function onTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const { key } = event;
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(key)) return;
    event.preventDefault();

    let next = index;
    if (key === 'ArrowRight') next = (index + 1) % TABS.length;
    if (key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    if (key === 'Home') next = 0;
    if (key === 'End') next = TABS.length - 1;

    selectTab(TABS[next].key);
    tabRefs.current[next]?.focus();
  }

  const setField = useCallback(<K extends keyof DashProfileForm>(key: K, value: DashProfileForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }) as DashProfileForm);
    setFieldErrors((current) => {
      if (!current[key as string]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  }, []);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          handle: form.handle.trim().toLowerCase(),
          headline: form.headline.trim(),
          org: form.org.trim(),
          jobTitle: form.jobTitle.trim(),
          field: form.field.trim(),
          memberType: form.memberType,
          location: form.location.trim(),
          bio: form.bio.trim(),
          yearsExperience: form.yearsExperience.trim() === '' ? null : Number(form.yearsExperience),
          phone: form.phone.trim() === '' ? null : form.phone.trim(),
          contactEmail: form.contactEmail.trim() === '' ? null : form.contactEmail.trim(),
          avatarUrl: form.avatarUrl.trim(),
          linkedinUrl: form.linkedinUrl.trim(),
          websiteUrl: form.websiteUrl.trim(),
          specialties: form.specialties,
          skills: form.skills,
          openToOpportunities: form.openToOpportunities,
          openToMentoring: form.openToMentoring,
          openToSpeaking: form.openToSpeaking,
        }),
      });
      const data = (await res.json()) as ApiReply;

      if (!data.ok) {
        setFormError(data.error ?? 'That did not save. Check the highlighted fields.');
        setFieldErrors(data.fields ?? {});
        return;
      }

      toast.success('Profile saved', 'Your directory card and public profile are already showing it.');
      setBaseline(form);
      setProfileSavedAt(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
      router.refresh();
    } catch {
      setFormError('Could not reach the server. Your changes are still here - try saving again.');
    } finally {
      setSavingProfile(false);
    }
  }

  const visibilityShort: Record<DirectoryVisibility, string> = {
    LISTED: 'Listed',
    UNLISTED: 'Unlisted',
    HIDDEN: 'Hidden',
  };

  const privacyOn = PRIVACY_KEYS.filter((key) => privacy[key]).length;

  const tabMeta: Record<TabKey, string> = {
    overview: visibilityShort[visibility],
    profile: `${savedDone}/${savedItems.length}`,
    media: 'Directory',
    privacy: `${privacyOn}/7`,
    security: role === 'ADMIN' ? 'Admin' : 'Member',
    activity: String(registrations.length + modulesDone.length + applications.length + memberships.length),
  };

  return (
    <div id="dashboard-tabs">
      <div className="border-y border-line/80 bg-[#0B0F19]/95 backdrop-blur-xl lg:sticky lg:top-[68px] lg:z-30 py-3.5 shadow-2xl">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <div role="tablist" aria-label="Dashboard sections" className="flex items-center gap-3 overflow-x-auto py-1 px-1 no-scrollbar justify-start w-full">
            {TABS.map((tab, index) => {
              const isActive = active === tab.key;
              return (
                <button
                  key={tab.key}
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`dashtab-${tab.key}`}
                  aria-selected={isActive}
                  aria-controls={`dashpanel-${tab.key}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => selectTab(tab.key)}
                  onKeyDown={(event) => onTabKeyDown(event, index)}
                  className={cn(
                    'flex flex-shrink-0 items-center gap-2.5 rounded-full border px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm origin-left',
                    isActive
                      ? 'border-cyan/70 bg-cyan/15 text-cyan shadow-[0_0_16px_rgba(6,182,212,0.25)]'
                      : 'border-white/20 bg-[#111726] text-white/95 hover:border-white/40 hover:bg-[#161e30] hover:text-white',
                  )}
                >
                  <span aria-hidden className="text-sm">{tab.emoji}</span>
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      'rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-extrabold leading-none uppercase tracking-wider',
                      isActive ? 'border-cyan/60 bg-cyan/30 text-cyan shadow-sm' : 'border-white/20 bg-white/10 text-white/80',
                    )}
                  >
                    {tabMeta[tab.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Panel tabKey="overview" active={active === 'overview'}>
        <OverviewPanel
          profile={baseline}
          stats={stats}
          registrations={registrations}
          memberships={memberships}
          visibility={visibility}
          items={savedItems}
          suggestedResource={suggestedResource}
          suggestedChapter={suggestedChapter}
          suggestedEvent={suggestedEvent}
          onEditProfile={() => selectTab('profile')}
        />
      </Panel>

      <Panel tabKey="profile" active={active === 'profile'}>
        <ProfilePanel
          form={form}
          setField={setField}
          baseline={baseline}
          onReset={() => {
            setForm(baseline);
            setFieldErrors({});
            setFormError(null);
          }}
          fieldErrors={fieldErrors}
          formError={formError}
          pending={savingProfile}
          savedAt={profileSavedAt}
          onSubmit={saveProfile}
          items={liveItems}
        />
      </Panel>

      <Panel tabKey="media" active={active === 'media'}>
        <div className="mx-auto max-w-container-max px-4 py-8 lg:px-10">
          <SectionHead
            title="Media Directory & Asset Manager"
            kicker="Media Assets"
            blurb="Upload, manage, and copy images to use in event thumbnails, profile photos, logos, or banners."
          />
          <div className="mt-6">
            <MediaDirectory
              onSelectUrl={(url) => {
                setField('avatarUrl', url);
                toast.success('Image set as your profile photo');
                selectTab('profile');
              }}
              selectLabel="Set as Profile Avatar"
            />
          </div>
        </div>
      </Panel>

      <Panel tabKey="privacy" active={active === 'privacy'}>
        <PrivacyPanel initial={privacy} handle={baseline.handle} />
      </Panel>

      <Panel tabKey="security" active={active === 'security'}>
        <SecurityPanel email={email} role={role} emailVerified={emailVerified} memberSince={memberSince} />
      </Panel>

      <Panel tabKey="activity" active={active === 'activity'}>
        <ActivityPanel
          registrations={registrations}
          modulesDone={modulesDone}
          applications={applications}
          memberships={memberships}
          stats={stats}
        />
      </Panel>
    </div>
  );
}
