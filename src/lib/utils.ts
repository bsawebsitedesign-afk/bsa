import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 70);
}

/** Parses a JSON string column, always returning an array. */
export function parseList(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

export function formatDate(date: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...opts,
  });
}

export function formatDay(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', { day: '2-digit' });
}

export function formatMonth(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}

/** "in 12 days" / "3 days ago" - used on event cards and the feed. */
export function relativeTime(date: Date | string): string {
  const target = new Date(date).getTime();
  const diffMs = target - Date.now();
  const diffDays = Math.round(diffMs / 86_400_000);

  if (Math.abs(diffDays) < 1) {
    const diffHours = Math.round(diffMs / 3_600_000);
    if (Math.abs(diffHours) < 1) return 'right now';
    return diffHours > 0 ? `in ${diffHours}h` : `${Math.abs(diffHours)}h ago`;
  }
  if (diffDays > 0) return diffDays === 1 ? 'tomorrow' : `in ${diffDays} days`;
  return diffDays === -1 ? 'yesterday' : `${Math.abs(diffDays)} days ago`;
}

/** Deterministic accent picker so a given name always gets the same colour. */
const ACCENTS = ['lime', 'magenta', 'violet', 'tangerine', 'cobalt'] as const;
export type Accent = (typeof ACCENTS)[number];

export function accentFor(seed: string): Accent {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return ACCENTS[hash % ACCENTS.length];
}

/**
 * Accent names are semantic slots kept stable across design revisions - the
 * values behind them belong to the current palette, taken from the logo.
 * `bg` is a tinted wash rather than a solid, because a saturated fill on the
 * dark plate fights the text next to it.
 */
export const accentClasses: Record<Accent, { bg: string; text: string; border: string; shadow: string; ring: string }> =
  {
    lime: {
      bg: 'bg-cyan/10',
      text: 'text-cyan',
      border: 'border-cyan/35',
      shadow: 'shadow-panel',
      ring: 'bg-cyan',
    },
    magenta: {
      bg: 'bg-grad-brand-soft',
      text: 'text-cyan-bright',
      border: 'border-violet/40',
      shadow: 'shadow-panel',
      ring: 'bg-grad-brand',
    },
    violet: {
      bg: 'bg-violet/12',
      text: 'text-violet-bright',
      border: 'border-violet/40',
      shadow: 'shadow-panel',
      ring: 'bg-violet',
    },
    tangerine: {
      bg: 'bg-amber/10',
      text: 'text-amber',
      border: 'border-amber/35',
      shadow: 'shadow-panel',
      ring: 'bg-amber',
    },
    cobalt: {
      bg: 'bg-violet-deep/15',
      text: 'text-violet-bright',
      border: 'border-violet-deep/50',
      shadow: 'shadow-panel',
      ring: 'bg-violet-deep',
    },
  };

/** Percentage helper for completion meters (resources, profile completeness). */
export function percent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}
