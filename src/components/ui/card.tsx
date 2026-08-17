import React from 'react';
import Link from 'next/link';
import { cn, type Accent } from '@/lib/utils';

/**
 * Surfaces.
 *
 * Elevation on a dark plate is a hairline border, an inner top highlight and
 * depth of shadow - plus a cyan rim when the surface is interactive. No heavy
 * fills, so text contrast is identical at every level.
 *
 * `tilt` is retained from the previous system as a small, stable offset used to
 * break up long grids. It rotates by a fraction of a degree and straightens on
 * hover; it is never applied to anything read at length.
 */

export type CardTilt = 0 | 1 | 2 | 3;

const tilts: Record<CardTilt, string> = {
  0: '',
  1: 'sm:-rotate-[0.35deg] hover:rotate-0',
  2: 'sm:rotate-[0.35deg] hover:rotate-0',
  3: 'sm:-rotate-[0.7deg] hover:rotate-0',
};

export function Card({
  children,
  className,
  href,
  tilt = 0,
  tone = 'paper',
  interactive,
  featured,
  as = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
  tilt?: CardTilt;
  /** `ink` recesses the card into the plate; `featured` gives it a gradient rim. */
  tone?: 'paper' | 'bone' | 'sand' | 'ink';
  interactive?: boolean;
  featured?: boolean;
  as?: 'div' | 'article' | 'li';
}) {
  const fills = {
    paper: 'glass-card-executive rounded-2xl',
    bone: 'glass-card-executive rounded-2xl',
    sand: 'glass-card-executive rounded-2xl border border-white/20',
    ink: 'glass-morphism rounded-2xl border border-white/20',
  };

  const classes = cn(
    featured ? 'panel-brand shadow-panel-lg' : fills[tone],
    (interactive || href) && 'panel-hover',
    href && 'block',
    tilts[tilt],
    'transition-transform duration-300',
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  const Tag = as;
  return <Tag className={classes}>{children}</Tag>;
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-5 sm:p-6', className)}>{children}</div>;
}

/**
 * The card's header strip: a hairline-separated row carrying the category, the
 * status or the count, with a short accent bar at the leading edge - the same
 * node-and-edge language as the mark.
 */
export function CardBar({
  children,
  tone = 'ink',
  className,
}: {
  children: React.ReactNode;
  tone?: Accent | 'ink' | 'paper' | 'sand';
  className?: string;
}) {
  const bars: Record<string, string> = {
    lime: 'before:bg-cyan text-cyan-bright font-black',
    magenta: 'before:bg-cyan text-cyan-bright font-black',
    violet: 'before:bg-violet text-violet-bright font-black',
    tangerine: 'before:bg-amber text-amber font-black',
    cobalt: 'before:bg-cyan text-cyan-bright font-black',
    ink: 'before:bg-line-bright text-white font-extrabold',
    paper: 'before:bg-cyan text-white font-extrabold',
    sand: 'before:bg-line-bright text-white font-extrabold',
  };

  return (
    <div
      className={cn(
        'relative flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.16em] sm:px-6',
        'before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[4px] before:-translate-y-1/2 before:rounded-r',
        bars[tone] ?? bars.ink,
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A card with a hexagonal icon tile, borrowed from the mark. */
export function FeatureCard({
  icon,
  title,
  body,
  href,
  accent = 'cyan',
  className,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  href?: string;
  accent?: 'cyan' | 'violet' | 'emerald' | 'amber';
  className?: string;
}) {
  const tint = {
    cyan: 'text-cyan bg-cyan/10 border-cyan/30',
    violet: 'text-violet-bright bg-violet/10 border-violet/30',
    emerald: 'text-emerald bg-emerald/10 border-emerald/30',
    amber: 'text-amber bg-amber/10 border-amber/30',
  }[accent];

  const inner = (
    <CardBody className="flex h-full flex-col p-6">
      <span
        className={cn(
          'mb-5 inline-flex h-12 w-12 items-center justify-center border shadow-panel transition-shadow duration-500 hex-clip',
          tint,
        )}
      >
        {icon}
      </span>
      <h3 className="text-xl font-black uppercase tracking-tight text-white leading-snug drop-shadow-sm transition-colors group-hover:text-cyan">{title}</h3>
      <p className="mt-2.5 flex-1 text-xs sm:text-sm font-semibold leading-relaxed text-white/85">{body}</p>
      {href && (
        <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-cyan transition-transform duration-300 group-hover:translate-x-1">
          Explore <span aria-hidden>→</span>
        </span>
      )}
    </CardBody>
  );

  if (href) {
    return (
      <Link href={href} className={cn('panel panel-hover group block h-full', className)}>
        {inner}
      </Link>
    );
  }
  return <div className={cn('panel group h-full', className)}>{inner}</div>;
}
