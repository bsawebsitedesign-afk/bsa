'use client';

import React, { useEffect, useRef, useState } from 'react';
import { animate, motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * The two hero parts that need the client: a decode-in label and the
 * instrument-panel figure strip.
 *
 * Both write to a DOM ref through Motion's `animate`, never to React state on a
 * frame loop. A per-frame `setState` re-renders the whole tree and collapses on
 * mobile. Both degrade to plain static markup under `prefers-reduced-motion`,
 * and both render their settled value on the server so the content is never
 * only in the animation.
 */

/**
 * The copy column of the pinned hero.
 *
 * The section stays pinned while the lattice comes apart, so the type has to
 * clear out of the way rather than sit there for two screens: it drifts up and
 * releases as the reader scrolls through the runway.
 */
export function HeroCopy({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // Measured against the stage, not against this element.
  //
  // This div lives inside the pinned wrapper, so its own box never moves
  // relative to the viewport while the hero is on screen - a `useScroll` keyed
  // to it reported zero progress for the whole runway and the copy simply sat
  // there through the entire recede. The runway belongs to the section, so
  // that is what gets measured, and the page's own scroll drives it.
  const { scrollY } = useScroll();
  // Until the stage has been measured the range is far enough away that
  // nothing moves; there is no frame where the copy is wrongly faded.
  const [range, setRange] = useState<[number, number]>([0, 1e6]);

  useEffect(() => {
    const stage = ref.current?.closest('[data-hero-stage]') as HTMLElement | null;
    if (!stage) return;

    const measure = () => {
      // Below lg the stage is not pinned, so there is no runway: the hero
      // scrolls away on its own and clearing the copy on the way past just
      // leaves a blank screen behind it. Park the range out of reach - the
      // same sentinel the pre-measurement state uses - and nothing moves.
      if (window.innerWidth < 1024) return setRange([0, 1e6]);

      const top = stage.getBoundingClientRect().top + window.scrollY;
      const runway = Math.max(1, stage.offsetHeight - window.innerHeight);
      setRange([top, top + runway]);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const [from, to] = range;
  const y = useTransform(scrollY, [from, to], ['0%', '-22%']);
  // Holds, then clears - the same shape as the medallion's own fade, so the
  // two halves of the hero leave together instead of one outstaying the other.
  const opacity = useTransform(scrollY, [from, from + (to - from) * 0.5, from + (to - from) * 0.88], [1, 1, 0]);

  if (reduced) {
    return (
      <div ref={ref} className={cn('relative', className)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div ref={ref} style={{ y, opacity }} className={cn('relative', className)}>
      {children}
    </motion.div>
  );
}

/**
 * The figures, as an instrument strip rather than a row of boxes.
 *
 * A ruled baseline with tick marks and tabular figures above it. Reads as a
 * readout off a system, which is what these numbers are.
 */
export function FigureStrip({
  items,
  className,
}: {
  items: Array<{ value: number; label: string; suffix?: string }>;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDListElement>(null);
  const cells = useRef<Array<HTMLElement | null>>([]);
  const inView = useInView(ref, { once: true, amount: 0.5 });

  useEffect(() => {
    if (reduced || !inView) return;

    const controls = items.map((item, i) =>
      animate(0, item.value, {
        duration: 1.1,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: (value) => {
          const node = cells.current[i];
          if (node) node.textContent = Math.round(value).toLocaleString();
        },
      }),
    );

    return () => controls.forEach((c) => c.stop());
  }, [items, inView, reduced]);

  return (
    <dl ref={ref} className={cn('relative flex flex-wrap items-end gap-x-10 gap-y-6 pt-6', className)}>
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan/40 via-line to-transparent"
      />

      {items.map((item, i) => (
        // Five figures wrap to three rows on a phone and push the foot of the
        // hero past the fold. The first three carry the argument; the rest are
        // in the section below anyway.
        <div key={item.label} className={cn('relative', i > 2 && 'hidden sm:block')}>
          <span aria-hidden className="absolute -top-6 left-0 h-2 w-px bg-cyan/50" />
          <dd className="tabular font-display text-3xl font-bold leading-none text-ink sm:text-4xl">
            <span
              ref={(node) => {
                cells.current[i] = node;
              }}
            >
              {item.value.toLocaleString()}
            </span>
            {item.suffix && <span className="text-cyan">{item.suffix}</span>}
          </dd>
          <dt className="mt-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-muted">{item.label}</dt>
        </div>
      ))}
    </dl>
  );
}
