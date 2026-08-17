'use client';

import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform, useMotionValueEvent } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Scroll-linked motion.
 *
 * These read the scroll position rather than firing on a threshold, so the
 * movement is tied to the reader's hand - scrub back and it scrubs back. All of
 * it is decorative: under `prefers-reduced-motion` each component degrades to a
 * plain wrapper and the page loses nothing but the movement.
 */

/** Publishes document scroll progress to `--scroll-progress` for the header rail. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, { stiffness: 220, damping: 40, restDelta: 0.001 });

  useMotionValueEvent(smooth, 'change', (v) => {
    document.documentElement.style.setProperty('--scroll-progress', String(v));
  });

  return (
    <motion.span
      aria-hidden
      style={{ scaleX: smooth }}
      className="absolute inset-x-0 bottom-0 h-px origin-left bg-grad-brand"
    />
  );
}

/**
 * Moves its children against the scroll. `speed` is the fraction of the
 * element's travel to offset by - 0.2 is subtle, 0.6 is pronounced.
 */
export function Parallax({
  children,
  speed = 0.25,
  className,
}: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [`${speed * 100}%`, `${-speed * 100}%`]);

  if (reduced) return <div className={cn('relative', className)}>{children}</div>;

  return (
    <div ref={ref} className={cn('relative', className)}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}

/** Scales and fades content as it passes through the viewport. */
export function ScrollScale({
  children,
  className,
  from = 0.92,
}: {
  children: React.ReactNode;
  className?: string;
  from?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.95', 'start 0.45'] });
  const scale = useTransform(scrollYProgress, [0, 1], [from, 1]);
  const opacity = useTransform(scrollYProgress, [0, 1], [0.35, 1]);

  if (reduced) return <div className={cn('relative', className)}>{children}</div>;

  return (
    <div ref={ref} className={cn('relative', className)}>
      <motion.div style={{ scale, opacity }}>{children}</motion.div>
    </div>
  );
}

/**
 * A vertical rail that fills as the section scrolls past, with a node riding
 * the leading edge. Used to bind step sequences together.
 */
export function ScrollRail({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.4'] });
  const smooth = useSpring(scrollYProgress, { stiffness: 180, damping: 36, restDelta: 0.001 });
  const nodeTop = useTransform(smooth, (v) => `${v * 100}%`);

  return (
    <div ref={ref} aria-hidden className={cn('absolute inset-y-0 w-px bg-line', className)}>
      {!reduced && (
        <>
          <motion.span style={{ scaleY: smooth }} className="block h-full w-px origin-top bg-grad-brand" />
          <motion.span style={{ top: nodeTop }} className="absolute -left-[3px] h-[7px] w-[7px] rounded-full bg-cyan" />
        </>
      )}
    </div>
  );
}

/**
 * Drives a horizontal track from vertical scroll while the section is pinned.
 * Falls back to a normal swipeable row when motion is reduced or on touch.
 */
export function HorizontalScroll({
  children,
  className,
  trackClassName,
}: {
  children: React.ReactNode;
  className?: string;
  trackClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const x = useTransform(scrollYProgress, [0, 1], ['0%', '-62%']);

  if (reduced) {
    return (
      <div className={cn('no-scrollbar overflow-x-auto', className)}>
        <div className={cn('flex gap-5', trackClassName)}>{children}</div>
      </div>
    );
  }

  return (
    <div ref={ref} className={cn('relative h-[240dvh]', className)}>
      <div className="sticky top-0 flex min-h-[100dvh] items-center overflow-hidden">
        <motion.div style={{ x }} className={cn('flex gap-5 px-5 lg:px-8', trackClassName)}>
          {children}
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Tilts toward the pointer. Pure decoration on top of a normal card - the card
 * is fully usable without it, and it is disabled entirely for reduced motion.
 */
export function TiltCard({
  children,
  className,
  strength = 8,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    node.style.transform = `perspective(900px) rotateX(${-py * strength}deg) rotateY(${px * strength}deg)`;
    node.style.setProperty('--mx', `${(px + 0.5) * 100}%`);
    node.style.setProperty('--my', `${(py + 0.5) * 100}%`);
  };

  const reset = () => {
    const node = ref.current;
    if (node) node.style.transform = '';
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={cn('transition-transform duration-300 ease-out will-change-transform', className)}
    >
      {children}
    </div>
  );
}

/** Pulls slightly toward the cursor. For the one primary action per view. */
export function Magnetic({
  children,
  className,
  strength = 0.28,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  if (reduced) return <span className={className}>{children}</span>;

  const onMove = (e: React.MouseEvent<HTMLSpanElement>) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    node.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
  };

  const reset = () => {
    const node = ref.current;
    if (node) node.style.transform = '';
  };

  return (
    <span
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={cn('inline-block transition-transform duration-300 ease-out will-change-transform', className)}
    >
      {children}
    </span>
  );
}

/** A soft cyan pool that follows the pointer across a section. */
export function Spotlight({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  if (reduced) return null;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty('--sx', `${e.clientX - rect.left}px`);
    node.style.setProperty('--sy', `${e.clientY - rect.top}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      aria-hidden
      className={cn('pointer-events-none absolute inset-0', className)}
      style={{
        background:
          'radial-gradient(360px circle at var(--sx, 50%) var(--sy, 0%), rgba(34,217,240,0.10), transparent 70%)',
      }}
    />
  );
}
