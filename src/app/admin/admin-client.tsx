'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardBar, CardBody } from '@/components/ui/card';
import { Chip, LiveDot, categoryEmoji, type ChipTone } from '@/components/ui/badge';
import { FieldError, Input, Label, Select, Textarea, Toggle } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { Marquee } from '@/components/ui/marquee';
import { Counter } from '@/components/ui/counter';
import { Avatar, EmptyState, ProgressMeter, Stat } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { MediaDirectory } from '@/components/media/media-directory';
import { BroadcastsPanel } from '@/components/admin/broadcasts-panel';
import { ScriptsPanel } from '@/components/admin/scripts-panel';
import { cn, formatDate } from '@/lib/utils';
import { formatMoney } from '@/lib/payment';

/* ========================================================================== */
/* Shapes handed down from the server page  */
/* ========================================================================== */

export interface AdminCounts {
  members: number;
  events: number;
  registrations: number;
  leads: number;
  opportunities: number;
  applications: number;
  chapters: number;
  posts: number;
  resources: number;
  newMembers7: number;
  newMembers30: number;
}

export interface AdminSignupWeek {
  label: string;
  count: number;
}

export interface AdminMember {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  fullName: string;
  handle: string | null;
  headline: string;
  org: string;
  jobTitle: string;
  field: string;
  memberType: string;
  location: string;
  yearsExperience: number | null;
  avatarUrl: string | null;
  hasProfile: boolean;
  status: string;
}

export interface AdminEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  fullDetails: string;
  category: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  locationType: string;
  venueName: string | null;
  maxCapacity: number;
  isPaid: boolean;
  status: string;
  heroImageUrl: string | null;
  cpdHours: number;
  registrations: number;
  ticketName: string;
  ticketPrice: number;
  ticketCurrency: string;
}

export interface AdminOpportunity {
  id: string;
  slug: string;
  title: string;
  org: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  type: string;
  locationType: string;
  location: string;
  compensation: string | null;
  description: string;
  requirements: string[];
  applyUrl: string | null;
  deadline: string | null;
  daysLeft: number | null;
  isPublished: boolean;
  postedAt: string;
  applications: number;
}

export interface AdminApplication {
  id: string;
  name: string;
  email: string;
  org: string | null;
  profileUrl: string | null;
  note: string | null;
  status: string;
  createdAt: string;
  opportunityTitle: string;
  opportunitySlug: string;
  opportunityOrg: string;
}

export interface AdminSponsor {
  id: string;
  name: string;
  logoUrl: string;
  tier: string;
  description: string;
  websiteUrl: string;
  ctaText: string | null;
  ctaUrl: string | null;
  isHiring: boolean;
  perkText: string | null;
  isPublished: boolean;
}

export interface AdminPost {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
  imageUrl: string | null;
  authorName: string;
  authorTitle: string;
  authorAvatar: string | null;
  publishedAt: string;
  isFeatured: boolean;
  isPublished: boolean;
  readTimeMinutes: number;
}

export interface AdminResource {
  id: string;
  slug: string;
  title: string;
  summary: string;
  level: string;
  emoji: string;
  estHours: number;
  isPublished: boolean;
  modules: number;
}

export interface AdminLead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  formType: string;
  source: string | null;
  campaign: string | null;
  message: string;
  hubspotStatus: string;
  isHandled: boolean;
  createdAt: string;
}

export interface AdminChapter {
  id: string;
  slug: string;
  name: string;
  city: string;
  country: string;
  region: string;
  description: string;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  emoji: string;
  accent: string;
  meetingCadence: string;
  linkedinUrl: string | null;
  contactEmail: string | null;
  isActive: boolean;
  membersCount?: number;
}

/* ========================================================================== */
/* Constants  */
/* ========================================================================== */

type TabKey =
  | 'overview'
  | 'broadcasts'
  | 'scripts'
  | 'requests'
  | 'members'
  | 'chapters'
  | 'events'
  | 'opportunities'
  | 'applications'
  | 'partners'
  | 'insights'
  | 'resources'
  | 'leads'
  | 'media';

const TABS: Array<{ key: TabKey; label: string; emoji: string }> = [
  { key: 'overview', label: 'Overview', emoji: '📊' },
  { key: 'broadcasts', label: 'Broadcast Alerts', emoji: '🔔' },
  { key: 'scripts', label: 'Header & Footer Code', emoji: '🏷️' },
  { key: 'requests', label: 'Access Requests', emoji: '🔐' },
  { key: 'members', label: 'Members', emoji: '👤' },
  { key: 'chapters', label: 'Chapters Radar', emoji: '🌐' },
  { key: 'events', label: 'Events', emoji: '🎟️' },
  { key: 'opportunities', label: 'Opportunities', emoji: '💼' },
  { key: 'applications', label: 'Applications', emoji: '📝' },
  { key: 'partners', label: 'Partners', emoji: '🤝' },
  { key: 'insights', label: 'Insights', emoji: '📰' },
  { key: 'resources', label: 'Resources', emoji: '📚' },
  { key: 'leads', label: 'Leads', emoji: '📬' },
  { key: 'media', label: 'Media Directory', emoji: '🖼️' },
];

const EVENT_CATEGORIES = ['CONFERENCE', 'WORKSHOP', 'ROUNDTABLE', 'WEBINAR', 'NETWORKING', 'SUMMIT'];
const EVENT_STATUSES = ['UPCOMING', 'LIVE', 'COMPLETED', 'DRAFT'];
const EVENT_LOCATION_TYPES = ['IN_PERSON', 'VIRTUAL', 'HYBRID'];
const OPPORTUNITY_TYPES = ['ROLE', 'PARTNERSHIP', 'RFP', 'SPEAKING', 'BOARD_POSITION'];
const LOCATION_TYPES = ['REMOTE', 'HYBRID', 'ONSITE'];
const SPONSOR_TIERS = ['DIAMOND', 'GOLD', 'SILVER', 'COMMUNITY'];
const FORM_TYPES = [
  'CONTACT',
  'MEMBERSHIP_INQUIRY',
  'SPONSOR_INQUIRY',
  'PARTNERSHIP_INQUIRY',
  'EVENT_LEAD',
  'CHAPTER_REQUEST',
];

const STATUS_TONE: Record<string, ChipTone> = {
  UPCOMING: 'cobalt',
  LIVE: 'magenta',
  COMPLETED: 'paper',
  DRAFT: 'ink',
};

/** CardBar accepts a narrower set of tones than Chip - no `paper`. */
type BarTone = 'lime' | 'magenta' | 'violet' | 'tangerine' | 'cobalt' | 'ink';

const TIER_TONE: Record<string, BarTone> = {
  DIAMOND: 'cobalt',
  GOLD: 'tangerine',
  SILVER: 'ink',
  COMMUNITY: 'lime',
};

const MEMBER_TYPE_TONE: Record<string, ChipTone> = {
  PROFESSIONAL: 'paper',
  LEADER: 'violet',
  CONSULTANT: 'cobalt',
  VENDOR: 'tangerine',
  ORGANISATION: 'lime',
};

const LEVEL_TONE: Record<string, ChipTone> = {
  FOUNDATION: 'lime',
  PRACTITIONER: 'cobalt',
  EXECUTIVE: 'violet',
};

const LEAD_TONE: Record<string, ChipTone> = {
  CONTACT: 'paper',
  MEMBERSHIP_INQUIRY: 'lime',
  SPONSOR_INQUIRY: 'tangerine',
  PARTNERSHIP_INQUIRY: 'magenta',
  EVENT_LEAD: 'cobalt',
  CHAPTER_REQUEST: 'violet',
};

const HUBSPOT_TONE: Record<string, ChipTone> = {
  SYNCED: 'lime',
  PENDING: 'paper',
  FAILED: 'magenta',
  SKIPPED: 'ink',
};

const APPLICATION_TONE: Record<string, ChipTone> = {
  RECEIVED: 'paper',
  REVIEWING: 'tangerine',
  SHORTLISTED: 'lime',
  CLOSED: 'ink',
};

/* ========================================================================== */
/* Small helpers  */
/* ========================================================================== */

type FormValue = string | boolean | string[];
type FormShape = Record<string, FormValue>;

/**
 * PATCH sends only what actually moved. That keeps untouched fields - like a
 * seeded logo data-URI longer than the schema's 300-character ceiling - from
 * being bounced back by validation on an unrelated edit.
 */
function changedFields<T extends FormShape>(initial: T, current: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(current) as Array<keyof T>) {
    const before = initial[key];
    const after = current[key];
    const same =
      Array.isArray(before) && Array.isArray(after)
        ? before.length === after.length && before.every((v, i) => v === after[i])
        : before === after;
    if (!same) out[key] = after;
  }
  return out;
}

/** Optional text fields are omitted on create rather than saved as "". */
function dropEmpty(payload: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out = { ...payload };
  for (const key of keys) if (out[key] === '') delete out[key];
  return out;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO → the "YYYY-MM-DDTHH:mm" a datetime-local input expects, in local time. */
function toDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function matches(needle: string, ...haystack: Array<string | null | undefined>): boolean {
  if (!needle) return true;
  const q = needle.trim().toLowerCase();
  return haystack.some((value) => (value ?? '').toLowerCase().includes(q));
}

function pretty(value: string): string {
  return value.replace(/_/g, ' ');
}

/* ========================================================================== */
/* Mutation plumbing  */
/* ========================================================================== */

type RunResult<T = any> = { ok: true; data?: T } | { ok: false; error: string };

interface RunOptions {
  /** Row id (or a form key) so exactly one control shows a pending state. */
  id: string;
  url: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  success: string;
  successBody?: string;
  /** Skip the panel-level banner - used when a modal shows the error itself. */
  silent?: boolean;
}

interface AdminActions {
  busyId: string | null;
  error: string | null;
  clearError: () => void;
  run: <T = any>(opts: RunOptions) => Promise<RunResult<T>>;
}

function useAdminActions(): AdminActions {
  const router = useRouter();
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async <T = any,>(opts: RunOptions): Promise<RunResult<T>> => {
      setBusyId(opts.id);
      if (!opts.silent) setError(null);

      try {
        const res = await fetch(opts.url, {
          method: opts.method,
          headers: { 'Content-Type': 'application/json' },
          ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string; [key: string]: any };

        if (!res.ok || !data.ok) {
          const message = data.error ?? 'That did not go through. Try again.';
          if (!opts.silent) setError(message);
          toast.error('The server refused that', message);
          return { ok: false, error: message };
        }

        toast.success(opts.success, opts.successBody);
        router.refresh();
        return { ok: true, data: data as T };
      } catch {
        const message = 'The request never landed. Check your connection and try again.';
        if (!opts.silent) setError(message);
        toast.error('No response', message);
        return { ok: false, error: message };
      } finally {
        setBusyId(null);
      }
    },
    [router, toast],
  );

  return { busyId, error, clearError: () => setError(null), run };
}

/** Delete always goes through a confirm step inside a modal. Never window.confirm. */
function useDeleteFlow(actions: AdminActions, url: (id: string) => string, success: string) {
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function confirm() {
    if (!target) return;
    setPending(true);
    const res = await actions.run({
      id: target.id,
      url: url(target.id),
      method: 'DELETE',
      success,
      successBody: target.name,
      silent: true,
    });
    setPending(false);
    if (res.ok) {
      setTarget(null);
      setError(null);
    } else {
      setError(res.error);
    }
  }

  return {
    target,
    error,
    pending,
    ask: (id: string, name: string) => {
      setError(null);
      setTarget({ id, name });
    },
    close: () => {
      setTarget(null);
      setError(null);
    },
    confirm,
  };
}

/* ========================================================================== */
/* Shared UI bits  */
/* ========================================================================== */

function ErrorBanner({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mb-5 flex animate-shake items-start justify-between gap-4 border border-line bg-rose/10 p-3.5 shadow-panel"
    >
      <p className="flex flex-wrap items-center gap-2 text-sm leading-snug text-ink-soft">
        <span className="border border-line bg-grad-brand-soft px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink">
          Refused
        </span>
        {message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss this error"
        className="flex-shrink-0 border border-line bg-surface px-1.5 py-0.5 font-mono text-[11px] font-bold shadow-panel panel-hover"
      ></button>
    </div>
  );
}

function PanelHead({
  kicker,
  title,
  blurb,
  action,
  tone = 'lime',
}: {
  /** Optional: eyebrows are rationed to one per three panels. */
  kicker?: string;
  title: string;
  blurb: string;
  action?: React.ReactNode;
  tone?: 'lime' | 'magenta' | 'violet' | 'tangerine';
}) {
  const tones = {
    lime: 'bg-cyan/12 text-ink',
    magenta: 'bg-grad-brand-soft text-ink',
    violet: 'bg-violet/15 text-ink',
    tangerine: 'bg-amber/12 text-ink',
  };

  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-dashed border-line pb-5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {kicker && (
          <span
            className={cn(
              'inline-block border border-line px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em]',
              tones[tone],
            )}
          >
            {kicker}
          </span>
        )}
        <h2 className="text-display-md mt-3">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{blurb}</p>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

function Toolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 border border-line bg-base p-3 shadow-panel lg:flex-row lg:items-center">
      {children}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  activeClass = 'bg-surface-inset text-ink',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  activeClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex flex-shrink-0 items-center gap-1.5 border border-line px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition-[transform,box-shadow,background-color] duration-100',
        active
          ? cn('-translate-x-[1px] -translate-y-[1px] shadow-panel', activeClass)
          : 'bg-surface text-ink hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-panel',
      )}
    >
      {children}
    </button>
  );
}

function Row({ children, className }: { children: React.ReactNode; className?: string }) {
  return <li className={cn('border border-line bg-surface p-4 shadow-panel', className)}>{children}</li>;
}

function RowActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

function Meta({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">{children}</span>;
}

function Field({
  label,
  htmlFor,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} hint={hint} required={required}>
        {label}
      </Label>
      {children}
    </div>
  );
}

function ModalActions({
  pending,
  onCancel,
  submitLabel,
  note,
}: {
  pending: boolean;
  onCancel: () => void;
  submitLabel: string;
  note?: string;
}) {
  return (
    <div className="mt-6 flex flex-col gap-3 border-t border-dashed border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] text-ink-muted">{note ?? ''}</p>
      <div className="flex flex-shrink-0 gap-2">
        <Button type="button" tone="paper" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" tone="lime" size="sm" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </div>
  );
}

