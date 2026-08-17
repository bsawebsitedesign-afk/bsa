'use client';

import React, { useRef } from 'react';
import { motion, useInView, useReducedMotion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Entrance animation.
 *
 * Everything on the site arrives the same way: it rises and fades as it crosses
 * into view, once, and then stays put. Groups stagger their children from a
 * single observer rather than one per card, so a 40-item grid costs one.
 *
 * Under `prefers-reduced-motion` every component here renders a plain element
 * with no animation at all - the page is complete on first paint.
 */

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

const OFFSET: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 28 },
  down: { x: 0, y: -28 },
  left: { x: 34, y: 0 },
  right: { x: -34, y: 0 },
  none: { x: 0, y: 0 },
};

const EASE = [0.16, 1, 0.3, 1] as const;

export function Reveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.6,
  className,
  as = 'div',
}: {
  children: React.ReactNode;
  direction?: Direction;
  delay?: number;
  duration?: number;
  className?: string;
  as?: 'div' | 'span' | 'li' | 'section';
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  const Tag = as === 'span' ? motion.span : as === 'li' ? motion.li : as === 'section' ? motion.section : motion.div;
  const from = OFFSET[direction];

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, x: from.x, y: from.y, scale: 0.96 }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.05 }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </Tag>
  );
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  shown: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE } },
};

export function RevealGroup({
  children,
  className,
  stagger = 0.07,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: stagger, delayChildren: 0.05 } } }}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.05 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A rule that engraves itself across as the section arrives: the shadowed cut
 * first, then the lit lip chasing it. Used to separate movements on a long
 * page, where a static border would just be another line.
 */
export function EngraveRule({ className, delay = 0 }: { className?: string; delay?: number }) {
  const reduced = useReducedMotion();

  if (reduced) return <span aria-hidden className={cn('block h-px w-full bg-line', className)} />;

  return (
    <span aria-hidden className={cn('relative block h-px w-full overflow-visible', className)}>
      <motion.span
        className="absolute inset-0 block origin-left bg-[rgb(var(--ink)/0.14)]"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.9, delay, ease: EASE }}
      />
      <motion.span
        className="absolute inset-x-0 top-px block h-px origin-left bg-[rgb(var(--bevel-light)/0.5)]"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.9, delay: delay + 0.08, ease: EASE }}
      />
    </span>
  );
}

export function RevealItem({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}

/**
 * Reveals a headline word by word, each word riding up out of its own clipping
 * box.
 *
 * The observer watches the *clipping wrapper*, not the word inside it. The word
 * starts translated fully below that wrapper, so `overflow: hidden` clips it
 * out of the rendered box entirely, and an IntersectionObserver placed on the
 * word itself would report it as never intersecting - the animation could then
 * never start, and the headline would stay invisible forever. Observing the
 * wrapper breaks that deadlock.
 */
export function RevealWords({
  text,
  className,
  wordClassName,
  delay = 0,
  step = 0.055,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
  step?: number;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const words = text.split(' ');

  if (reduced) return <span className={className}>{text}</span>;

  return (
    <span ref={ref} className={className}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block overflow-hidden align-bottom">
          <motion.span
            className={`inline-block ${wordClassName ?? ''}`}
            initial={{ y: '110%' }}
            animate={inView ? { y: '0%' } : { y: '110%' }}
            transition={{ duration: 0.7, delay: delay + i * step, ease: EASE }}
          >
            {word}
            {i < words.length - 1 ? '\u00A0' : ''}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/** Wipes content in from the bottom edge. Used for photography and figures. */
export function ClipReveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ clipPath: 'inset(0 0 100% 0)', opacity: 0 }}
      whileInView={{ clipPath: 'inset(0 0 0% 0)', opacity: 1 }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 0.95, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Draws a hairline rule out from its origin as it enters view. */
export function RevealRule({ className, delay = 0 }: { className?: string; delay?: number }) {
  const reduced = useReducedMotion();

  if (reduced) return <span className={`block h-px w-full bg-line ${className ?? ''}`} />;

  return (
    <motion.span
      className={`block h-px w-full origin-left bg-gradient-to-r from-cyan/60 via-line to-transparent ${className ?? ''}`}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 1, delay, ease: EASE }}
    />
  );
}
