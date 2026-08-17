import React from 'react';
import { cn, type Accent } from '@/lib/utils';

/**
 * Labels.
 *
 * On a dark plate a solid fill fights the text around it, so a chip is a tinted
 * wash inside a hairline of the same hue - legible, and quiet enough to sit
 * three-to-a-row without shouting.
 */

export type ChipTone = Accent | 'ink' | 'paper' | 'sand';

const tones: Record<ChipTone, string> = {
  lime: 'border-cyan/50 bg-cyan/15 text-cyan-bright font-semibold',
  magenta: 'border-violet/50 bg-violet/15 text-violet-bright font-semibold',
  violet: 'border-violet/50 bg-violet/15 text-violet-bright font-semibold',
  tangerine: 'border-amber/50 bg-amber/15 text-amber font-semibold',
  cobalt: 'border-cyan/50 bg-cyan/15 text-cyan-bright font-semibold',
  ink: 'border-line-bright bg-surface-raised text-ink font-semibold',
  paper: 'border-line-bright bg-surface-high text-ink font-semibold',
  sand: 'border-line bg-surface-raised text-ink font-semibold',
};

export function Chip({
  children,
  tone = 'paper',
  size = 'md',
  className,
  dot,
}: {
  children: React.ReactNode;
  tone?: ChipTone;
  size?: 'sm' | 'md';
  className?: string;
  /** Leading node, in the chip's own colour. */
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        tones[tone] ?? tones.paper,
        className,
      )}
    >
      {dot && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/**
 * Live indicator: a node with a ring firing off it. The ring is decoration -
 * the state is always written next to it, so nothing depends on the animation.
 */
export function LiveDot({
  tone = 'lime',
  className,
}: {
  tone?: 'lime' | 'magenta' | 'violet' | 'cyan' | 'rose';
  className?: string;
}) {
  const colour = {
    lime: 'bg-cyan',
    cyan: 'bg-cyan',
    magenta: 'bg-rose',
    rose: 'bg-rose',
    violet: 'bg-violet',
  }[tone];

  return (
    <span aria-hidden className={cn('relative inline-flex h-2 w-2 flex-shrink-0', className)}>
      <span className={cn('absolute inset-0 rounded-full opacity-70 animate-ring-expand', colour)} />
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', colour)} />
    </span>
  );
}

/** Uppercase section label with a leading node. */
export function Kicker({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('kicker', className)}>{children}</span>;
}

/* -------------------------------------------------------------------------- */
/* Taxonomy  */
/* -------------------------------------------------------------------------- */

/**
 * One glyph per taxonomy value, used wherever that value appears so a category
 * is recognisable before the label is read.
 */
const EMOJI: Record<string, string> = {
  CONFERENCE: '🏛️',
  SUMMIT: '⚡',
  WORKSHOP: '🛠️',
  ROUNDTABLE: '💬',
  WEBINAR: '💻',
  NETWORKING: '🤝',
  ROLE: '💼',
  PARTNERSHIP: '🤝',
  RFP: '📑',
  SPEAKING: '🎙️',
  BOARD_POSITION: '🏛️',
  FOUNDATION: '🛡️',
  PRACTITIONER: '🎓',
  EXECUTIVE: '👑',
  PROFESSIONAL: '💼',
  LEADER: '👑',
  CONSULTANT: '🔍',
  VENDOR: '🏬',
  ORGANISATION: '🏢',
  REMOTE: '🌐',
  HYBRID: '🔀',
  ONSITE: '📍',
  IN_PERSON: '📍',
  VIRTUAL: '💻',
};

export function categoryEmoji(value: string): string {
  return EMOJI[value?.toUpperCase?.() ?? ''] ?? '✦';
}

const LABELS: Record<string, string> = {
  CONFERENCE: 'Conference',
  WORKSHOP: 'Workshop',
  ROUNDTABLE: 'Roundtable',
  WEBINAR: 'Webinar',
  NETWORKING: 'Networking',
  SUMMIT: 'Summit',
  ROLE: 'Senior role',
  PARTNERSHIP: 'Partnership',
  RFP: 'Tender',
  SPEAKING: 'Speaking call',
  BOARD_POSITION: 'Board appointment',
  PROFESSIONAL: 'Professional',
  LEADER: 'Leader',
  CONSULTANT: 'Consultant',
  VENDOR: 'Vendor',
  ORGANISATION: 'Organisation',
  FOUNDATION: 'Foundation',
  PRACTITIONER: 'Practitioner',
  EXECUTIVE: 'Executive',
};

const TONE_MAP: Record<string, ChipTone> = {
  CONFERENCE: 'lime',
  SUMMIT: 'violet',
  WORKSHOP: 'lime',
  ROUNDTABLE: 'tangerine',
  WEBINAR: 'lime',
  NETWORKING: 'violet',
  ROLE: 'lime',
  PARTNERSHIP: 'violet',
  RFP: 'tangerine',
  SPEAKING: 'lime',
  BOARD_POSITION: 'cobalt',
  PROFESSIONAL: 'lime',
  LEADER: 'violet',
  CONSULTANT: 'lime',
  VENDOR: 'tangerine',
  ORGANISATION: 'ink',
  FOUNDATION: 'lime',
  PRACTITIONER: 'violet',
  EXECUTIVE: 'tangerine',
};

/** Human label for any enum value the schema stores. */
export function labelFor(value: string): string {
  return (
    LABELS[value] ??
    value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/^./, (c) => c.toUpperCase())
  );
}

export function toneFor(value: string): ChipTone {
  return TONE_MAP[value] ?? 'ink';
}

/** Chip that labels and colours an enum value consistently site-wide. */
export function TypeChip({ value, size = 'md', className }: { value: string; size?: 'sm' | 'md'; className?: string }) {
  return (
    <Chip tone={toneFor(value)} size={size} className={className} dot>
      {labelFor(value)}
    </Chip>
  );
}
