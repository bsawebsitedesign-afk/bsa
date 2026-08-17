'use client';

import React, { useEffect, useRef } from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';

/**
 * Counts a number up when it first scrolls into view.
 *
 * The settled figure is rendered on the server, so the correct number is present
 * without JavaScript and for anyone who has asked for reduced motion. The count
 * is decoration layered on top.
 *
 * The tween writes `textContent` on a ref rather than setting React state each
 * frame: a per-frame `setState` re-renders the tree sixty times a second and
 * collapses on mobile.
 */
export function Counter({
  to,
  suffix,
  prefix,
  duration = 0.9,
  className,
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  /** Seconds. */
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.4 });

  useEffect(() => {
    const node = ref.current;
    if (!node || reduced || !inView || to <= 0) return;

    const controls = animate(0, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (value) => {
        node.textContent = `${prefix ?? ''}${Math.round(value).toLocaleString()}${suffix ?? ''}`;
      },
    });

    return () => controls.stop();
  }, [inView, to, duration, reduced, prefix, suffix]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {to.toLocaleString()}
      {suffix}
    </span>
  );
}
