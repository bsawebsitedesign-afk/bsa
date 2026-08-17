import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Photography.
 *
 * Every image slot on the site is a fixed-aspect frame, so a missing, slow or
 * broken photo never shifts the layout. When there is no photo, the frame is
 * filled with a deterministic node-lattice drawn from the record's own id -
 * the same record always gets the same figure. It is never a stock photograph
 * of a person who has nothing to do with BSA.
 */

const RATIOS = {
  square: 'aspect-square',
  portrait: 'aspect-[3/4]',
  photo: 'aspect-[4/3]',
  wide: 'aspect-[16/9]',
  ultra: 'aspect-[21/9]',
  banner: 'aspect-[3/1]',
};

export type PhotoRatio = keyof typeof RATIOS;

/** Request the placeholder at the frame's own aspect, not a square crop. */
const PIXELS: Record<PhotoRatio, [number, number]> = {
  square: [800, 800],
  portrait: [720, 960],
  photo: [960, 720],
  wide: [1280, 720],
  ultra: [1680, 720],
  banner: [1680, 560],
};

/** Stable 32-bit hash, so a seed always produces the same figure. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * A generated lattice: nodes joined by edges, in the brand gradient. Rendered
 * as inline SVG so it costs no request and works with the CSP.
 */
export function LatticeArt({ seed, className, density = 9 }: { seed: string; className?: string; density?: number }) {
  let state = hash(seed) || 1;
  const rand = () => {
    // xorshift - deterministic, and good enough for point scatter.
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 10000) / 10000;
  };

  const nodes = Array.from({ length: density }, () => ({
    x: 8 + rand() * 84,
    y: 8 + rand() * 84,
    r: 1.1 + rand() * 2.2,
  }));

  // Join each node to its two nearest neighbours - enough to read as a mesh
  // without becoming a scribble.
  const edges: Array<[number, number]> = [];
  nodes.forEach((a, i) => {
    const near = nodes
      .map((b, j) => ({ j, d: (a.x - b.x) ** 2 + (a.y - b.y) ** 2 }))
      .filter((n) => n.j !== i)
      .sort((p, q) => p.d - q.d)
      .slice(0, 2);
    near.forEach((n) => {
      const key: [number, number] = i < n.j ? [i, n.j] : [n.j, i];
      if (!edges.some((e) => e[0] === key[0] && e[1] === key[1])) edges.push(key);
    });
  });

  const gid = `lat-${hash(seed).toString(36)}`;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className={cn('h-full w-full', className)}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22D9F0" />
          <stop offset="100%" stopColor="#7C4DFF" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="#0C0F17" />
      <g stroke={`url(#${gid})`} strokeWidth="0.4" opacity="0.5">
        {edges.map(([a, b]) => (
          <line key={`${a}-${b}`} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} />
        ))}
      </g>
      <g fill={`url(#${gid})`}>
        {nodes.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={n.r} opacity={0.55 + (i % 3) * 0.15} />
        ))}
      </g>
    </svg>
  );
}

/**
 * The image slot used everywhere on the site.
 *
 * Three things happen here beyond showing a picture:
 *
 *  - the frame is a fixed aspect, so a slow, missing or broken photograph never
 *    shifts the layout;
 *  - the image is drawn slightly larger than its frame and drifts against the
 *    scroll, so a page of photographs has depth rather than sitting flat;
 *  - hovering sweeps a sheen across it, the way light travels over the polished
 *    face of the badge. That is the same gesture the buttons use, so the whole
 *    interface reads as one material.
 *
 * `src` is whatever a member or administrator supplied - an arbitrary remote URL
 * - so it renders through a plain <img> rather than next/image, which would need
 * every possible host allow-listed at build time.
 */
export function PhotoFrame({
  src,
  alt,
  seed,
  ratio = 'photo',
  className,
  imgClassName,
  priority,
  overlay = true,
  /** Depth against the scroll. 0 disables it. */
  drift = true,
  children,
}: {
  src?: string | null;
  /** Empty string marks the image as decorative; give it one otherwise. */
  alt: string;
  /** Seeds the stand-in photograph. Defaults to the alt text. */
  seed?: string;
  ratio?: PhotoRatio;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  /** Gradient scrim, so text laid over the photo stays readable. */
  overlay?: boolean;
  drift?: boolean;
  children?: React.ReactNode;
}) {
  const key = seed ?? alt ?? 'bsa';
  const [w, h] = PIXELS[ratio];

  const EVENT_PHOTOS = [
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1280&q=80', // Executive Security Summit
    'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1280&q=80', // Keynote Stage
    'https://images.unsplash.com/photo-1591115765373-5207764f72e7?auto=format&fit=crop&w=1280&q=80', // Cyber Command Boardroom
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1280&q=80', // Collaborative Roundtable
    'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1280&q=80', // Tech Conference Hall
    'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1280&q=80', // Podium Address
    'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1280&q=80', // Executive Briefing
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1280&q=80', // Cyber Defense Operations
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1280&q=80', // Leadership Workshop
    'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1280&q=80', // Chapter Networking Evening
  ];

  const isSynthetic = !src || src.startsWith('data:image/svg');
  const resolved = isSynthetic ? EVENT_PHOTOS[hash(key) % EVENT_PHOTOS.length] : src;

  return (
    <div className={cn('photo-frame group/photo', RATIOS[ratio], className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolved}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={cn(
          'h-full w-full object-cover transition-transform duration-700 ease-out',
          drift && 'scale-[1.08] group-hover/photo:scale-[1.12] motion-reduce:scale-100',
          !drift && 'group-hover/photo:scale-[1.04]',
          imgClassName,
        )}
      />

      {/* The sheen: a raking light crossing the face on hover. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 group-hover/photo:animate-sheen-sweep group-hover/photo:opacity-100 motion-reduce:hidden"
      />

      {overlay && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-base via-base/25 to-transparent"
        />
      )}

      {/* An engraved inner lip, so the photograph sits in the plate. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgb(var(--bevel-light)/0.35),inset_0_0_0_1px_rgb(var(--ink)/0.06)]"
      />

      {children}
    </div>
  );
}

/**
 * Hexagonal portrait, matching the mark's geometry. Used for people.
 * Falls back to executive portraits when no avatar is provided.
 */
export function PhotoHex({
  src,
  name,
  size = 'md',
  className,
  ring,
}: {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  ring?: boolean;
}) {
  const sizes = {
    xs: 'h-7 w-7 text-[0.625rem]',
    sm: 'h-9 w-9 text-xs',
    md: 'h-11 w-11 text-sm',
    lg: 'h-16 w-16 text-lg',
    xl: 'h-24 w-24 text-2xl',
    '2xl': 'h-32 w-32 text-3xl',
  };

  const EXECUTIVE_AVATARS = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=400&q=80',
  ];

  const isSynthetic = !src || src.startsWith('data:image/svg');
  const avatarUrl = isSynthetic ? EXECUTIVE_AVATARS[hash(name) % EXECUTIVE_AVATARS.length] : src;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl}
      alt={name}
      loading="lazy"
      decoding="async"
      className={cn(
        'hex-clip flex-shrink-0 object-cover',
        sizes[size],
        ring && 'ring-1 ring-inset ring-cyan/40',
        className,
      )}
    />
  );
}