function ConfirmDelete({
  target,
  what,
  cascade,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  target: { id: string; name: string } | null;
  what: string;
  cascade: string;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={Boolean(target)}
      onClose={onClose}
      title={`Delete this ${what}?`}
      kicker="This cannot be undone"
      tone="magenta"
      size="sm"
    >
      <div className="space-y-4">
        <p className="border border-line bg-surface-inset p-3 font-mono text-[11px] font-bold uppercase tracking-[0.1em]">
          {target?.name}
        </p>
        <p className="text-sm leading-relaxed text-ink-soft">{cascade}</p>
        <div className="border border-dashed border-line bg-rose/10 p-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em]">
            No undo, no recycle bin, no export. Be sure.
          </p>
        </div>
        {error && <FieldError>{error}</FieldError>}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button tone="paper" size="sm" onClick={onClose}>
            Keep it
          </Button>
          <Button tone="magenta" size="sm" onClick={onConfirm} disabled={pending}>
            {pending ? 'Deleting…' : `Yes, delete the ${what}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Chip input for the JSON string[] columns (tags, requirements). */
function TagInput({
  id,
  values,
  onChange,
  placeholder,
  max,
}: {
  id: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  max: number;
}) {
  const [draft, setDraft] = useState('');

  function add() {
    const value = draft.trim().replace(/,$/, '');
    if (!value || values.includes(value) || values.length >= max) {
      setDraft('');
      return;
    }
    onChange([...values, value]);
    setDraft('');
  }

  return (
    <div className="border border-line bg-surface p-2.5">
      {values.length > 0 && (
        <ul className="mb-2.5 flex flex-wrap gap-1.5">
          {values.map((value) => (
            <li key={value}>
              <button
                type="button"
                onClick={() => onChange(values.filter((v) => v !== value))}
                className="inline-flex items-center gap-1.5 border border-line bg-cyan/12 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] shadow-panel panel-hover"
                aria-label={`Remove ${value}`}
              >
                {value}
                <span aria-hidden></span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={values.length >= max ? `That is the ${max} limit` : placeholder}
          disabled={values.length >= max}
          className="min-w-0 flex-1 border border-line bg-base px-2.5 py-1.5 font-sans text-sm placeholder:text-ink-muted focus:outline-none focus:shadow-panel disabled:opacity-60"
        />
        <button
          type="button"
          onClick={add}
          disabled={values.length >= max}
          className="flex-shrink-0 border border-line bg-surface-inset px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink shadow-panel panel-hover disabled:pointer-events-none disabled:opacity-40"
        >
          Add
        </button>
      </div>
      <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
        Enter or comma adds · click a chip to drop it · {values.length}/{max}
      </p>
    </div>
  );
}

/* ========================================================================== */
/* Event editor  */
/* ========================================================================== */

type EventForm = {
  title: string;
  category: string;
  description: string;
  fullDetails: string;
  location: string;
  locationType: string;
  venueName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  maxCapacity: string;
  heroImageUrl: string;
  cpdHours: string;
  status: string;
  ticketName: string;
  ticketPrice: string;
};

function blankEvent(): EventForm {
  return {
    title: '',
    category: 'ROUNDTABLE',
    description: '',
    fullDetails: '',
    location: '',
    locationType: 'HYBRID',
    venueName: '',
    eventDate: '',
    startTime: '09:00 AM',
    endTime: '05:00 PM',
    maxCapacity: '120',
    heroImageUrl: '',
    cpdHours: '2',
    status: 'UPCOMING',
    ticketName: 'Member Registration',
    ticketPrice: '0',
  };
}

function eventToForm(event: AdminEvent): EventForm {
  return {
    title: event.title,
    category: event.category,
    description: event.description,
    fullDetails: event.fullDetails,
    location: event.location,
    locationType: event.locationType,
    venueName: event.venueName ?? '',
    eventDate: toDateTimeLocal(event.eventDate),
    startTime: event.startTime,
    endTime: event.endTime,
    maxCapacity: String(event.maxCapacity),
    heroImageUrl: event.heroImageUrl ?? '',
    cpdHours: String(event.cpdHours),
    status: event.status,
    ticketName: event.ticketName,
    ticketPrice: String(event.ticketPrice),
  };
}

function EventModal({
  open,
  editing,
  pending,
  onClose,
  onSave,
}: {
  open: boolean;
  editing: AdminEvent | null;
  pending: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>, method: 'POST' | 'PATCH') => Promise<string | null>;
}) {
  const [form, setForm] = useState<EventForm>(blankEvent);
  const [error, setError] = useState<string | null>(null);
  const initial = useRef<EventForm>(blankEvent());

  useEffect(() => {
    if (!open) return;
    const next = editing ? eventToForm(editing) : blankEvent();
    setForm(next);
    initial.current = next;
    setError(null);
  }, [open, editing]);

  const set = <K extends keyof EventForm>(key: K, value: EventForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    let payload: Record<string, unknown>;

    if (editing) {
      const changed = changedFields(initial.current, form);
      if (Object.keys(changed).length === 0) {
        setError('Nothing has changed yet. Edit a field, then save.');
        return;
      }
      payload = { id: editing.id, ...changed };
    } else {
      payload = dropEmpty({ ...form }, ['fullDetails', 'venueName', 'heroImageUrl']);
    }

    const message = await onSave(payload, editing ? 'PATCH' : 'POST');
    if (message) setError(message);
    else onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit event' : 'New event'}
      kicker={editing ? editing.slug : 'Add to the calendar'}
      tone="violet"
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title" htmlFor="ev-title" required>
          <Input
            id="ev-title"
            required
            maxLength={120}
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Physical security roundtable: retail estates"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Category" htmlFor="ev-category">
            <Select id="ev-category" value={form.category} onChange={(e) => set('category', e.target.value)}>
              {EVENT_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="ev-status">
            <Select id="ev-status" value={form.status} onChange={(e) => set('status', e.target.value)}>
              {EVENT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="CPD hours" htmlFor="ev-cpd" hint="0-100">
            <Input
              id="ev-cpd"
              type="number"
              min={0}
              max={100}
              value={form.cpdHours}
              onChange={(e) => set('cpdHours', e.target.value)}
            />
          </Field>
        </div>

        <Field label="Card summary" htmlFor="ev-description" hint="max 300" required>
          <Textarea
            id="ev-description"
            required
            maxLength={300}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="One or two sentences. This is what members read on the events grid."
            className="min-h-[80px]"
          />
        </Field>

        <Field label="Full details" htmlFor="ev-full" hint="Shown on the event page">
          <Textarea
            id="ev-full"
            maxLength={4000}
            value={form.fullDetails}
            onChange={(e) => set('fullDetails', e.target.value)}
            placeholder="Agenda, who it is for, what attendees take away. Leave blank to reuse the summary."
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date and start" htmlFor="ev-date" required>
            <Input
              id="ev-date"
              type="datetime-local"
              required
              value={form.eventDate}
              onChange={(e) => set('eventDate', e.target.value)}
            />
          </Field>
          <Field label="Capacity" htmlFor="ev-capacity" required>
            <Input
              id="ev-capacity"
              name="maxCapacity"
              autoComplete="off"
              type="number"
              min={1}
              max={100000}
              required
              value={form.maxCapacity}
              onChange={(e) => set('maxCapacity', e.target.value)}
            />
          </Field>
          <Field label="Doors open" htmlFor="ev-start" hint="Display text">
            <Input
              id="ev-start"
              value={form.startTime}
              onChange={(e) => set('startTime', e.target.value)}
              placeholder="09:00 AM"
            />
          </Field>
          <Field label="Close" htmlFor="ev-end" hint="Display text">
            <Input
              id="ev-end"
              value={form.endTime}
              onChange={(e) => set('endTime', e.target.value)}
              placeholder="05:00 PM"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Location" htmlFor="ev-location" required>
            <Input
              id="ev-location"
              required
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="Manchester"
            />
          </Field>
          <Field label="Format" htmlFor="ev-loctype">
            <Select id="ev-loctype" value={form.locationType} onChange={(e) => set('locationType', e.target.value)}>
              {EVENT_LOCATION_TYPES.map((value) => (
                <option key={value} value={value}>
                  {pretty(value)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Venue" htmlFor="ev-venue" hint="Optional">
            <Input
              id="ev-venue"
              value={form.venueName}
              onChange={(e) => set('venueName', e.target.value)}
              placeholder="Bridgewater Hall, Suite 2"
            />
          </Field>
        </div>

        <Field label="Hero image URL" htmlFor="ev-hero" hint="Optional, max 300 chars">
          <Input
            id="ev-hero"
            value={form.heroImageUrl}
            onChange={(e) => set('heroImageUrl', e.target.value)}
            placeholder="https://…"
          />
        </Field>

        <div className="border border-dashed border-line bg-surface-inset/60 p-3">
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">Ticket</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Ticket name" htmlFor="ev-ticket">
              <Input id="ev-ticket" value={form.ticketName} onChange={(e) => set('ticketName', e.target.value)} />
            </Field>
            <Field label="Price" htmlFor="ev-price" hint="0 = free">
              <Input
                id="ev-price"
                name="ticketPrice"
                autoComplete="off"
                type="number"
                min={0}
                step="1"
                value={form.ticketPrice}
                onChange={(e) => set('ticketPrice', e.target.value)}
              />
            </Field>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-ink-muted">
            {editing
              ? 'On an existing event these two only switch the paid state. Rewriting a live ticket row would invalidate codes attendees already hold, so it stays put.'
              : 'One ticket row is created with the event, its quantity matched to capacity.'}
          </p>
        </div>

        {error && <FieldError>{error}</FieldError>}

        <ModalActions
          pending={pending}
          onCancel={onClose}
          submitLabel={editing ? 'Save changes' : 'Create event'}
          note={editing ? 'Only edited fields are sent.' : 'Goes live the moment you save.'}
        />
      </form>
    </Modal>
  );
}

/* ========================================================================== */
/* Opportunity editor  */
/* ========================================================================== */

type OpportunityForm = {
  title: string;
  org: string;
  logoUrl: string;
  coverImageUrl: string;
  type: string;
  locationType: string;
  location: string;
  compensation: string;
  description: string;
  requirements: string[];
  applyUrl: string;
  deadline: string;
  isPublished: boolean;
};

function blankOpportunity(): OpportunityForm {
  return {
    title: '',
    org: '',
    logoUrl: '',
    coverImageUrl: '',
    type: 'ROLE',
    locationType: 'HYBRID',
    location: '',
    compensation: '',
    description: '',
    requirements: [],
    applyUrl: '',
    deadline: '',
    isPublished: true,
  };
}

function opportunityToForm(role: AdminOpportunity): OpportunityForm {
  return {
    title: role.title,
    org: role.org,
    logoUrl: role.logoUrl ?? '',
    coverImageUrl: role.coverImageUrl ?? '',
    type: role.type,
    locationType: role.locationType,
    location: role.location,
    compensation: role.compensation ?? '',
    description: role.description,
    requirements: [...role.requirements],
    applyUrl: role.applyUrl ?? '',
    deadline: toDateInput(role.deadline),
    isPublished: role.isPublished,
  };
}

function OpportunityModal({
  open,
  editing,
  pending,
  onClose,
  onSave,
}: {
  open: boolean;
  editing: AdminOpportunity | null;
  pending: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>, method: 'POST' | 'PATCH') => Promise<string | null>;
}) {
  const [form, setForm] = useState<OpportunityForm>(blankOpportunity);
  const [error, setError] = useState<string | null>(null);
  const initial = useRef<OpportunityForm>(blankOpportunity());

  useEffect(() => {
    if (!open) return;
    const next = editing ? opportunityToForm(editing) : blankOpportunity();
    setForm(next);
    initial.current = next;
    setError(null);
  }, [open, editing]);

  const set = <K extends keyof OpportunityForm>(key: K, value: OpportunityForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    let payload: Record<string, unknown>;

    if (editing) {
      const changed = changedFields(initial.current, form);
      if (Object.keys(changed).length === 0) {
        setError('Nothing has changed yet. Edit a field, then save.');
        return;
      }
      payload = { id: editing.id, ...changed };
    } else {
      payload = dropEmpty({ ...form }, ['logoUrl', 'compensation', 'applyUrl']);
    }

    // An empty date input means "no deadline", which the schema wants as null.
    if ('deadline' in payload) payload.deadline = payload.deadline ? payload.deadline : null;

    const message = await onSave(payload, editing ? 'PATCH' : 'POST');
    if (message) setError(message);
    else onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit opportunity' : 'New opportunity'}
      kicker={editing ? editing.slug : 'Roles, partnerships, tenders, speaking'}
      tone="tangerine"
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Title" htmlFor="op-title" required>
            <Input
              id="op-title"
              required
              maxLength={120}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Head of Security Risk, EMEA"
            />
          </Field>
          <Field label="Organisation" htmlFor="op-org" required>
            <Input
              id="op-org"
              required
              maxLength={120}
              value={form.org}
              onChange={(e) => set('org', e.target.value)}
              placeholder="Northwind Group"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Type" htmlFor="op-type">
            <Select id="op-type" value={form.type} onChange={(e) => set('type', e.target.value)}>
              {OPPORTUNITY_TYPES.map((value) => (
                <option key={value} value={value}>
                  {pretty(value)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Working pattern" htmlFor="op-loctype">
            <Select id="op-loctype" value={form.locationType} onChange={(e) => set('locationType', e.target.value)}>
              {LOCATION_TYPES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Location" htmlFor="op-location" required>
            <Input
              id="op-location"
              required
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="London or remote (GMT)"
            />
          </Field>
        </div>

        <Field label="Description" htmlFor="op-description" required>
          <Textarea
            id="op-description"
            required
            maxLength={4000}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="The scope of the work, who it reports to, and what a strong response looks like."
            className="min-h-[140px]"
          />
        </Field>

        <Field label="Requirements" htmlFor="op-requirements" hint="One per chip">
          <TagInput
            id="op-requirements"
            values={form.requirements}
            onChange={(next) => set('requirements', next)}
            placeholder="10+ years in corporate security"
            max={12}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Compensation" htmlFor="op-comp" hint="Optional, max 80">
            <Input
              id="op-comp"
              maxLength={80}
              value={form.compensation}
              onChange={(e) => set('compensation', e.target.value)}
              placeholder="£95k-£110k + car allowance"
            />
          </Field>
          <Field label="Closing date" htmlFor="op-deadline" hint="Optional">
            <Input
              id="op-deadline"
              type="date"
              value={form.deadline}
              onChange={(e) => set('deadline', e.target.value)}
            />
          </Field>
          <Field label="External apply URL" htmlFor="op-apply" hint="Optional">
            <Input
              id="op-apply"
              value={form.applyUrl}
              onChange={(e) => set('applyUrl', e.target.value)}
              placeholder="https://…"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Logo URL" htmlFor="op-logo" hint="Optional">
            <Input
              id="op-logo"
              value={form.logoUrl}
              onChange={(e) => set('logoUrl', e.target.value)}
              placeholder="https://…"
            />
          </Field>
          <Field label="Cover Image URL" htmlFor="op-cover" hint="Optional hero banner">
            <Input
              id="op-cover"
              value={form.coverImageUrl}
              onChange={(e) => set('coverImageUrl', e.target.value)}
              placeholder="https://… or /media/…"
            />
          </Field>
        </div>

        <div className="flex items-end">
          <Toggle
            checked={form.isPublished}
            onChange={(next) => set('isPublished', next)}
            label="Published"
            description={form.isPublished ? 'Listed for members now' : 'Draft, nobody else can see it'}
          />
        </div>

        {error && <FieldError>{error}</FieldError>}

        <ModalActions
          pending={pending}
          onCancel={onClose}
          submitLabel={editing ? 'Save changes' : 'Post the opportunity'}
          note={editing ? 'Only edited fields are sent.' : undefined}
        />
      </form>
    </Modal>
  );
}

/* ========================================================================== */
/* Partner editor  */
/* ========================================================================== */

type SponsorForm = {
  name: string;
  logoUrl: string;
  tier: string;
  description: string;
  websiteUrl: string;
  ctaText: string;
  ctaUrl: string;
  isHiring: boolean;
  perkText: string;
  isPublished: boolean;
};

function blankSponsor(): SponsorForm {
  return {
    name: '',
    logoUrl: '',
    tier: 'GOLD',
    description: '',
    websiteUrl: '',
    ctaText: 'Learn more',
    ctaUrl: '',
    isHiring: false,
    perkText: '',
    isPublished: true,
  };
}

function sponsorToForm(sponsor: AdminSponsor): SponsorForm {
  return {
    name: sponsor.name,
    logoUrl: sponsor.logoUrl,
    tier: sponsor.tier,
    description: sponsor.description,
    websiteUrl: sponsor.websiteUrl,
    ctaText: sponsor.ctaText ?? '',
    ctaUrl: sponsor.ctaUrl ?? '',
    isHiring: sponsor.isHiring,
    perkText: sponsor.perkText ?? '',
    isPublished: sponsor.isPublished,
  };
}

function SponsorModal({
  open,
  editing,
  pending,
  onClose,
  onSave,
}: {
  open: boolean;
  editing: AdminSponsor | null;
  pending: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>, method: 'POST' | 'PATCH') => Promise<string | null>;
}) {
  const [form, setForm] = useState<SponsorForm>(blankSponsor);
  const [error, setError] = useState<string | null>(null);
  const initial = useRef<SponsorForm>(blankSponsor());

  useEffect(() => {
    if (!open) return;
    const next = editing ? sponsorToForm(editing) : blankSponsor();
    setForm(next);
    initial.current = next;
    setError(null);
  }, [open, editing]);

  const set = <K extends keyof SponsorForm>(key: K, value: SponsorForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    let payload: Record<string, unknown>;

    if (editing) {
      const changed = changedFields(initial.current, form);
      if (Object.keys(changed).length === 0) {
        setError('Nothing has changed yet. Edit a field, then save.');
        return;
      }
      payload = { id: editing.id, ...changed };
    } else {
      payload = dropEmpty({ ...form }, ['ctaText', 'ctaUrl', 'perkText']);
    }

    const message = await onSave(payload, editing ? 'PATCH' : 'POST');
    if (message) setError(message);
    else onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit partner' : 'New partner'}
      kicker={editing ? editing.name : 'Sponsors and industry partners'}
      tone="lime"
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="sp-name" required>
            <Input
              id="sp-name"
              required
              maxLength={120}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </Field>
          <Field label="Tier" htmlFor="sp-tier">
            <Select id="sp-tier" value={form.tier} onChange={(e) => set('tier', e.target.value)}>
              {SPONSOR_TIERS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Description" htmlFor="sp-description" hint="max 300" required>
          <Textarea
            id="sp-description"
            required
            maxLength={300}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="What they do, in the plainest words you can manage."
            className="min-h-[80px]"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Logo URL" htmlFor="sp-logo" hint="max 300 chars" required>
            <Input
              id="sp-logo"
              required
              value={form.logoUrl}
              onChange={(e) => set('logoUrl', e.target.value)}
              placeholder="https://…"
            />
          </Field>
          <Field label="Website" htmlFor="sp-site" required>
            <Input
              id="sp-site"
              required
              value={form.websiteUrl}
              onChange={(e) => set('websiteUrl', e.target.value)}
              placeholder="https://…"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Button text" htmlFor="sp-cta" hint="Optional">
            <Input id="sp-cta" maxLength={40} value={form.ctaText} onChange={(e) => set('ctaText', e.target.value)} />
          </Field>
          <Field label="Button URL" htmlFor="sp-ctaurl" hint="Optional">
            <Input
              id="sp-ctaurl"
              value={form.ctaUrl}
              onChange={(e) => set('ctaUrl', e.target.value)}
              placeholder="https://…"
            />
          </Field>
        </div>

        <Field label="Member benefit" htmlFor="sp-perk" hint="Optional, max 160">
          <Input
            id="sp-perk"
            maxLength={160}
            value={form.perkText}
            onChange={(e) => set('perkText', e.target.value)}
            placeholder="Discounted assessment rates for BSA members"
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Toggle
            checked={form.isHiring}
            onChange={(next) => set('isHiring', next)}
            label="Hiring now"
            description="Adds a HIRING marker to their card"
          />
          <Toggle
            checked={form.isPublished}
            onChange={(next) => set('isPublished', next)}
            label="Published"
            description={form.isPublished ? 'Shown on the partners page' : 'Hidden for now'}
          />
        </div>

        {error && <FieldError>{error}</FieldError>}

        <ModalActions
          pending={pending}
          onCancel={onClose}
          submitLabel={editing ? 'Save changes' : 'Add partner'}
          note={editing ? 'Only edited fields are sent.' : undefined}
        />
      </form>
    </Modal>
  );
}

/* ========================================================================== */
/* Insight editor  */
/* ========================================================================== */

type PostForm = {
  title: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
  imageUrl: string;
  authorName: string;
  authorTitle: string;
  authorAvatar: string;
  readTimeMinutes: string;
  isFeatured: boolean;
  isPublished: boolean;
};

function blankPost(): PostForm {
  return {
    title: '',
    summary: '',
    content: '',
    category: 'Industry Insight',
    tags: [],
    imageUrl: '',
    authorName: '',
    authorTitle: 'BSA',
    authorAvatar: '',
    readTimeMinutes: '5',
    isFeatured: false,
    isPublished: true,
  };
}

function postToForm(post: AdminPost): PostForm {
  return {
    title: post.title,
    summary: post.summary,
    content: post.content,
    category: post.category,
    tags: [...post.tags],
    imageUrl: post.imageUrl ?? '',
    authorName: post.authorName,
    authorTitle: post.authorTitle,
    authorAvatar: post.authorAvatar ?? '',
    readTimeMinutes: String(post.readTimeMinutes),
    isFeatured: post.isFeatured,
    isPublished: post.isPublished,
  };
}

function PostModal({
  open,
  editing,
  pending,
  onClose,
  onSave,
}: {
  open: boolean;
  editing: AdminPost | null;
  pending: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>, method: 'POST' | 'PATCH') => Promise<string | null>;
}) {
  const [form, setForm] = useState<PostForm>(blankPost);
  const [error, setError] = useState<string | null>(null);
  const initial = useRef<PostForm>(blankPost());

  useEffect(() => {
    if (!open) return;
    const next = editing ? postToForm(editing) : blankPost();
    setForm(next);
    initial.current = next;
    setError(null);
  }, [open, editing]);

  const set = <K extends keyof PostForm>(key: K, value: PostForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const words = form.content.trim() ? form.content.trim().split(/\s+/).length : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    let payload: Record<string, unknown>;

    if (editing) {
      const changed = changedFields(initial.current, form);
      if (Object.keys(changed).length === 0) {
        setError('Nothing has changed yet. Edit a field, then save.');
        return;
      }
      payload = { id: editing.id, ...changed };
    } else {
      payload = dropEmpty({ ...form }, ['imageUrl', 'authorAvatar']);
    }

    const message = await onSave(payload, editing ? 'PATCH' : 'POST');
    if (message) setError(message);
    else onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit insight' : 'New insight'}
      kicker={editing ? editing.slug : 'Analysis, guidance, practice notes'}
      tone="violet"
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title" htmlFor="po-title" required>
          <Input
            id="po-title"
            required
            maxLength={120}
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="What boards are asking security teams for in 2026"
          />
        </Field>

        <Field label="Summary" htmlFor="po-summary" hint="max 300" required>
          <Textarea
            id="po-summary"
            required
            maxLength={300}
            value={form.summary}
            onChange={(e) => set('summary', e.target.value)}
            className="min-h-[80px]"
            placeholder="The line that makes a busy professional read on. Say the useful part first."
          />
        </Field>

        <Field label="Body" htmlFor="po-content" hint={`${words} words · markdown-ish`} required>
          <Textarea
            id="po-content"
            required
            maxLength={40000}
            value={form.content}
            onChange={(e) => set('content', e.target.value)}
            className="min-h-[260px] font-mono text-[13px]"
            placeholder="Write it the way you would brief a peer who has fifteen minutes."
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Category" htmlFor="po-category">
            <Input
              id="po-category"
              maxLength={60}
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
            />
          </Field>
          <Field label="Read time" htmlFor="po-read" hint="Minutes">
            <Input
              id="po-read"
              type="number"
              min={1}
              max={120}
              value={form.readTimeMinutes}
              onChange={(e) => set('readTimeMinutes', e.target.value)}
            />
          </Field>
        </div>

        <Field label="Tags" htmlFor="po-tags" hint="Up to 8">
          <TagInput
            id="po-tags"
            values={form.tags}
            onChange={(next) => set('tags', next)}
            placeholder="risk management"
            max={8}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Author name" htmlFor="po-author" required>
            <Input
              id="po-author"
              required
              maxLength={120}
              value={form.authorName}
              onChange={(e) => set('authorName', e.target.value)}
            />
          </Field>
          <Field label="Author title" htmlFor="po-authortitle">
            <Input
              id="po-authortitle"
              maxLength={120}
              value={form.authorTitle}
              onChange={(e) => set('authorTitle', e.target.value)}
              placeholder="Director of Security, Northwind"
            />
          </Field>
          <Field label="Cover image URL" htmlFor="po-image" hint="Optional">
            <Input
              id="po-image"
              value={form.imageUrl}
              onChange={(e) => set('imageUrl', e.target.value)}
              placeholder="https://…"
            />
          </Field>
          <Field label="Author avatar URL" htmlFor="po-avatar" hint="Optional">
            <Input
              id="po-avatar"
              value={form.authorAvatar}
              onChange={(e) => set('authorAvatar', e.target.value)}
              placeholder="https://…"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Toggle
            checked={form.isFeatured}
            onChange={(next) => set('isFeatured', next)}
            label="Featured"
            description="Takes the lead slot on the home page"
          />
          <Toggle
            checked={form.isPublished}
            onChange={(next) => set('isPublished', next)}
            label="Published"
            description={form.isPublished ? 'Live on the insights page' : 'Draft only'}
          />
        </div>

        {error && <FieldError>{error}</FieldError>}

        <ModalActions
          pending={pending}
          onCancel={onClose}
          submitLabel={editing ? 'Save changes' : 'Publish insight'}
          note={editing ? 'Only edited fields are sent.' : undefined}
        />
      </form>
    </Modal>
  );
}

/* ========================================================================== */
/* Overview  */
/* ========================================================================== */

function GrowthChart({ signups }: { signups: AdminSignupWeek[] }) {
  const reduced = useReducedMotion();
  const peak = Math.max(1, ...signups.map((week) => week.count));

  return (
    <div>
      <div className="flex h-32 items-end gap-1.5">
        {signups.map((week, index) => {
          const height = Math.max(4, Math.round((week.count / peak) * 100));
          const isLatest = index === signups.length - 1;
          return (
            <div key={week.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span className="font-mono text-[10px] font-bold leading-none">{week.count}</span>
              <motion.div
                title={`Week beginning ${week.label}: ${week.count} joined`}
                style={{ height: `${height}%` }}
                initial={reduced ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  'w-full origin-bottom border border-line',
                  isLatest ? 'bg-grad-brand-soft' : 'bg-cyan/12',
                )}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5 border-t border-line pt-1.5">
        {signups.map((week) => (
          <span
            key={week.label}
            className="min-w-0 flex-1 text-center font-mono text-[9px] uppercase tracking-[0.06em] text-ink-soft"
          >
            {week.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function OverviewPanel({
  counts,
  signups,
  members,
  events,
  opportunities,
  leads,
  posts,
  resources,
  goTo,
}: {
  counts: AdminCounts;
  signups: AdminSignupWeek[];
  members: AdminMember[];
  events: AdminEvent[];
  opportunities: AdminOpportunity[];
  leads: AdminLead[];
  posts: AdminPost[];
  resources: AdminResource[];
  goTo: (tab: TabKey) => void;
}) {
  const openLeads = useMemo(() => leads.filter((lead) => !lead.isHandled), [leads]);

  const leadsByType = useMemo(() => {
    const tally = new Map<string, number>();
    for (const lead of openLeads) tally.set(lead.formType, (tally.get(lead.formType) ?? 0) + 1);
    return Array.from(tally.entries()).sort((a, b) => b[1] - a[1]);
  }, [openLeads]);

  const oldestOpen = openLeads.length > 0 ? openLeads[openLeads.length - 1] : null;

  const packed = useMemo(
    () =>
      events
        .filter((event) => event.status !== 'COMPLETED' && event.maxCapacity > 0)
        .map((event) => ({ event, pct: Math.round((event.registrations / event.maxCapacity) * 100) }))
        .filter((row) => row.pct >= 90)
        .sort((a, b) => b.pct - a.pct),
    [events],
  );

  const closing = useMemo(
    () =>
      opportunities
        .filter((role) => role.isPublished && role.daysLeft !== null && role.daysLeft <= 7)
        .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0)),
    [opportunities],
  );

  const drafts = useMemo(
    () =>
      posts.filter((post) => !post.isPublished).length +
      opportunities.filter((role) => !role.isPublished).length +
      resources.filter((resource) => !resource.isPublished).length,
    [posts, opportunities, resources],
  );

  const withProfile = members.filter((member) => member.hasProfile).length;
  const allClear = openLeads.length === 0 && packed.length === 0 && closing.length === 0;
  const recent = members.slice(0, 6);

  const tiles: Array<{
    label: string;
    value: number;
    tone: 'paper' | 'lime' | 'magenta' | 'violet' | 'tangerine' | 'ink';
    tab: TabKey | null;
  }> = [
    { label: 'Members', value: counts.members, tone: 'lime', tab: 'members' },
    { label: 'Open leads', value: openLeads.length, tone: 'magenta', tab: 'leads' },
    { label: 'Events', value: counts.events, tone: 'paper', tab: 'events' },
    { label: 'Registrations', value: counts.registrations, tone: 'paper', tab: 'events' },
    { label: 'Opportunities', value: counts.opportunities, tone: 'tangerine', tab: 'opportunities' },
    { label: 'Applications', value: counts.applications, tone: 'paper', tab: 'applications' },
    { label: 'Resources', value: counts.resources, tone: 'violet', tab: 'resources' },
    { label: 'Insights', value: counts.posts, tone: 'paper', tab: 'insights' },
    { label: 'Chapters', value: counts.chapters, tone: 'paper', tab: null },
    { label: 'All leads', value: counts.leads, tone: 'paper', tab: 'leads' },
  ];

  return (
    <div>
      <PanelHead
        title="The two numbers that matter"
        blurb="Inbound leads waiting on a reply, and how fast the membership is growing. Everything else on this page supports those two."
      />

      {/* ------------------------------------------------------------------
 The business pair: lead inbox and member growth
 ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="flex h-full flex-col">
          <CardBar tone={openLeads.length > 0 ? 'magenta' : 'lime'}>
            <span>Lead inbox</span>
            <span>{openLeads.length > 0 ? 'Waiting on you' : 'Clear'}</span>
          </CardBar>
          <CardBody className="flex flex-1 flex-col">
            <div className="flex items-end gap-4">
              <p className="font-display text-6xl leading-[0.85]">
                <Counter to={openLeads.length} />
              </p>
              <div className="pb-1.5">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em]">unanswered</p>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                  of {counts.leads} received
                </p>
              </div>
            </div>

            {leadsByType.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {leadsByType.map(([type, count]) => (
                  <li key={type}>
                    <Chip size="sm" tone={LEAD_TONE[type] ?? 'paper'}>
                      {pretty(type)} {count}
                    </Chip>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-ink-muted">
                Every enquiry from the contact, membership, partnership and chapter forms has had a reply.
              </p>
            )}

            {oldestOpen && (
              <div className="mt-4 border border-dashed border-line bg-rose/10 p-3">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                  Longest waiting
                </p>
                <p className="mt-1 truncate text-sm font-bold">{oldestOpen.name}</p>
                <p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                  {pretty(oldestOpen.formType)} · {formatDate(oldestOpen.createdAt)}
                </p>
              </div>
            )}

            <div className="mt-auto pt-4">
              <Button tone="magenta" size="sm" className="w-full" onClick={() => goTo('leads')}>
                Open the inbox →
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card className="flex h-full flex-col">
          <CardBar tone="lime">
            <span>Member growth</span>
            <span>Last 8 weeks</span>
          </CardBar>
          <CardBody className="flex flex-1 flex-col">
            <div className="mb-4 grid grid-cols-3 gap-2.5">
              <div className="border border-line bg-cyan/12 p-2.5">
                <p className="font-display text-2xl leading-none">{counts.newMembers7}</p>
                <p className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em]">Last 7 days</p>
              </div>
              <div className="border border-line bg-surface p-2.5">
                <p className="font-display text-2xl leading-none">{counts.newMembers30}</p>
                <p className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em]">Last 30 days</p>
              </div>
              <div className="border border-line bg-surface p-2.5">
                <p className="font-display text-2xl leading-none">{counts.members}</p>
                <p className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em]">All time</p>
              </div>
            </div>

            <GrowthChart signups={signups} />

            <div className="mt-4 border-t border-dashed border-line pt-3">
              <ProgressMeter
                done={withProfile}
                total={Math.max(members.length, 1)}
                label="Newest 100 with a completed profile"
                tone="violet"
              />
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                A profile is what makes someone findable in the directory. Accounts without one are invisible to the
                rest of the membership.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* ------------------------------------------------------------------
 Stat tiles
 ------------------------------------------------------------------ */}
      <div className="mt-10">
        <h3 className="mb-4 text-2xl">Everything, counted</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {tiles.map((tile) =>
            tile.tab ? (
              <button
                key={tile.label}
                type="button"
                onClick={() => goTo(tile.tab as TabKey)}
                className="text-left panel-hover"
                aria-label={`${tile.label}: ${tile.value}. Open the ${tile.label} section`}
              >
                <Stat value={<Counter to={tile.value} />} label={tile.label} tone={tile.tone} />
              </button>
            ) : (
              <Stat key={tile.label} value={<Counter to={tile.value} />} label={tile.label} tone={tile.tone} />
            ),
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------
 Needs attention
 ------------------------------------------------------------------ */}
      <div className="mt-10">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h3 className="text-2xl">Needs attention</h3>
          {allClear ? (
            <Chip tone="lime">All clear</Chip>
          ) : (
            <Chip tone="magenta">
              <LiveDot tone="lime" /> {openLeads.length + packed.length + closing.length} items
            </Chip>
          )}
        </div>

        {allClear ? (
          <EmptyState
            title="Nothing is waiting"
            blurb="No unanswered leads, no event near capacity, no opportunity closing inside a week."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card className="flex h-full flex-col">
              <CardBar tone={openLeads.length ? 'magenta' : 'lime'}>
                <span>Unanswered leads</span>
                <span>{openLeads.length}</span>
              </CardBar>
              <CardBody className="flex flex-1 flex-col">
                {openLeads.length === 0 ? (
                  <p className="text-sm text-ink-muted">Every inbound enquiry has been dealt with.</p>
                ) : (
                  <ul className="flex-1 space-y-2.5">
                    {openLeads.slice(0, 4).map((lead) => (
                      <li key={lead.id} className="border border-dashed border-line p-2.5">
                        <p className="truncate text-sm font-bold">{lead.name}</p>
                        <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                          {pretty(lead.formType)} · {formatDate(lead.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <Button tone="ink" size="sm" className="mt-4 w-full" onClick={() => goTo('leads')}>
                  Open the inbox →
                </Button>
              </CardBody>
            </Card>

            <Card className="flex h-full flex-col">
              <CardBar tone={packed.length ? 'tangerine' : 'lime'}>
                <span>Near capacity</span>
                <span>{packed.length}</span>
              </CardBar>
              <CardBody className="flex flex-1 flex-col">
                {packed.length === 0 ? (
                  <p className="text-sm text-ink-muted">No event is past 90% of its capacity.</p>
                ) : (
                  <ul className="flex-1 space-y-2.5">
                    {packed.slice(0, 4).map(({ event, pct }) => (
                      <li key={event.id} className="border border-dashed border-line p-2.5">
                        <p className="truncate text-sm font-bold">{event.title}</p>
                        <div className="mt-2 h-3 w-full border border-line bg-surface-inset">
                          <div
                            className={cn('h-full', pct >= 100 ? 'bg-grad-brand-soft' : 'bg-amber/12')}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                          {event.registrations}/{event.maxCapacity} · {pct}% full
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <Button tone="ink" size="sm" className="mt-4 w-full" onClick={() => goTo('events')}>
                  Manage events →
                </Button>
              </CardBody>
            </Card>

            <Card className="flex h-full flex-col">
              <CardBar tone={closing.length ? 'violet' : 'lime'}>
                <span>Closing soon</span>
                <span>{closing.length}</span>
              </CardBar>
              <CardBody className="flex flex-1 flex-col">
                {closing.length === 0 ? (
                  <p className="text-sm text-ink-muted">Nothing listed closes inside a week.</p>
                ) : (
                  <ul className="flex-1 space-y-2.5">
                    {closing.slice(0, 4).map((role) => (
                      <li key={role.id} className="border border-dashed border-line p-2.5">
                        <p className="truncate text-sm font-bold">{role.title}</p>
                        <p className="mt-0.5 truncate text-xs text-ink-muted">{role.org}</p>
                        <p
                          className={cn(
                            'mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em]',
                            (role.daysLeft ?? 0) < 0 ? 'text-rose' : 'text-violet-bright',
                          )}
                        >
                          {(role.daysLeft ?? 0) < 0
                            ? `Closed ${Math.abs(role.daysLeft ?? 0)} days ago, still published`
                            : (role.daysLeft ?? 0) === 0
                              ? 'Closes today'
                              : `Closes in ${role.daysLeft} days`}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <Button tone="ink" size="sm" className="mt-4 w-full" onClick={() => goTo('opportunities')}>
                  Manage opportunities →
                </Button>
              </CardBody>
            </Card>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------
 Recent signups
 ------------------------------------------------------------------ */}
      <div className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-2xl">Newest members</h3>
            <p className="mt-1 text-sm text-ink-muted">
              {drafts > 0
                ? `${drafts} unpublished item${drafts === 1 ? '' : 's'} sitting in drafts, separately.`
                : 'Nothing is sitting in drafts right now.'}
            </p>
          </div>
          <Button tone="paper" size="sm" onClick={() => goTo('members')}>
            All members →
          </Button>
        </div>

        {recent.length === 0 ? (
          <EmptyState title="Nobody has joined yet" blurb="The first account appears here the moment it is created." />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((member) => (
              <li key={member.id} className="flex items-center gap-3 border border-line bg-surface p-3 shadow-panel">
                <Avatar name={member.fullName} src={member.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{member.fullName}</p>
                  <p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                    {member.org} · {formatDate(member.createdAt)}
                  </p>
                </div>
                {member.role === 'ADMIN' && (
                  <Chip tone="ink" size="sm">
                    Admin
                  </Chip>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ========================================================================== */
/* Access Requests  */
/* ========================================================================== */

function AccessRequestsPanel({
  members,
  adminUserId,
}: {
  members: AdminMember[];
  adminUserId: string;
}) {
  const actions = useAdminActions();
  const [query, setQuery] = useState('');

  const pendingMembers = useMemo(
    () =>
      members.filter((m) => {
        if (m.status !== 'PENDING') return false;
        return matches(query, m.fullName, m.email, m.handle, m.org, m.jobTitle, m.field, m.location);
      }),
    [members, query],
  );

  async function setMemberStatus(member: AdminMember, nextStatus: 'ACTIVE' | 'REVOKED') {
    await actions.run({
      id: member.id,
      url: '/api/admin/members',
      method: 'PATCH',
      body: { userId: member.id, status: nextStatus },
      success: nextStatus === 'ACTIVE' ? 'Access granted & member activated' : 'Access request rejected',
      successBody: member.fullName,
    });
  }

  return (
    <div>
      <PanelHead
        kicker="🔐 Access Requests"
        title="Pending Member Applications"
        blurb={`Review and approve new member access requests before granting access to community features. ${pendingMembers.length} request(s) awaiting review.`}
        tone="tangerine"
      />

      <ErrorBanner key={actions.error ?? 'clear'} message={actions.error} onDismiss={actions.clearError} />

      <Toolbar>
        <div className="flex-1">
          <label htmlFor="req-search" className="sr-only">
            Search access requests
          </label>
          <Input
            id="req-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search applicant name, email, organisation, job title…"
          />
        </div>
      </Toolbar>

      {pendingMembers.length === 0 ? (
        <EmptyState
          title="No pending access requests"
          blurb="All member registration access requests have been reviewed and processed."
        />
      ) : (
        <ul className="space-y-3">
          {pendingMembers.map((member) => {
            const busy = actions.busyId === member.id;

            return (
              <Row key={member.id} className="border-amber/40 bg-amber/5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={member.fullName} src={member.avatarUrl} size="md" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-extrabold text-white text-ink">{member.fullName}</p>
                        <Chip tone="tangerine" size="sm">
                          Pending Approval
                        </Chip>
                        <Chip tone={MEMBER_TYPE_TONE[member.memberType] ?? 'paper'} size="sm">
                          {pretty(member.memberType)}
                        </Chip>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-ink-muted">{member.email}</p>
                      {member.headline && (
                        <p className="mt-0.5 truncate text-xs italic text-ink-muted">{member.headline}</p>
                      )}
                      <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                        {member.handle ? `@${member.handle} · ` : ''}
                        {member.org}
                        {member.jobTitle ? ` · ${member.jobTitle}` : ''}
                        {member.location ? ` · ${member.location}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 flex-wrap items-center gap-4 lg:gap-6">
                    <div>
                      <p className="text-sm">{member.field || '-'}</p>
                      <Meta>Discipline</Meta>
                    </div>
                    <div>
                      <p className="text-sm">{formatDate(member.createdAt)}</p>
                      <Meta>Requested</Meta>
                    </div>
                  </div>

                  <RowActions>
                    <Button
                      tone="lime"
                      size="sm"
                      disabled={busy}
                      onClick={() => setMemberStatus(member, 'ACTIVE')}
                    >
                      {busy ? 'Working…' : '✅ Approve Access'}
                    </Button>
                    <Button
                      tone="magenta"
                      size="sm"
                      disabled={busy}
                      onClick={() => setMemberStatus(member, 'REVOKED')}
                    >
                      {busy ? 'Working…' : '❌ Reject Request'}
                    </Button>
                  </RowActions>
                </div>
              </Row>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ========================================================================== */
/* Members  */
/* ========================================================================== */

function MembersPanel({
  members,
  adminUserId,
}: {
  members: AdminMember[];
  adminUserId: string;
}) {
  const actions = useAdminActions();
  const remove = useDeleteFlow(actions, (id) => `/api/admin/members?id=${id}`, 'Member deleted');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'newest' | 'name' | 'org'>('newest');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'REVOKED' | 'ALL'>('ACTIVE');

  // Strictly exclude PENDING applicants from the Members directory section
  const confirmedMembers = useMemo(() => members.filter((m) => m.status !== 'PENDING'), [members]);

  const activeCount = confirmedMembers.filter((m) => m.status === 'ACTIVE').length;
  const revokedCount = confirmedMembers.filter((m) => m.status === 'REVOKED').length;

  const visible = useMemo(() => {
    const rows = confirmedMembers.filter((member) => {
      if (statusFilter !== 'ALL' && member.status !== statusFilter) return false;
      return matches(
        query,
        member.fullName,
        member.email,
        member.handle,
        member.org,
        member.jobTitle,
        member.field,
        member.location,
      );
    });

    return rows.sort((a, b) => {
      if (sort === 'name') return a.fullName.localeCompare(b.fullName);
      if (sort === 'org') return a.org.localeCompare(b.org);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [confirmedMembers, query, statusFilter, sort]);

  async function setMemberStatus(member: AdminMember, nextStatus: 'ACTIVE' | 'REVOKED') {
    await actions.run({
      id: member.id,
      url: '/api/admin/members',
      method: 'PATCH',
      body: { userId: member.id, status: nextStatus },
      success: nextStatus === 'ACTIVE' ? 'Access granted & member activated' : 'Access revoked',
      successBody: member.fullName,
    });
  }

  return (
    <div>
      <PanelHead
        title="Who has joined"
        blurb="The active member directory. admin@bsa.in is the sole system administrator. Additional admin creation is permanently disabled."
      />

      <ErrorBanner key={actions.error ?? 'clear'} message={actions.error} onDismiss={actions.clearError} />

      <div className="mb-5 border border-dashed border-line bg-amber/10 p-3">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          Single Admin Governance Policy
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">
          Only 1 primary administrator account (admin@bsa.in) is permitted on this platform. Granting admin privileges to other users or demoting the primary admin is strictly disabled.
        </p>
      </div>

      <Toolbar>
        <div className="flex-1">
          <label htmlFor="member-search" className="sr-only">
            Search members
          </label>
          <Input
            id="member-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, handle, email, organisation, discipline…"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')}>
            All ({confirmedMembers.length})
          </FilterChip>
          <FilterChip
            active={statusFilter === 'ACTIVE'}
            onClick={() => setStatusFilter('ACTIVE')}
            activeClass="bg-lime text-void"
          >
            Active ({activeCount})
          </FilterChip>
          <FilterChip
            active={statusFilter === 'REVOKED'}
            onClick={() => setStatusFilter('REVOKED')}
            activeClass="bg-rose text-void"
          >
            Revoked ({revokedCount})
          </FilterChip>
        </div>
        <div className="lg:w-[180px]">
          <label htmlFor="member-sort" className="sr-only">
            Sort members
          </label>
          <Select id="member-sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="newest">Newest first</option>
            <option value="name">Name A to Z</option>
            <option value="org">Organisation A to Z</option>
          </Select>
        </div>
      </Toolbar>

      <p aria-live="polite" className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
        {visible.length} shown
      </p>

      {visible.length === 0 ? (
        <EmptyState
          title="No member matches that"
          blurb="Try a shorter search, or clear the role filter."
          action={
            <Button
              tone="ink"
              onClick={() => {
                setQuery('');
                setStatusFilter('ALL');
              }}
            >
              Reset filters
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((member) => {
            const isSelf = member.id === adminUserId;
            const busy = actions.busyId === member.id;

            return (
              <Row key={member.id} className={cn(isSelf && 'bg-cyan/10')}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={member.fullName} src={member.avatarUrl} size="md" />
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-base font-extrabold text-white text-ink">{member.fullName}</p>
                          {member.role === 'ADMIN' && (
                            <Chip tone="magenta" size="sm">
                              Admin
                            </Chip>
                          )}
                          {isSelf && (
                            <Chip tone="lime" size="sm">
                              Signed in as you
                            </Chip>
                          )}
                          {member.status === 'PENDING' && (
                            <Chip tone="tangerine" size="sm">
                              Pending Activation
                            </Chip>
                          )}
                          {member.status === 'REVOKED' && (
                            <Chip tone="magenta" size="sm">
                              Access Revoked
                            </Chip>
                          )}
                          {member.status === 'ACTIVE' && !isSelf && (
                            <Chip tone="lime" size="sm">
                              Active Member
                            </Chip>
                          )}
                          <Chip tone={MEMBER_TYPE_TONE[member.memberType] ?? 'paper'} size="sm">
                            {pretty(member.memberType)}
                          </Chip>
                        </div>
                      <p className="mt-0.5 truncate text-xs text-ink-muted">{member.email}</p>
                      {member.headline && (
                        <p className="mt-0.5 truncate text-xs italic text-ink-muted">{member.headline}</p>
                      )}
                      <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                        {member.handle ? `@${member.handle} · ` : ''}
                        {member.org}
                        {member.jobTitle ? ` · ${member.jobTitle}` : ''}
                        {member.location ? ` · ${member.location}` : ''}
                        {member.emailVerified ? '' : ' · unverified'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 flex-wrap items-center gap-4 lg:gap-6">
                    <div>
                      <p className="text-sm">{member.field || '-'}</p>
                      <Meta>Discipline</Meta>
                    </div>
                    <div>
                      <p className="text-sm">
                        {member.yearsExperience === null ? '-' : `${member.yearsExperience} yrs`}
                      </p>
                      <Meta>Experience</Meta>
                    </div>
                    <div>
                      <p className="text-sm">{formatDate(member.createdAt)}</p>
                      <Meta>Joined</Meta>
                    </div>
                  </div>

                  <RowActions>
                    {member.handle && (
                      <Button href={`/members/${member.handle}`} tone="paper" size="sm">
                        Profile
                      </Button>
                    )}
                    {member.status === 'PENDING' && (
                      <>
                        <Button
                          tone="lime"
                          size="sm"
                          disabled={busy}
                          onClick={() => setMemberStatus(member, 'ACTIVE')}
                        >
                          Approve & Activate
                        </Button>
                        <Button
                          tone="tangerine"
                          size="sm"
                          disabled={busy}
                          onClick={() => setMemberStatus(member, 'REVOKED')}
                        >
                          Reject Request
                        </Button>
                      </>
                    )}
                    {member.status === 'ACTIVE' && !isSelf && (
                      <Button
                        tone="tangerine"
                        size="sm"
                        disabled={busy}
                        onClick={() => setMemberStatus(member, 'REVOKED')}
                      >
                        Revoke Access
                      </Button>
                    )}
                    {member.status === 'REVOKED' && (
                      <Button
                        tone="lime"
                        size="sm"
                        disabled={busy}
                        onClick={() => setMemberStatus(member, 'ACTIVE')}
                      >
                        Grant Access
                      </Button>
                    )}
                    {!isSelf && (
                      <Button
                        tone="magenta"
                        size="sm"
                        disabled={busy}
                        onClick={() => remove.ask(member.id, `${member.fullName} · ${member.email}`)}
                      >
                        Delete
                      </Button>
                    )}
                  </RowActions>
                </div>
              </Row>
            );
          })}
        </ul>
      )}

      <ConfirmDelete
        target={remove.target}
        what="member"
        cascade="Their profile, event registrations, applications, resource progress and chapter memberships go with them. The API refuses if this is the account you are signed in with."
        pending={remove.pending}
        error={remove.error}
        onClose={remove.close}
        onConfirm={remove.confirm}
      />
    </div>
  );
}

/* ========================================================================== */
/* Events  */
/* ========================================================================== */

function EventsPanel({ events }: { events: AdminEvent[] }) {
  const actions = useAdminActions();
  const remove = useDeleteFlow(actions, (id) => `/api/admin/events?id=${id}`, 'Event deleted');
  const [items, setItems] = useState<AdminEvent[]>(events);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [editing, setEditing] = useState<AdminEvent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setItems(events);
  }, [events]);

  const visible = useMemo(
    () =>
      items.filter((event) => {
        if (status !== 'ALL' && event.status !== status) return false;
        return matches(query, event.title, event.location, event.category, event.venueName);
      }),
    [items, query, status],
  );

  async function save(payload: Record<string, unknown>, method: 'POST' | 'PATCH') {
    const res = await actions.run({
      id: 'event-form',
      url: '/api/admin/events',
      method,
      body: payload,
      success: method === 'POST' ? 'Event created' : 'Event updated',
      successBody: String(payload.title ?? editing?.title ?? ''),
      silent: true,
    });

    if (res.ok) {
      if (res.data?.event) {
        const ev = res.data.event;
        const formatted: AdminEvent = {
          id: ev.id,
          slug: ev.slug,
          title: ev.title,
          description: ev.description ?? '',
          fullDetails: ev.fullDetails ?? '',
          category: ev.category ?? 'ROUNDTABLE',
          eventDate: ev.eventDate ? new Date(ev.eventDate).toISOString() : new Date().toISOString(),
          startTime: ev.startTime ?? '',
          endTime: ev.endTime ?? '',
          location: ev.location ?? '',
          locationType: ev.locationType ?? 'IN_PERSON',
          venueName: ev.venueName ?? null,
          maxCapacity: Number(ev.maxCapacity ?? 0),
          isPaid: Boolean(ev.isPaid),
          status: ev.status ?? 'UPCOMING',
          heroImageUrl: ev.heroImageUrl ?? null,
          cpdHours: Number(ev.cpdHours ?? 0),
          registrations: ev._count?.registrations ?? 0,
          ticketName: ev.tickets?.[0]?.name ?? 'Member Registration',
          ticketPrice: Number(ev.tickets?.[0]?.price ?? 0),
          ticketCurrency: ev.tickets?.[0]?.currency ?? 'USD',
        };
        setItems((prev) => {
          const exists = prev.some((e) => e.id === formatted.id);
          if (exists) {
            return prev.map((e) => (e.id === formatted.id ? { ...e, ...formatted } : e));
          }
          return [formatted, ...prev];
        });
      } else if (method === 'PATCH' && editing) {
        setItems((prev) =>
          prev.map((e) => {
            if (e.id !== editing.id) return e;
            const updatedPrice = payload.ticketPrice !== undefined ? Number(payload.ticketPrice) : e.ticketPrice;
            const updatedCap = payload.maxCapacity !== undefined ? Number(payload.maxCapacity) : e.maxCapacity;
            const updatedCpd = payload.cpdHours !== undefined ? Number(payload.cpdHours) : e.cpdHours;
            return {
              ...e,
              ...(payload.title !== undefined ? { title: String(payload.title) } : {}),
              ...(payload.description !== undefined ? { description: String(payload.description) } : {}),
              ...(payload.fullDetails !== undefined ? { fullDetails: String(payload.fullDetails) } : {}),
              ...(payload.category !== undefined ? { category: String(payload.category) } : {}),
              ...(payload.location !== undefined ? { location: String(payload.location) } : {}),
              ...(payload.locationType !== undefined ? { locationType: String(payload.locationType) } : {}),
              ...(payload.venueName !== undefined ? { venueName: String(payload.venueName) } : {}),
              ...(payload.eventDate !== undefined ? { eventDate: String(payload.eventDate) } : {}),
              ...(payload.startTime !== undefined ? { startTime: String(payload.startTime) } : {}),
              ...(payload.endTime !== undefined ? { endTime: String(payload.endTime) } : {}),
              ...(payload.status !== undefined ? { status: String(payload.status) } : {}),
              ticketPrice: updatedPrice,
              isPaid: updatedPrice > 0,
              cpdHours: updatedCpd,
              maxCapacity: updatedCap,
            } as AdminEvent;
          }),
        );
      }
    }
    return res.ok ? null : res.error;
  }

  async function confirmDelete() {
    const id = remove.target?.id;
    await remove.confirm();
    if (id) {
      setItems((prev) => prev.filter((e) => e.id !== id));
    }
  }

  return (
    <div>
      <PanelHead
        kicker="Events"
        title="The calendar"
        blurb="Create, edit and withdraw events. Capacity bars turn orange past 60% and magenta past 90%, so you can see what is about to sell out."
        tone="violet"
        action={
          <Button
            tone="lime"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            + New event
          </Button>
        }
      />

      <ErrorBanner key={actions.error ?? 'clear'} message={actions.error} onDismiss={actions.clearError} />

      <Toolbar>
        <div className="flex-1">
          <label htmlFor="event-search" className="sr-only">
            Search events
          </label>
          <Input
            id="event-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title, city, venue…"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <FilterChip active={status === 'ALL'} onClick={() => setStatus('ALL')}>
            All {items.length}
          </FilterChip>
          {EVENT_STATUSES.map((value) => (
            <FilterChip
              key={value}
              active={status === value}
              onClick={() => setStatus(status === value ? 'ALL' : value)}
            >
              {value}
            </FilterChip>
          ))}
        </div>
      </Toolbar>

      {visible.length === 0 ? (
        <EmptyState
          title={items.length === 0 ? 'No events yet' : 'Nothing matches that'}
          blurb={
            items.length === 0
              ? 'The calendar is empty. A twelve-person roundtable still counts as an event.'
              : 'Try a different word, or clear the status filter.'
          }
          action={
            items.length === 0 ? (
              <Button
                tone="lime"
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                Create the first one
              </Button>
            ) : (
              <Button
                tone="ink"
                onClick={() => {
                  setQuery('');
                  setStatus('ALL');
                }}
              >
                Reset filters
              </Button>
            )
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((event) => {
            const pct = event.maxCapacity > 0 ? Math.round((event.registrations / event.maxCapacity) * 100) : 0;
            const busy = actions.busyId === event.id;

            return (
              <Row key={event.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center border border-line bg-cyan/12 shadow-panel">
                      <span className="font-display text-lg leading-none">
                        {new Date(event.eventDate).getDate().toString().padStart(2, '0')}
                      </span>
                      <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em]">
                        {new Date(event.eventDate).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                      </span>
                    </span>

                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <Chip tone={STATUS_TONE[event.status] ?? 'paper'} size="sm">
                          {event.status}
                        </Chip>
                        <Chip size="sm">
                          {categoryEmoji(event.category)} {event.category}
                        </Chip>
                        <Chip size="sm" tone={event.isPaid ? 'tangerine' : 'lime'}>
                          {formatMoney(event.ticketPrice, event.ticketCurrency)}
                        </Chip>
                        {event.cpdHours > 0 && <Chip size="sm">{event.cpdHours} CPD</Chip>}
                      </div>
                      <p className="truncate text-base font-extrabold text-white text-ink">{event.title}</p>
                      <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                        {event.startTime} · {event.location} · {pretty(event.locationType)}
                        {event.venueName ? ` · ${event.venueName}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="w-full flex-shrink-0 lg:w-48">
                    <div className="h-3 w-full border border-line bg-surface-inset">
                      <div
                        className={cn(
                          'h-full',
                          pct >= 90 ? 'bg-grad-brand-soft' : pct >= 60 ? 'bg-amber/12' : 'bg-cyan/12',
                        )}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <p className="mt-1.5">
                      <Meta>
                        {event.registrations}/{event.maxCapacity} registered · {pct}%
                      </Meta>
                    </p>
                  </div>

                  <RowActions>
                    <Button href={`/events/${event.slug}`} tone="paper" size="sm">
                      View
                    </Button>
                    <Button
                      tone="violet"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        setEditing(event);
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button tone="magenta" size="sm" disabled={busy} onClick={() => remove.ask(event.id, event.title)}>
                      Delete
                    </Button>
                  </RowActions>
                </div>
              </Row>
            );
          })}
        </ul>
      )}

      <EventModal
        open={open}
        editing={editing}
        pending={actions.busyId === 'event-form'}
        onClose={() => setOpen(false)}
        onSave={save}
      />

      <ConfirmDelete
        target={remove.target}
        what="event"
        cascade="Tickets, registrations and the speaker list attached to this event are removed with it. Anyone holding a registration code loses it."
        pending={remove.pending}
        error={remove.error}
        onClose={remove.close}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

/* ========================================================================== */
/* Opportunities  */
/* ========================================================================== */

function OpportunitiesPanel({ opportunities }: { opportunities: AdminOpportunity[] }) {
  const actions = useAdminActions();
  const remove = useDeleteFlow(actions, (id) => `/api/admin/opportunities?id=${id}`, 'Opportunity deleted');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('ALL');
  const [editing, setEditing] = useState<AdminOpportunity | null>(null);
  const [open, setOpen] = useState(false);

  const visible = useMemo(
    () =>
      opportunities.filter((role) => {
        if (type !== 'ALL' && role.type !== type) return false;
        return matches(query, role.title, role.org, role.location, role.compensation);
      }),
    [opportunities, query, type],
  );

  async function save(payload: Record<string, unknown>, method: 'POST' | 'PATCH') {
    const res = await actions.run({
      id: 'opportunity-form',
      url: '/api/admin/opportunities',
      method,
      body: payload,
      success: method === 'POST' ? 'Opportunity posted' : 'Opportunity updated',
      successBody: String(payload.title ?? editing?.title ?? ''),
      silent: true,
    });
    return res.ok ? null : res.error;
  }

  async function togglePublished(role: AdminOpportunity) {
    await actions.run({
      id: role.id,
      url: '/api/admin/opportunities',
      method: 'PATCH',
      body: { id: role.id, isPublished: !role.isPublished },
      success: role.isPublished ? 'Withdrawn from the list' : 'Published to the list',
      successBody: role.title,
    });
  }

  return (
    <div>
      <PanelHead
        title="Roles, partnerships and tenders"
        blurb="Senior roles, partnership approaches, tenders, speaking slots and board seats. Requirements are chips; an empty closing date means the listing stays open."
        tone="tangerine"
        action={
          <Button
            tone="lime"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            + New opportunity
          </Button>
        }
      />

      <ErrorBanner key={actions.error ?? 'clear'} message={actions.error} onDismiss={actions.clearError} />

      <Toolbar>
        <div className="flex-1">
          <label htmlFor="opp-search" className="sr-only">
            Search opportunities
          </label>
          <Input
            id="opp-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title, organisation, city…"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <FilterChip active={type === 'ALL'} onClick={() => setType('ALL')}>
            All {opportunities.length}
          </FilterChip>
          {OPPORTUNITY_TYPES.map((value) => (
            <FilterChip key={value} active={type === value} onClick={() => setType(type === value ? 'ALL' : value)}>
              {pretty(value)}
            </FilterChip>
          ))}
        </div>
      </Toolbar>

      {visible.length === 0 ? (
        <EmptyState
          title={opportunities.length === 0 ? 'Nothing listed yet' : 'Nothing matches that'}
          blurb={
            opportunities.length === 0
              ? 'One well-scoped listing from a member organisation is worth ten reposted adverts.'
              : 'Try a different word, or clear the type filter.'
          }
          action={
            opportunities.length === 0 ? (
              <Button
                tone="lime"
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                Post the first one
              </Button>
            ) : (
              <Button
                tone="ink"
                onClick={() => {
                  setQuery('');
                  setType('ALL');
                }}
              >
                Reset filters
              </Button>
            )
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((role) => {
            const busy = actions.busyId === role.id;
            const days = role.daysLeft;

            return (
              <Row key={role.id} className={cn(!role.isPublished && 'bg-surface-inset/60')}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span
                      aria-hidden
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center border border-line bg-amber/10 text-xl shadow-panel"
                    >
                      {categoryEmoji(role.type)}
                    </span>
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <Chip size="sm" tone="tangerine">
                          {pretty(role.type)}
                        </Chip>
                        <Chip size="sm">{role.locationType}</Chip>
                        {role.compensation && (
                          <Chip size="sm" tone="lime">
                            {role.compensation}
                          </Chip>
                        )}
                        {!role.isPublished && (
                          <Chip size="sm" tone="ink">
                            Draft
                          </Chip>
                        )}
                      </div>
                      <p className="truncate text-base font-extrabold text-white text-ink">{role.title}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-muted">
                        {role.org} · {role.location}
                      </p>
                      <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                        {role.requirements.length} requirement{role.requirements.length === 1 ? '' : 's'} · posted{' '}
                        {formatDate(role.postedAt)}
                        {role.deadline ? ` · closes ${formatDate(role.deadline)}` : ' · no closing date'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-6">
                    <div>
                      <p className="font-display text-lg leading-none">{role.applications}</p>
                      <Meta>Applied</Meta>
                    </div>
                    {days !== null && days <= 7 && (
                      <Chip tone={days < 0 ? 'ink' : 'magenta'} size="sm">
                        {days < 0 ? 'Expired' : days === 0 ? 'Closes today' : `${days}d left`}
                      </Chip>
                    )}
                  </div>

                  <RowActions>
                    <Button href={`/opportunities/${role.slug}`} tone="paper" size="sm">
                      View
                    </Button>
                    <Button tone="paper" size="sm" disabled={busy} onClick={() => togglePublished(role)}>
                      {busy ? 'Working…' : role.isPublished ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button
                      tone="violet"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        setEditing(role);
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      tone="magenta"
                      size="sm"
                      disabled={busy}
                      onClick={() => remove.ask(role.id, `${role.title} · ${role.org}`)}
                    >
                      Delete
                    </Button>
                  </RowActions>
                </div>
              </Row>
            );
          })}
        </ul>
      )}

      <OpportunityModal
        open={open}
        editing={editing}
        pending={actions.busyId === 'opportunity-form'}
        onClose={() => setOpen(false)}
        onSave={save}
      />

      <ConfirmDelete
        target={remove.target}
        what="opportunity"
        cascade="Every application submitted against this listing is deleted with it. If you only want it off the list, unpublish instead."
        pending={remove.pending}
        error={remove.error}
        onClose={remove.close}
        onConfirm={remove.confirm}
      />
    </div>
  );
}

/* ========================================================================== */
/* Applications (read-only)  */
/* ========================================================================== */

function ApplicationsPanel({ applications }: { applications: AdminApplication[] }) {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('ALL');

  const roles = useMemo(() => {
    const seen = new Map<string, string>();
    for (const application of applications) seen.set(application.opportunitySlug, application.opportunityTitle);
    return Array.from(seen.entries());
  }, [applications]);

  const visible = useMemo(
    () =>
      applications.filter((application) => {
        if (role !== 'ALL' && application.opportunitySlug !== role) return false;
        return matches(
          query,
          application.name,
          application.email,
          application.org,
          application.opportunityTitle,
          application.opportunityOrg,
        );
      }),
    [applications, query, role],
  );

  return (
    <div>
      <PanelHead
        title="Who responded to what"
        blurb="Read-only by design. Reply from your own mailbox so the candidate hears from a person, not a no-reply address."
      />

      <Toolbar>
        <div className="flex-1">
          <label htmlFor="app-search" className="sr-only">
            Search applications
          </label>
          <Input
            id="app-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Candidate, email, organisation, listing…"
          />
        </div>
        <div className="lg:w-[280px]">
          <label htmlFor="app-role" className="sr-only">
            Filter by opportunity
          </label>
          <Select id="app-role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="ALL">Every opportunity ({applications.length})</option>
            {roles.map(([slug, title]) => (
              <option key={slug} value={slug}>
                {title}
              </option>
            ))}
          </Select>
        </div>
      </Toolbar>

      {visible.length === 0 ? (
        <EmptyState
          title={applications.length === 0 ? 'No applications yet' : 'Nothing matches that'}
          blurb={
            applications.length === 0
              ? 'Nobody has responded through the site yet. Share a listing with the chapters and this fills up.'
              : 'Try a different name, or switch back to every opportunity.'
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((application) => (
            <Row key={application.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <Avatar name={application.name} size="sm" />
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <Chip size="sm" tone={APPLICATION_TONE[application.status] ?? 'paper'}>
                        {application.status}
                      </Chip>
                      <Chip size="sm">{formatDate(application.createdAt)}</Chip>
                    </div>
                    <p className="truncate text-base font-extrabold text-white text-ink">{application.name}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-muted">
                      {application.email}
                      {application.org ? ` · ${application.org}` : ''}
                    </p>
                    {application.note && (
                      <p className="mt-2 border-l border-line pl-3 text-xs leading-relaxed text-ink-soft">
                        {application.note}
                      </p>
                    )}
                  </div>
                </div>

                <div className="min-w-0 flex-shrink-0 lg:w-64">
                  <Meta>Applied to</Meta>
                  <Link
                    href={`/opportunities/${application.opportunitySlug}`}
                    className="mt-1 block truncate text-sm font-bold underline decoration-2 underline-offset-2 hover:text-violet-bright"
                  >
                    {application.opportunityTitle}
                  </Link>
                  <p className="truncate text-xs text-ink-muted">{application.opportunityOrg}</p>
                </div>

                <RowActions>
                  {application.profileUrl && (
                    <Button href={application.profileUrl} tone="paper" size="sm">
                      Profile ↗
                    </Button>
                  )}
                  <Button
                    href={`mailto:${application.email}?subject=${encodeURIComponent(
                      `Your application - ${application.opportunityTitle}`,
                    )}`}
                    tone="lime"
                    size="sm"
                  >
                    Reply
                  </Button>
                </RowActions>
              </div>
            </Row>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ========================================================================== */
/* Partners  */
/* ========================================================================== */

function PartnersPanel({ sponsors }: { sponsors: AdminSponsor[] }) {
  const actions = useAdminActions();
  const remove = useDeleteFlow(actions, (id) => `/api/admin/sponsors?id=${id}`, 'Partner removed');
  const [editing, setEditing] = useState<AdminSponsor | null>(null);
  const [open, setOpen] = useState(false);

  async function save(payload: Record<string, unknown>, method: 'POST' | 'PATCH') {
    const res = await actions.run({
      id: 'sponsor-form',
      url: '/api/admin/sponsors',
      method,
      body: payload,
      success: method === 'POST' ? 'Partner added' : 'Partner updated',
      successBody: String(payload.name ?? editing?.name ?? ''),
      silent: true,
    });
    return res.ok ? null : res.error;
  }

  return (
    <div>
      <PanelHead
        kicker="Partners"
        title="Who supports the association"
        blurb="Tier drives the order on the public partners page. Keep the hiring marker and member benefit accurate - members act on both."
        action={
          <Button
            tone="lime"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            + New partner
          </Button>
        }
      />

      <ErrorBanner key={actions.error ?? 'clear'} message={actions.error} onDismiss={actions.clearError} />

      {sponsors.length === 0 ? (
        <EmptyState
          title="No partners yet"
          blurb="Add the first organisation and their logo appears on the home page and the partners page."
          action={
            <Button
              tone="lime"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              Add a partner
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sponsors.map((sponsor) => {
            const busy = actions.busyId === sponsor.id;
            return (
              <li key={sponsor.id}>
                <Card className={cn('flex h-full flex-col', !sponsor.isPublished && 'opacity-70')}>
                  <CardBar tone={TIER_TONE[sponsor.tier] ?? 'ink'}>
                    <span>{sponsor.tier}</span>
                    <span>{sponsor.isPublished ? 'Live' : 'Hidden'}</span>
                  </CardBar>
                  <CardBody className="flex flex-1 flex-col">
                    <div className="flex items-start gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sponsor.logoUrl}
                        alt=""
                        loading="lazy"
                        className="h-12 w-12 flex-shrink-0 border border-line object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-base font-extrabold text-white text-ink">{sponsor.name}</p>
                        <p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                          {sponsor.websiteUrl.replace(/^https?:\/\//, '')}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 flex-1 text-xs leading-relaxed text-ink-muted">{sponsor.description}</p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {sponsor.isHiring && (
                        <Chip size="sm" tone="lime">
                          Hiring
                        </Chip>
                      )}
                      {sponsor.perkText && <Chip size="sm">Member benefit</Chip>}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-dashed border-line pt-3">
                      <Button
                        tone="violet"
                        size="sm"
                        disabled={busy}
                        onClick={() => {
                          setEditing(sponsor);
                          setOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        tone="magenta"
                        size="sm"
                        disabled={busy}
                        onClick={() => remove.ask(sponsor.id, sponsor.name)}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <SponsorModal
        open={open}
        editing={editing}
        pending={actions.busyId === 'sponsor-form'}
        onClose={() => setOpen(false)}
        onSave={save}
      />

      <ConfirmDelete
        target={remove.target}
        what="partner"
        cascade="Their logo comes off the home page, the partners page, and every event they were attached to."
        pending={remove.pending}
        error={remove.error}
        onClose={remove.close}
        onConfirm={remove.confirm}
      />
    </div>
  );
}

/* ========================================================================== */
/* Insights  */
/* ========================================================================== */

function InsightsPanel({ posts }: { posts: AdminPost[] }) {
  const actions = useAdminActions();
  const remove = useDeleteFlow(actions, (id) => `/api/admin/posts?id=${id}`, 'Insight deleted');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<AdminPost | null>(null);
  const [open, setOpen] = useState(false);

  const visible = useMemo(
    () => posts.filter((post) => matches(query, post.title, post.summary, post.category, post.authorName)),
    [posts, query],
  );

  async function save(payload: Record<string, unknown>, method: 'POST' | 'PATCH') {
    const res = await actions.run({
      id: 'post-form',
      url: '/api/admin/posts',
      method,
      body: payload,
      success: method === 'POST' ? 'Insight published' : 'Insight updated',
      successBody: String(payload.title ?? editing?.title ?? ''),
      silent: true,
    });
    return res.ok ? null : res.error;
  }

  async function toggleFeatured(post: AdminPost) {
    await actions.run({
      id: post.id,
      url: '/api/admin/posts',
      method: 'PATCH',
      body: { id: post.id, isFeatured: !post.isFeatured },
      success: post.isFeatured ? 'No longer featured' : 'Featured on the home page',
      successBody: post.title,
    });
  }

  return (
    <div>
      <PanelHead
        title="Published thinking"
        blurb="Analysis, guidance and practice notes from members and the association. Only one piece should be featured at a time - that is the lead slot on the home page."
        tone="violet"
        action={
          <Button
            tone="lime"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            + New insight
          </Button>
        }
      />

      <ErrorBanner key={actions.error ?? 'clear'} message={actions.error} onDismiss={actions.clearError} />

      <Toolbar>
        <div className="flex-1">
          <label htmlFor="post-search" className="sr-only">
            Search insights
          </label>
          <Input
            id="post-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title, summary, author…"
          />
        </div>
      </Toolbar>

      {visible.length === 0 ? (
        <EmptyState
          title={posts.length === 0 ? 'Nothing published yet' : 'Nothing matches that'}
          blurb={
            posts.length === 0
              ? 'A short write-up of the last roundtable is the easiest place to start. Members search for those.'
              : 'Try a different word.'
          }
          action={
            posts.length === 0 ? (
              <Button
                tone="lime"
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                Write the first one
              </Button>
            ) : (
              <Button tone="ink" onClick={() => setQuery('')}>
                Clear search
              </Button>
            )
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((post) => {
            const busy = actions.busyId === post.id;
            return (
              <Row key={post.id} className={cn(!post.isPublished && 'bg-surface-inset/60')}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <Chip size="sm" tone="violet">
                        {post.category}
                      </Chip>
                      <Chip size="sm">{post.readTimeMinutes} min</Chip>
                      {post.isFeatured && (
                        <Chip size="sm" tone="tangerine">
                          Featured
                        </Chip>
                      )}
                      {!post.isPublished && (
                        <Chip size="sm" tone="ink">
                          Draft
                        </Chip>
                      )}
                    </div>
                    <p className="text-base font-extrabold leading-tight text-white text-ink">{post.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-muted">{post.summary}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {post.tags.slice(0, 5).map((tag) => (
                        <Chip key={tag} size="sm">
                          #{tag}
                        </Chip>
                      ))}
                    </div>
                    <p className="mt-2 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                      {post.authorName} · {post.authorTitle} · {formatDate(post.publishedAt)}
                    </p>
                  </div>

                  <RowActions>
                    <Button href={`/blog/${post.slug}`} tone="paper" size="sm">
                      View
                    </Button>
                    <Button tone="paper" size="sm" disabled={busy} onClick={() => toggleFeatured(post)}>
                      {busy ? 'Working…' : post.isFeatured ? 'Unfeature' : 'Feature'}
                    </Button>
                    <Button
                      tone="violet"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        setEditing(post);
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button tone="magenta" size="sm" disabled={busy} onClick={() => remove.ask(post.id, post.title)}>
                      Delete
                    </Button>
                  </RowActions>
                </div>
              </Row>
            );
          })}
        </ul>
      )}

      <PostModal
        open={open}
        editing={editing}
        pending={actions.busyId === 'post-form'}
        onClose={() => setOpen(false)}
        onSave={save}
      />

      <ConfirmDelete
        target={remove.target}
        what="insight"
        cascade="The article and its URL go away. Any link anyone has shared to it starts returning a 404."
        pending={remove.pending}
        error={remove.error}
        onClose={remove.close}
        onConfirm={remove.confirm}
      />
    </div>
  );
}

/* ========================================================================== */
/* Resources (read-only)  */
/* ========================================================================== */

function ResourcesPanel({ resources }: { resources: AdminResource[] }) {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('ALL');

  const visible = useMemo(
    () =>
      resources.filter((resource) => {
        if (level !== 'ALL' && resource.level !== level) return false;
        return matches(query, resource.title, resource.summary, resource.level);
      }),
    [resources, query, level],
  );

  const totalModules = resources.reduce((sum, resource) => sum + resource.modules, 0);
  const published = resources.filter((resource) => resource.isPublished).length;

  return (
    <div>
      <PanelHead
        title="Professional development library"
        blurb={`${resources.length} resources, ${totalModules} modules, ${published} published. Listed here so you can see what members have access to.`}
        tone="violet"
      />

      <div className="mb-6 border border-dashed border-line bg-amber/10 p-4">
        <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink-muted">
          Read-only in this console
        </p>
        <p className="text-sm leading-relaxed text-ink-soft">
          There is no admin endpoint for resources. Titles, levels and module content are managed in the seed data or
          whichever CMS the client chooses, then deployed. Everything below reflects what is in the database right now.
        </p>
      </div>

      <Toolbar>
        <div className="flex-1">
          <label htmlFor="res-search" className="sr-only">
            Search resources
          </label>
          <Input
            id="res-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title or summary…"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <FilterChip active={level === 'ALL'} onClick={() => setLevel('ALL')}>
            All {resources.length}
          </FilterChip>
          {(['FOUNDATION', 'PRACTITIONER', 'EXECUTIVE'] as const).map((value) => (
            <FilterChip key={value} active={level === value} onClick={() => setLevel(level === value ? 'ALL' : value)}>
              {value}
            </FilterChip>
          ))}
        </div>
      </Toolbar>

      {visible.length === 0 ? (
        <EmptyState
          title={resources.length === 0 ? 'No resources in the database' : 'Nothing matches that'}
          blurb={
            resources.length === 0
              ? 'Run the seed, or point the resource table at the client CMS.'
              : 'Try a different word, or clear the level filter.'
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((resource) => (
            <li key={resource.id}>
              <Card className={cn('flex h-full flex-col', !resource.isPublished && 'opacity-70')}>
                <CardBar tone={resource.isPublished ? 'violet' : 'ink'}>
                  <span>{resource.level}</span>
                  <span>{resource.isPublished ? 'Published' : 'Hidden'}</span>
                </CardBar>
                <CardBody className="flex flex-1 flex-col">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center border border-line bg-violet/12 text-xl shadow-panel"
                    >
                      {resource.emoji}
                    </span>
                    <div className="min-w-0">
                      <p className="text-base font-extrabold leading-tight text-white text-ink">{resource.title}</p>
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                        {resource.modules} module{resource.modules === 1 ? '' : 's'} · {resource.estHours}h
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 flex-1 text-xs leading-relaxed text-ink-muted">{resource.summary}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-dashed border-line pt-3">
                    <Chip size="sm" tone={LEVEL_TONE[resource.level] ?? 'paper'}>
                      {resource.level}
                    </Chip>
                    <Button href={`/resources/${resource.slug}`} tone="paper" size="sm" className="ml-auto">
                      View
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ========================================================================== */
/* Leads  */
/* ========================================================================== */

function LeadsPanel({ leads }: { leads: AdminLead[] }) {
  const actions = useAdminActions();
  const remove = useDeleteFlow(actions, (id) => `/api/admin/leads?id=${id}`, 'Lead deleted');
  const [query, setQuery] = useState('');
  const [formType, setFormType] = useState('ALL');
  const [state, setState] = useState<'ALL' | 'OPEN' | 'HANDLED'>('OPEN');

  const openCount = leads.filter((lead) => !lead.isHandled).length;

  const visible = useMemo(
    () =>
      leads.filter((lead) => {
        if (formType !== 'ALL' && lead.formType !== formType) return false;
        if (state === 'OPEN' && lead.isHandled) return false;
        if (state === 'HANDLED' && !lead.isHandled) return false;
        return matches(query, lead.name, lead.email, lead.company, lead.message, lead.source);
      }),
    [leads, query, formType, state],
  );

  async function toggleHandled(lead: AdminLead) {
    await actions.run({
      id: lead.id,
      url: '/api/admin/leads',
      method: 'PATCH',
      body: { id: lead.id, isHandled: !lead.isHandled },
      success: lead.isHandled ? 'Reopened' : 'Marked handled',
      successBody: lead.name,
    });
  }

  return (
    <div>
      <PanelHead
        kicker="Leads"
        title="The inbox"
        blurb={`Every enquiry the contact, membership, partnership, sponsor, event and chapter forms have sent. ${openCount} still open. Reply from your own mail client, then mark it handled here.`}
        tone="magenta"
      />

      <ErrorBanner key={actions.error ?? 'clear'} message={actions.error} onDismiss={actions.clearError} />

      <Toolbar>
        <div className="flex-1">
          <label htmlFor="lead-search" className="sr-only">
            Search leads
          </label>
          <Input
            id="lead-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, email, organisation, message…"
          />
        </div>
        <div className="flex gap-2">
          <FilterChip
            active={state === 'OPEN'}
            onClick={() => setState('OPEN')}
            activeClass="bg-grad-brand-soft text-ink"
          >
            Open {openCount}
          </FilterChip>
          <FilterChip
            active={state === 'HANDLED'}
            onClick={() => setState('HANDLED')}
            activeClass="bg-cyan/12 text-ink"
          >
            Handled {leads.length - openCount}
          </FilterChip>
          <FilterChip active={state === 'ALL'} onClick={() => setState('ALL')}>
            All {leads.length}
          </FilterChip>
        </div>
        <div className="lg:w-[240px]">
          <label htmlFor="lead-type" className="sr-only">
            Filter by form type
          </label>
          <Select id="lead-type" value={formType} onChange={(e) => setFormType(e.target.value)}>
            <option value="ALL">Every form type</option>
            {FORM_TYPES.map((value) => (
              <option key={value} value={value}>
                {pretty(value)}
              </option>
            ))}
          </Select>
        </div>
      </Toolbar>

      {visible.length === 0 ? (
        <EmptyState
          title={
            state === 'OPEN' && leads.length > 0
              ? 'Inbox zero'
              : leads.length === 0
                ? 'No enquiries yet'
                : 'Nothing matches that'
          }
          blurb={
            state === 'OPEN' && leads.length > 0
              ? 'Every enquiry has had a reply.'
              : leads.length === 0
                ? 'The forms are wired to this inbox and to the CRM adapter. The first submission lands here.'
                : 'Try a different word, or widen the filters.'
          }
          action={
            leads.length > 0 ? (
              <Button
                tone="ink"
                onClick={() => {
                  setQuery('');
                  setFormType('ALL');
                  setState('ALL');
                }}
              >
                Show everything
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((lead) => {
            const busy = actions.busyId === lead.id;
            return (
              <Row key={lead.id} className={cn(lead.isHandled && 'bg-surface-inset/50')}>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                        <Chip size="sm" tone={LEAD_TONE[lead.formType] ?? 'paper'}>
                          {pretty(lead.formType)}
                        </Chip>
                        <Chip size="sm" tone={HUBSPOT_TONE[lead.hubspotStatus] ?? 'paper'}>
                          CRM {lead.hubspotStatus}
                        </Chip>
                        {lead.isHandled ? (
                          <Chip size="sm" tone="lime">
                            Handled
                          </Chip>
                        ) : (
                          <Chip size="sm" tone="magenta">
                            <LiveDot tone="lime" /> Open
                          </Chip>
                        )}
                      </div>
                      <p className="truncate text-base font-extrabold text-white text-ink">{lead.name}</p>
                      <p className="truncate text-xs text-ink-muted">
                        {lead.email}
                        {lead.company ? ` · ${lead.company}` : ''}
                      </p>
                      <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                        {formatDate(lead.createdAt)} · source {lead.source ?? 'direct'} · campaign{' '}
                        {lead.campaign ?? 'organic'}
                      </p>
                    </div>

                    <RowActions>
                      <Button
                        href={`mailto:${lead.email}?subject=${encodeURIComponent(
                          'Re: your enquiry to BSA',
                        )}&body=${encodeURIComponent(`Hi ${lead.name.split(' ')[0]},\n\n`)}`}
                        tone="lime"
                        size="sm"
                      >
                        Reply ↗
                      </Button>
                      <Button tone="paper" size="sm" disabled={busy} onClick={() => toggleHandled(lead)}>
                        {busy ? 'Working…' : lead.isHandled ? 'Reopen' : 'Mark handled'}
                      </Button>
                      <Button
                        tone="magenta"
                        size="sm"
                        disabled={busy}
                        onClick={() => remove.ask(lead.id, `${lead.name} · ${lead.email}`)}
                      >
                        Delete
                      </Button>
                    </RowActions>
                  </div>

                  <blockquote className="border-l border-line bg-base p-3 text-sm leading-relaxed text-ink-soft">
                    {lead.message}
                  </blockquote>
                </div>
              </Row>
            );
          })}
        </ul>
      )}

      <ConfirmDelete
        target={remove.target}
        what="lead"
        cascade="The message and the contact details go with it. If there is any chance you need it later, mark it handled instead."
        pending={remove.pending}
        error={remove.error}
        onClose={remove.close}
        onConfirm={remove.confirm}
      />
    </div>
  );
}

/* ========================================================================== */
/* Chapters Radar Management  */
/* ========================================================================== */

type ChapterForm = {
  name: string;
  city: string;
  country: string;
  region: string;
  description: string;
  emoji: string;
  accent: string;
  meetingCadence: string;
  latitude: string;
  longitude: string;
  contactEmail: string;
  linkedinUrl: string;
  isActive: boolean;
};

function blankChapter(): ChapterForm {
  return {
    name: '',
    city: '',
    country: 'United States',
    region: '',
    description: '',
    emoji: '🌐',
    accent: 'violet',
    meetingCadence: 'Monthly',
    latitude: '',
    longitude: '',
    contactEmail: '',
    linkedinUrl: '',
    isActive: true,
  };
}

function chapterToForm(ch: AdminChapter): ChapterForm {
  return {
    name: ch.name,
    city: ch.city,
    country: ch.country || 'United States',
    region: ch.region,
    description: ch.description,
    emoji: ch.emoji || '🌐',
    accent: ch.accent || 'violet',
    meetingCadence: ch.meetingCadence || 'Monthly',
    latitude: ch.latitude !== null && ch.latitude !== undefined ? String(ch.latitude) : '',
    longitude: ch.longitude !== null && ch.longitude !== undefined ? String(ch.longitude) : '',
    contactEmail: ch.contactEmail || '',
    linkedinUrl: ch.linkedinUrl || '',
    isActive: ch.isActive,
  };
}

function ChapterModal({
  open,
  editing,
  pending,
  onClose,
  onSave,
}: {
  open: boolean;
  editing: AdminChapter | null;
  pending: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>, method: 'POST' | 'PATCH') => Promise<string | null>;
}) {
  const [form, setForm] = useState<ChapterForm>(blankChapter);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? chapterToForm(editing) : blankChapter());
    setError(null);
  }, [open, editing]);

  const set = <K extends keyof ChapterForm>(key: K, value: ChapterForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      ...(editing ? { id: editing.id } : {}),
      name: form.name,
      city: form.city,
      country: form.country,
      region: form.region,
      description: form.description,
      emoji: form.emoji || '🌐',
      accent: form.accent || 'violet',
      meetingCadence: form.meetingCadence || 'Monthly',
      isActive: form.isActive,
      ...(form.contactEmail ? { contactEmail: form.contactEmail } : {}),
      ...(form.linkedinUrl ? { linkedinUrl: form.linkedinUrl } : {}),
      ...(form.latitude ? { latitude: parseFloat(form.latitude) } : {}),
      ...(form.longitude ? { longitude: parseFloat(form.longitude) } : {}),
    };

    const message = await onSave(payload, editing ? 'PATCH' : 'POST');
    if (message) setError(message);
    else onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Chapter' : 'New Chapter'}
      kicker="Global Chapter Radar"
      tone="violet"
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Chapter Name" htmlFor="ch-name" required>
            <Input
              id="ch-name"
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="BSA Tokyo"
            />
          </Field>
          <Field label="City" htmlFor="ch-city" required hint="Auto-geocodes on Radar">
            <Input
              id="ch-city"
              required
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              placeholder="Tokyo"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Country" htmlFor="ch-country">
            <Input
              id="ch-country"
              value={form.country}
              onChange={(e) => set('country', e.target.value)}
              placeholder="Japan"
            />
          </Field>
          <Field label="Region" htmlFor="ch-region" required>
            <Input
              id="ch-region"
              required
              value={form.region}
              onChange={(e) => set('region', e.target.value)}
              placeholder="East Asia"
            />
          </Field>
          <Field label="Meeting Cadence" htmlFor="ch-cadence">
            <Input
              id="ch-cadence"
              value={form.meetingCadence}
              onChange={(e) => set('meetingCadence', e.target.value)}
              placeholder="Monthly Sessions"
            />
          </Field>
        </div>

        <Field label="Description" htmlFor="ch-desc" required>
          <Textarea
            id="ch-desc"
            required
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Chapter summary for local security practitioners..."
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Emoji" htmlFor="ch-emoji">
            <Input
              id="ch-emoji"
              value={form.emoji}
              onChange={(e) => set('emoji', e.target.value)}
              placeholder="🗼"
            />
          </Field>
          <Field label="Latitude (Optional)" htmlFor="ch-lat" hint="e.g. 35.67">
            <Input
              id="ch-lat"
              type="number"
              step="any"
              value={form.latitude}
              onChange={(e) => set('latitude', e.target.value)}
              placeholder="35.6762"
            />
          </Field>
          <Field label="Longitude (Optional)" htmlFor="ch-lng" hint="e.g. 139.65">
            <Input
              id="ch-lng"
              type="number"
              step="any"
              value={form.longitude}
              onChange={(e) => set('longitude', e.target.value)}
              placeholder="139.6503"
            />
          </Field>
        </div>

        <Toggle
          checked={form.isActive}
          onChange={(next) => set('isActive', next)}
          label="Active on Radar"
          description={form.isActive ? 'Visible on global radar & chapter lists' : 'Hidden from radar'}
        />

        {error && <FieldError>{error}</FieldError>}

        <ModalActions
          pending={pending}
          onCancel={onClose}
          submitLabel={editing ? 'Save changes' : 'Add chapter to Radar'}
        />
      </form>
    </Modal>
  );
}

function ChaptersPanel({ chapters }: { chapters: AdminChapter[] }) {
  const router = useRouter();
  const actions = useAdminActions();
  const remove = useDeleteFlow(actions, (id) => `/api/admin/chapters?id=${id}`, 'Chapter deleted');
  const [items, setItems] = useState<AdminChapter[]>(chapters);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [editing, setEditing] = useState<AdminChapter | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setItems(chapters);
  }, [chapters]);

  const visible = useMemo(
    () =>
      items.filter((ch) => {
        if (statusFilter === 'ACTIVE' && !ch.isActive) return false;
        if (statusFilter === 'INACTIVE' && ch.isActive) return false;
        return matches(query, ch.name, ch.city, ch.region, ch.country, ch.meetingCadence);
      }),
    [items, query, statusFilter],
  );

  async function save(payload: Record<string, unknown>, method: 'POST' | 'PATCH') {
    const res = await actions.run({
      id: 'chapter-form',
      url: '/api/admin/chapters',
      method,
      body: payload,
      success: method === 'POST' ? 'Chapter added to radar' : 'Chapter updated',
      successBody: String(payload.name ?? editing?.name ?? ''),
      silent: true,
    });

    if (res.ok) {
      if (method === 'PATCH' && editing) {
        setItems((prev) =>
          prev.map((c) => (c.id === editing.id ? ({ ...c, ...payload } as AdminChapter) : c)),
        );
      } else {
        router.refresh();
      }
    }
    return res.ok ? null : res.error;
  }

  async function toggleActive(ch: AdminChapter) {
    await actions.run({
      id: ch.id,
      url: '/api/admin/chapters',
      method: 'PATCH',
      body: { id: ch.id, isActive: !ch.isActive },
      success: ch.isActive ? 'Chapter deactivated' : 'Chapter activated',
      successBody: ch.name,
    });
    setItems((prev) => prev.map((item) => (item.id === ch.id ? { ...item, isActive: !item.isActive } : item)));
  }

  async function confirmDelete() {
    const id = remove.target?.id;
    await remove.confirm();
    if (id) setItems((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div>
      <PanelHead
        kicker="🌐 Global Chapter Radar"
        title="Regional Chapters Management"
        blurb="Create, edit, toggle and plot chapters on the Global Chapter Radar. City coordinates automatically geocode and plot on the radar globe."
        tone="violet"
        action={
          <Button
            tone="lime"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            + New chapter
          </Button>
        }
      />

      <ErrorBanner key={actions.error ?? 'clear'} message={actions.error} onDismiss={actions.clearError} />

      <Toolbar>
        <div className="flex-1">
          <label htmlFor="ch-search" className="sr-only">
            Search chapters
          </label>
          <Input
            id="ch-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chapter name, city, region, country…"
          />
        </div>
        <div className="flex gap-2">
          <FilterChip active={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')}>
            All ({items.length})
          </FilterChip>
          <FilterChip active={statusFilter === 'ACTIVE'} onClick={() => setStatusFilter('ACTIVE')}>
            Active ({items.filter((i) => i.isActive).length})
          </FilterChip>
          <FilterChip active={statusFilter === 'INACTIVE'} onClick={() => setStatusFilter('INACTIVE')}>
            Inactive ({items.filter((i) => !i.isActive).length})
          </FilterChip>
        </div>
      </Toolbar>

      {visible.length === 0 ? (
        <EmptyState
          title={items.length === 0 ? 'No chapters found' : 'Nothing matches that'}
          blurb={
            items.length === 0
              ? 'Click + New Chapter above to add your first regional chapter to the Global Radar.'
              : 'Try a different search word.'
          }
          action={
            items.length === 0 ? (
              <Button
                tone="lime"
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                + Create first chapter
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((ch) => {
            const busy = actions.busyId === ch.id;
            return (
              <Row key={ch.id} className={cn(!ch.isActive && 'opacity-60 bg-surface-inset/50')}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center border border-line bg-cyan/15 text-2xl shadow-panel">
                      {ch.emoji || '🌐'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="truncate text-base font-extrabold text-white">{ch.name}</p>
                        <Chip tone={ch.isActive ? 'lime' : 'paper'} size="sm">
                          {ch.isActive ? 'Active on Radar' : 'Inactive'}
                        </Chip>
                        <Chip tone="cobalt" size="sm">
                          {ch.meetingCadence}
                        </Chip>
                      </div>
                      <p className="truncate text-xs text-ink-muted">
                        📍 {ch.city}, {ch.country} · Region: {ch.region}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-cyan font-bold">
                        Coordinates: {ch.latitude !== null && ch.longitude !== null ? `${ch.latitude}° N, ${ch.longitude}° W` : 'Auto-Geocoded'}
                      </p>
                    </div>
                  </div>

                  <RowActions>
                    <Button href={`/chapters/${ch.slug}`} tone="paper" size="sm">
                      View
                    </Button>
                    <Button
                      tone={ch.isActive ? 'tangerine' : 'lime'}
                      size="sm"
                      disabled={busy}
                      onClick={() => toggleActive(ch)}
                    >
                      {ch.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      tone="violet"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        setEditing(ch);
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button tone="magenta" size="sm" disabled={busy} onClick={() => remove.ask(ch.id, ch.name)}>
                      Delete
                    </Button>
                  </RowActions>
                </div>
              </Row>
            );
          })}
        </ul>
      )}

      <ChapterModal
        open={open}
        editing={editing}
        pending={actions.busyId === 'chapter-form'}
        onClose={() => setOpen(false)}
        onSave={save}
      />

      <ConfirmDelete
        target={remove.target}
        what="chapter"
        cascade="Members attached to this chapter will lose their regional chapter link."
        pending={remove.pending}
        error={remove.error}
        onClose={remove.close}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

/* ========================================================================== */
/* Shell  */
/* ========================================================================== */

export function AdminClient({
  adminEmail,
  adminUserId,
  counts,
  signups,
  members,
  events,
  opportunities,
  applications,
  sponsors,
  posts,
  resources,
  leads,
  chapters = [],
}: {
  adminEmail: string;
  adminUserId: string;
  counts: AdminCounts;
  signups: AdminSignupWeek[];
  members: AdminMember[];
  events: AdminEvent[];
  opportunities: AdminOpportunity[];
  applications: AdminApplication[];
  sponsors: AdminSponsor[];
  posts: AdminPost[];
  resources: AdminResource[];
  leads: AdminLead[];
  chapters?: AdminChapter[];
}) {
  const [tab, setTab] = useState<TabKey>('overview');

  const openLeads = leads.filter((lead) => !lead.isHandled).length;
  const pendingRequestsCount = members.filter((m) => m.status === 'PENDING').length;

  const tabCount: Record<TabKey, number | null> = {
    overview: null,
    broadcasts: null,
    scripts: null,
    requests: pendingRequestsCount,
    members: counts.members,
    events: counts.events,
    chapters: counts.chapters,
    opportunities: counts.opportunities,
    applications: counts.applications,
    partners: sponsors.length,
    insights: counts.posts,
    resources: counts.resources,
    leads: openLeads,
    media: null,
  };

  const goTo = useCallback((next: TabKey) => {
    setTab(next);
    if (typeof document !== 'undefined') {
      document.getElementById('admin-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <div>
      {/* ==================================================================
  HEADER
  ================================================================== */}
      <section className="relative overflow-hidden border-b border-line bg-surface-inset text-ink">
        <div className="absolute inset-0 mesh-dots opacity-25" aria-hidden />

        <div className="relative mx-auto max-w-container-max px-4 py-10 lg:px-10 lg:py-14">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-5 inline-flex flex-wrap items-center gap-2 border border-line-bright bg-grad-brand-soft px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink">
                Admin · {adminEmail}
              </div>

              <h1 className="text-display-lg">
                <span className="block text-ink">ADMIN</span>
                <span
                  className="block"
                  style={{ color: 'transparent', WebkitTextStroke: '2px #FBF9F4', paintOrder: 'stroke fill' }}
                >
                  CONSOLE
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-sm leading-relaxed text-ink/75 sm:text-base">
                Everything on this page writes straight to the live site. No staging copy, no draft branch, no undo.
                Read the confirm step before you click through it.
              </p>
            </div>

            <div className="w-full flex-shrink-0 lg:w-[320px]">
              <div className="border border-line-bright/30 bg-surface p-4 text-ink shadow-panel-lg">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">Right now</p>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <div className="border border-line bg-cyan/12 p-2.5">
                    <p className="font-display text-2xl leading-none">{counts.members}</p>
                    <p className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em]">Members</p>
                  </div>
                  <div className="border border-line bg-grad-brand-soft p-2.5 text-ink">
                    <p className="font-display text-2xl leading-none">{openLeads}</p>
                    <p className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em]">Open leads</p>
                  </div>
                  <div className="border border-line bg-surface p-2.5">
                    <p className="font-display text-2xl leading-none">+{counts.newMembers30}</p>
                    <p className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em]">Joined · 30d</p>
                  </div>
                  <div className="border border-line bg-surface p-2.5">
                    <p className="font-display text-2xl leading-none">{counts.registrations}</p>
                    <p className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em]">Registrations</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button href="/" tone="ink" size="sm">
                    View site ↗
                  </Button>
                  <Button href="/dashboard" tone="paper" size="sm">
                    My dashboard
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Marquee
        tone="magenta"
        speed="fast"
        items={[
          'LIVE DATABASE',
          'NO UNDO',
          'DELETES CASCADE',
          'ANSWER THE LEADS',
          'GROW THE MEMBERSHIP',
          'CHECK BEFORE YOU PUBLISH',
        ]}
      />

      {/* ==================================================================
  CONSOLE
  ================================================================== */}
      <section className="border-b border-line bg-base">
        <div className="mx-auto max-w-container-max px-4 lg:px-10">
          <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
            {/* Navigation: a scrolling tab rail on small screens, a sidebar on lg. */}
            <nav
              aria-label="Admin sections"
              className="sticky top-[71px] z-30 -mx-4 border-b border-line bg-base px-4 py-3 lg:static lg:mx-0 lg:border-b-0 lg:px-0 lg:py-8"
            >
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar lg:sticky lg:top-[95px] lg:flex-col lg:overflow-visible">
                {TABS.map((item) => {
                  const active = tab === item.key;
                  const count = tabCount[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setTab(item.key)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex flex-shrink-0 items-center gap-3 rounded-lg border-l-4 px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 lg:w-full text-left',
                        active
                          ? 'border-cyan bg-cyan/15 text-cyan font-bold shadow-sm'
                          : 'border-transparent text-ink-muted hover:bg-surface-raised hover:text-white',
                      )}
                    >
                      <span aria-hidden className="text-base shrink-0">{item.emoji}</span>
                      <span className="truncate">{item.label}</span>
                      {count !== null && (
                        <span
                          className={cn(
                            'ml-auto hidden rounded-full px-2 py-0.5 font-mono text-xs font-bold lg:inline-block',
                            active
                              ? 'bg-cyan/25 text-cyan'
                              : 'bg-surface-inset text-ink-muted border border-line',
                            item.key === 'leads' && count > 0 && !active && 'bg-magenta/20 text-magenta border border-magenta/40',
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}

                <div className="mt-4 hidden rounded-lg border border-dashed border-line p-3.5 lg:block bg-surface-inset/50">
                  <p className="font-mono text-xs font-bold uppercase tracking-wider text-cyan">
                    💡 How it works
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                    Every list searches as you type. Deleting always asks first, inside a dialog.
                  </p>
                </div>
              </div>
            </nav>

            <div id="admin-panel" className="scroll-mt-[140px] py-8 lg:py-10">
              {tab === 'overview' && (
                <OverviewPanel
                  counts={counts}
                  signups={signups}
                  members={members}
                  events={events}
                  opportunities={opportunities}
                  leads={leads}
                  posts={posts}
                  resources={resources}
                  goTo={goTo}
                />
              )}
              {tab === 'broadcasts' && <BroadcastsPanel />}
              {tab === 'scripts' && <ScriptsPanel />}
              {tab === 'requests' && <AccessRequestsPanel members={members} adminUserId={adminUserId} />}
              {tab === 'members' && <MembersPanel members={members} adminUserId={adminUserId} />}
              {tab === 'events' && <EventsPanel events={events} />}
              {tab === 'chapters' && <ChaptersPanel chapters={chapters} />}
              {tab === 'opportunities' && <OpportunitiesPanel opportunities={opportunities} />}
              {tab === 'applications' && <ApplicationsPanel applications={applications} />}
              {tab === 'partners' && <PartnersPanel sponsors={sponsors} />}
              {tab === 'insights' && <InsightsPanel posts={posts} />}
              {tab === 'resources' && <ResourcesPanel resources={resources} />}
              {tab === 'leads' && <LeadsPanel leads={leads} />}
              {tab === 'media' && <MediaDirectory />}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
