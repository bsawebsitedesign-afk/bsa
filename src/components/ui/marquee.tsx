import React from 'react';
import { cn, type Accent } from '@/lib/utils';

/**
 * The ticker strip between sections.
 *
 * The list is duplicated once and the track translates by exactly -50%, so the
 * loop is seamless without measuring anything. It is `aria-hidden`: every value
 * shown here is already stated in the section it introduces, so nothing is lost
 * to a screen reader - and under reduced motion the strip simply sits still.
 */
export function Marquee({
  items,
  tone = 'ink',
  speed = 'normal',
  separator = '✦',
  className,
}: {
  items: string[];
  tone?: Accent | 'ink' | 'paper' | 'sand';
  speed?: 'slow' | 'normal' | 'fast';
  separator?: string;
  className?: string;
}) {
  if (items.length === 0) return null;

  const tones: Record<string, string> = {
    ink: 'border-y border-line bg-surface/50 text-ink-muted',
    paper: 'border-y border-line bg-surface-raised text-ink-soft',
    sand: 'border-y border-line-soft bg-surface-inset text-ink-muted',
    lime: 'border-y border-cyan/25 bg-cyan/[0.06] text-cyan',
    magenta: 'border-y border-violet/25 bg-grad-brand-soft text-cyan-bright',
    violet: 'border-y border-violet/25 bg-violet/[0.08] text-violet-bright',
    tangerine: 'border-y border-amber/25 bg-amber/[0.07] text-amber',
    cobalt: 'border-y border-violet-deep/30 bg-violet-deep/10 text-violet-bright',
  };

  const speeds = {
    slow: '[animation-duration:62s]',
    normal: '',
    fast: '[animation-duration:24s]',
  };

  // Repeat short lists so the track always overflows the viewport.
  const filled = items.length >= 6 ? items : Array.from({ length: Math.ceil(6 / items.length) }, () => items).flat();

  return (
    <div aria-hidden className={cn('overflow-hidden py-3', tones[tone] ?? tones.ink, className)}>
      <div className="edge-mask flex">
        <div className={cn('flex flex-shrink-0 animate-marquee items-center', speeds[speed])}>
          {[0, 1].map((copy) => (
            <div key={copy} className="flex flex-shrink-0 items-center">
              {filled.map((item, i) => (
                <span
                  key={`${copy}-${item}-${i}`}
                  className="flex flex-shrink-0 items-center whitespace-nowrap font-mono text-[0.6875rem] font-medium uppercase tracking-[0.24em]"
                >
                  {item}
                  <span className="mx-6 opacity-40">{separator}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
