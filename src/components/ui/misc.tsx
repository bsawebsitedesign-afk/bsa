import React from 'react';
import Link from 'next/link';
import { Graph } from '@phosphor-icons/react/dist/ssr';
import { cn, percent, type Accent } from '@/lib/utils';
import { PhotoHex } from './photo';

/* -------------------------------------------------------------------------- */
/* Avatar - hexagonal, matching the mark's geometry                            */
/* -------------------------------------------------------------------------- */

export function Avatar({
  name,
  src,
  size = 'md',
  className,
  ring,
}: {
  name: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  /** Rim glow, for chapter chairs and speakers. */
  ring?: boolean;
}) {
  return <PhotoHex src={src} name={name} size={size} className={className} ring={ring} />;
}

/* -------------------------------------------------------------------------- */
/* Progress                                                                    */
/* -------------------------------------------------------------------------- */

export function ProgressMeter({
  done,
  total,
  label,
  tone = 'lime',
  showCount = true,
  className,
}: {
  done: number;
  total: number;
  label?: string;
  tone?: Accent | 'cyan';
  showCount?: boolean;
  className?: string;
}) {
  const pct = percent(done, total);
  const fills: Record<string, string> = {
    lime: 'bg-grad-brand',
    cyan: 'bg-cyan',
    magenta: 'bg-grad-brand',
    violet: 'bg-violet',
    tangerine: 'bg-amber',
    cobalt: 'bg-violet-deep',
  };

  return (
    <div className={className}>
      {(label || showCount) && (
        <div className="mb-2 flex items-baseline justify-between gap-3 text-xs">
          {label && <span className="font-medium text-ink-soft">{label}</span>}
          {showCount && (
            <span className="tabular font-mono text-ink-muted">
              {done}/{total}
            </span>
          )}
        </div>
      )}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-high"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-1000 ease-out', fills[tone] ?? fills.lime)}
          style={{ width: `${done > 0 ? Math.max(pct, 3) : 0}%` }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Section header                                                              */
/* -------------------------------------------------------------------------- */

export function SectionHead({
  kicker,
  title,
  blurb,
  action,
  tone,
  align = 'left',
  className,
}: {
  kicker?: string;
  title: React.ReactNode;
  blurb?: string;
  action?: React.ReactNode;
  /** Colour of the kicker node. */
  tone?: Accent | 'ink' | 'paper';
  align?: 'left' | 'center';
  className?: string;
}) {
  const kickerTint: Record<string, string> = {
    lime: 'text-cyan',
    magenta: 'text-cyan-bright',
    violet: 'text-violet-bright',
    tangerine: 'text-amber',
    cobalt: 'text-violet-bright',
    ink: 'text-ink-muted',
    paper: 'text-ink-soft',
  };

  return (
    <div
      className={cn(
        'mb-12 flex flex-col gap-6',
        align === 'left' ? 'md:flex-row md:items-end md:justify-between' : 'items-center text-center',
        className,
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {kicker && <span className={cn('kicker mb-4', tone && kickerTint[tone])}>{kicker}</span>}
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase tracking-tight text-ink leading-tight">
          {title}
        </h2>
        {blurb && <p className="mt-4 text-body-lg leading-relaxed text-ink-soft">{blurb}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stat tile                                                                   */
/* -------------------------------------------------------------------------- */

export function Stat({
  value,
  label,
  hint,
  tone = 'paper',
  className,
}: {
  value: React.ReactNode;
  label: string;
  hint?: string;
  tone?: Accent | 'ink' | 'paper' | 'bone';
  className?: string;
}) {
  const tints: Record<string, string> = {
    lime: 'text-cyan',
    magenta: 'text-gradient',
    violet: 'text-violet-bright',
    tangerine: 'text-amber',
    cobalt: 'text-violet-bright',
    ink: 'text-ink',
    paper: 'text-ink',
    bone: 'text-ink',
  };

  return (
    <div className={cn('panel group/stat relative overflow-hidden p-5', className)}>
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-cyan/5 opacity-0 blur-xl transition-opacity duration-500 group-hover/stat:opacity-100"
      />
      <div
        className={cn('tabular font-display text-3xl font-bold leading-none sm:text-4xl', tints[tone] ?? tints.paper)}
      >
        {value}
      </div>
      <div className="mt-2.5 text-sm font-medium text-ink-soft">{label}</div>
      {hint && <div className="mt-1 text-xs text-ink-muted">{hint}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sticker - a small pinned annotation                                         */
/* -------------------------------------------------------------------------- */

/**
 * Retained from the previous system. Here it is a hairline tag rather than a
 * pasted label, and `rotate` is honoured but damped - a whole degree of tilt
 * reads as a mistake against a strict grid.
 */
export function Sticker({
  children,
  tone = 'lime',
  rotate = -3,
  className,
}: {
  children: React.ReactNode;
  tone?: Accent | 'ink' | 'paper';
  rotate?: number;
  className?: string;
}) {
  const tints: Record<string, string> = {
    lime: 'border-cyan/60 bg-cyan/20 text-white shadow-[3px_3px_0px_#2e5274]',
    magenta: 'border-violet/60 bg-violet/25 text-white shadow-[3px_3px_0px_#5286b8]',
    violet: 'border-violet/60 bg-violet/25 text-white shadow-[3px_3px_0px_#2e5274]',
    tangerine: 'border-amber/60 bg-amber/20 text-amber shadow-[3px_3px_0px_#0f1318]',
    cobalt: 'border-cyan/60 bg-cyan/20 text-white shadow-[3px_3px_0px_#0f1318]',
    ink: 'border-white/30 bg-surface-high text-white shadow-[3px_3px_0px_#0f1318]',
    paper: 'border-white/30 bg-surface-raised text-white shadow-[3px_3px_0px_#0f1318]',
  };

  return (
    <span
      style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined }}
      className={cn(
        'inline-block rounded-xl border-2 px-3 py-1.5 font-mono text-[0.75rem] font-extrabold uppercase tracking-[0.16em] backdrop-blur-md transition-transform duration-200 hover:scale-105 shadow-panel',
        tints[tone] ?? tints.lime,
        className,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty state                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Shown wherever a collection is empty.
 *
 * This is a first-class screen, not a fallback: on a production install with no
 * content yet it is the *first* thing several pages render, so it has to say
 * what belongs here and route the right person to where they can add it.
 */
export function EmptyState({
  emoji,
  title,
  blurb,
  action,
  secondaryAction,
  icon,
  className,
}: {
  /** Retained from the previous system; rendered inside the hex tile. */
  emoji?: string;
  title: string;
  blurb: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-line-bright bg-surface/40 px-6 py-16 text-center',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 mesh-dots opacity-40" aria-hidden />
      <div className="relative">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center bg-cyan/10 text-lg text-cyan hex-clip">
          {icon ?? emoji ?? <Graph weight="bold" className="h-6 w-6" />}
        </span>
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">{blurb}</p>
        {(action || secondaryAction) && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {action}
            {secondaryAction}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Breadcrumbs                                                                 */
/* -------------------------------------------------------------------------- */

export function Breadcrumbs({
  trail,
  className,
}: {
  trail: Array<{ label: string; href?: string }>;
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex flex-wrap items-center gap-2 text-xs text-ink-muted', className)}>
      {trail.map((crumb, i) => (
        <React.Fragment key={`${crumb.label}-${i}`}>
          {i > 0 && (
            <span aria-hidden className="text-line-bright">
              /
            </span>
          )}
          {crumb.href && i < trail.length - 1 ? (
            <Link href={crumb.href} className="transition-colors hover:text-cyan">
              {crumb.label}
            </Link>
          ) : (
            <span
              className={i === trail.length - 1 ? 'text-ink-soft' : undefined}
              aria-current={i === trail.length - 1 ? 'page' : undefined}
            >
              {crumb.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
