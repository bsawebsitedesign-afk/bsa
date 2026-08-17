'use client';

import React, { useEffect, useRef } from 'react';
import type { MotionValue } from 'framer-motion';

/**
 * The scroll journey, drawn as one continuous scene.
 *
 * Four beats run off a single scroll progress, so nothing here is
 * "section, animation, section". The same points are on screen the whole way
 * through; only what they mean changes:
 *
 *   0.00 - 0.22  GLOBE     an engraved sphere, turning. Each chapter is pinned
 *                          at its real latitude and longitude, named, and joined
 *                          by great-circle routes with a signal running along
 *                          them.
 *   0.22 - 0.40  APPROACH  the sphere leans toward the reader and the busiest
 *                          region swings to face them. A lean, not a dive: the
 *                          globe stays whole and inside its own half of the
 *                          frame the entire time.
 *   0.40 - 0.62  NETWORK   the pins leave the surface. Geography dissolves and
 *                          the same points settle into a member graph.
 *   0.78 - 1.00  CARDS     partner nodes fly to the grid slots where the real
 *                          partner cards are about to appear, fading out exactly
 *                          as the cards fade in, so the two never both read as
 *                          clutter.
 *
 * Two rules keep it legible rather than decorative.
 *
 * Everything is drawn inside a *stage*: a circle in the right-hand half of the
 * canvas on wide screens, and a band below the copy on narrow ones. The scene
 * never expands past it, so it can never wash over the words. The earlier
 * version zoomed to 2.35x and pushed labelled pins straight through the
 * headline.
 *
 * And everything is drawn at an alpha you can actually see. On the near-black
 * ground these tokens resolve to, a hairline at 8% opacity is invisible; the
 * structure here carries a filled sphere body, a lit limb and a graticule that
 * brightens toward the front of the sphere, so it reads as a solid object under
 * a raking light rather than a faint circle of dots.
 *
 * Written against 2D canvas with its own projection maths rather than a 3D
 * library: it is a few hundred lines, adds no dependency, and holds 60fps.
 * Rotation is a real 3x3 basis, points are perspective-divided and depth-sorted,
 * and the far hemisphere is dimmed rather than clipped, so nothing pops.
 *
 * Progress arrives as a Motion value and is read inside the frame loop. It is
 * never React state: a scroll-linked value in state re-renders the tree on every
 * frame and collapses on mobile.
 */

export interface GlobePin {
  slug: string;
  label: string;
  city: string;
  lat: number;
  lon: number;
  members: number;
}

export interface GlobeNode {
  /** Where this node lands in the card grid, 0-1 across the container. */
  gridX: number;
  gridY: number;
  partner: boolean;
}

const TAU = Math.PI * 2;

/**
 * Longitude that faces the camera at yaw 0 is +90. Offsetting by this much
 * swings Europe, Africa, the Gulf and South Asia into view, which is where
 * seven of the eight chapters are.
 */
const INITIAL_YAW = 1.22;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Maps a beat's own 0-1 out of the global progress. */
const beat = (p: number, from: number, to: number) => clamp01((p - from) / (to - from));

/** Latitude and longitude to a unit vector. */
function toVec(lat: number, lon: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return [-Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)];
}

/** Rotate about Y then X. Returns the camera-space vector. */
function rotate(v: [number, number, number], yaw: number, pitch: number): [number, number, number] {
  const [x, y, z] = v;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
}

/** Great-circle interpolation, so a route bows the way a flight path does. */
function slerp(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  const v: [number, number, number] = [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  const lift = 1 + Math.sin(t * Math.PI) * 0.07;
  return [(v[0] / len) * lift, (v[1] / len) * lift, (v[2] / len) * lift];
}

export function GlobeCanvas({
  progress,
  pins,
  nodes,
  align = 'stage',
  className,
}: {
  progress: MotionValue<number>;
  pins: GlobePin[];
  nodes: GlobeNode[];
  /**
   * `stage` keeps the scene in its own half of a full-bleed canvas, clear of the
   * copy column. `center` fills a standalone box, which is what the
   * reduced-motion layout hands it.
   */
  align?: 'stage' | 'center';
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;
    let p = 0;
    /** Timestamp of the first painted frame, for entrances that are not scroll-linked. */
    let started = -1;

    let INK = '233, 234, 236';
    let STEEL = '143, 178, 208';
    let BRIGHT = '176, 203, 226';
    let LIGHT = '255, 255, 255';
    let GROUND = '19, 21, 25';
    let MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

    const pointer = { x: -9999, y: -9999, active: false };

    /** Arcs run west to east, so the route reads as a line around the world. */
    const chained = [...pins].sort((a, b) => a.lon - b.lon);

    /**
     * Where each node ends up once the sphere dissolves.
     *
     * Phyllotaxis rather than a ring: points spiral outward at the golden angle,
     * which packs them evenly instead of flinging them to the edges. Positions
     * are unit-circle offsets, scaled to the stage at draw time, so the graph
     * lands inside the same circle the globe occupied instead of spreading over
     * the whole canvas and drifting behind the copy.
     */
    const GOLDEN = Math.PI * (3 - Math.sqrt(5));
    const layout = nodes.map((n, i) => {
      const r = Math.sqrt((i + 0.5) / Math.max(1, nodes.length));
      const a = i * GOLDEN;
      return { ox: Math.cos(a) * r, oy: Math.sin(a) * r, ...n };
    });

    function token(name: string, fallback: string) {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v ? (v.includes(',') ? v : v.split(/\s+/).join(', ')) : fallback;
    }

    /**
     * Canvas takes a real CSS font shorthand, and a shorthand containing
     * `var(--x)` is invalid: the assignment is dropped silently and every label
     * falls back to 10px sans-serif. Resolve the variable to its font list
     * first, which is what next/font puts there.
     */
    function fontStack(name: string, fallback: string) {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v ? `${v}, ${fallback}` : fallback;
    }

    function measure() {
      const rect = canvas!.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      INK = token('--ink', INK);
      STEEL = token('--cyan', STEEL);
      BRIGHT = token('--cyan-bright', BRIGHT);
      LIGHT = token('--bevel-light', LIGHT);
      GROUND = token('--base', GROUND);
      MONO = fontStack('--font-mono', 'ui-monospace, SFMono-Regular, Menlo, monospace');
    }

    function draw(time: number) {
      if (started < 0) started = time;
      ctx!.clearRect(0, 0, width, height);

      const wide = width >= 1024;

      /* ------------------------------------------------------------ stage
         The scene's own circle. On wide screens it sits in the right-hand
         half, clear of the copy column; on narrow ones it is a band between
         the copy above and the cards below. Nothing is ever drawn far outside
         it, which is what keeps the words readable. */
      const centered = align === 'center';
      const cx = width * (centered || !wide ? 0.5 : 0.69);
      // On a phone the scene sits low, in the band the copy leaves free.
      const cy = height * (centered ? 0.5 : wide ? 0.52 : 0.66);
      const stageR = centered
        ? Math.min(width * 0.2, height * 0.4)
        : wide
          ? Math.min(width * 0.168, height * 0.28)
          : Math.min(width * 0.32, height * 0.155);

      const bApproach = beat(p, 0.22, 0.4);
      const bNetwork = beat(p, 0.4, 0.62);
      const bCards = beat(p, 0.78, 1);

      // The sphere leans in, then loses its geometry as the network takes over.
      // The dissolve starts after the nodes have begun moving, so the frame is
      // never empty mid-transition.
      const radius = stageR * lerp(1, 1.15, easeInOut(bApproach));
      const sphere = 1 - easeInOut(beat(p, 0.44, 0.6));
      const graph = easeInOut(bNetwork);
      // The hand-off: nodes clear the stage on exactly the ramp the cards fade
      // in on, so the reader never reads both at once.
      const handoff = clamp01((bCards - 0.05) / 0.5);

      // Turn slowly, then swing the busiest region to face the reader.
      const drift = reduced ? 0 : time * 0.00004;
      const yaw = INITIAL_YAW + drift + lerp(0, -0.5, easeInOut(bApproach));
      const pitch = lerp(-0.2, -0.34, easeInOut(bApproach));

      const project = (v: [number, number, number]) => {
        const r = rotate(v, yaw, pitch);
        // Perspective divide. The camera sits at z = -3 radii.
        const depth = 3 + r[2];
        const k = 3 / Math.max(0.2, depth);
        return { x: cx + r[0] * radius * k, y: cy - r[1] * radius * k, z: r[2], k };
      };

      /* ----------------------------------------------------- sphere body */
      if (sphere > 0.01) {
        // A struck steel face, lit from the upper left. Without a fill the
        // globe is a wire circle on a dark page and reads as nothing.
        const body = ctx!.createRadialGradient(
          cx - radius * 0.34,
          cy - radius * 0.4,
          radius * 0.06,
          cx,
          cy,
          radius * 1.02,
        );
        body.addColorStop(0, `rgba(${LIGHT}, ${sphere * 0.075})`);
        body.addColorStop(0.45, `rgba(${STEEL}, ${sphere * 0.05})`);
        body.addColorStop(1, `rgba(${GROUND}, ${sphere * 0.34})`);
        ctx!.fillStyle = body;
        ctx!.beginPath();
        ctx!.arc(cx, cy, radius, 0, TAU);
        ctx!.fill();
      }

      /* ---------------------------------------------------- graticule */
      if (sphere > 0.01) {
        // Front-facing segments are drawn brighter than ones near the limb,
        // which is what gives the wireframe its curvature.
        const mesh = (lat0: number, lat1: number, lon0: number, lon1: number, step: number, alongLat: boolean) => {
          let prev: { x: number; y: number; z: number } | null = null;
          const from = alongLat ? lon0 : lat0;
          const to = alongLat ? lon1 : lat1;
          for (let t = from; t <= to; t += step) {
            const pt = project(alongLat ? toVec(lat0, t) : toVec(t, lon0));
            if (pt.z > 0.02) {
              prev = null;
              continue;
            }
            if (prev) {
              // -1 dead centre, 0 at the limb.
              const face = clamp01(-((prev.z + pt.z) / 2));
              ctx!.strokeStyle = `rgba(${INK}, ${sphere * (0.07 + face * 0.2)})`;
              ctx!.lineWidth = 1;
              ctx!.beginPath();
              ctx!.moveTo(prev.x, prev.y);
              ctx!.lineTo(pt.x, pt.y);
              ctx!.stroke();
            }
            prev = pt;
          }
        };

        for (let lat = -60; lat <= 60; lat += 30) mesh(lat, lat, -180, 180, 4, true);
        for (let lon = -180; lon < 180; lon += 30) mesh(-90, 90, lon, lon, 4, false);

        // The limb: a struck edge, lit above and shadowed below.
        ctx!.beginPath();
        ctx!.arc(cx, cy, radius, 0, TAU);
        ctx!.strokeStyle = `rgba(${STEEL}, ${sphere * 0.4})`;
        ctx!.lineWidth = 1.5;
        ctx!.stroke();
        ctx!.beginPath();
        ctx!.arc(cx, cy - 1, radius, Math.PI * 1.04, Math.PI * 1.96);
        ctx!.strokeStyle = `rgba(${LIGHT}, ${sphere * 0.5})`;
        ctx!.lineWidth = 1.4;
        ctx!.stroke();
      }

      /* ------------------------------------------- great-circle routes */
      if (sphere > 0.01 && chained.length > 1) {
        for (let i = 0; i < chained.length - 1; i++) {
          const a = toVec(chained[i].lat, chained[i].lon);
          const b = toVec(chained[i + 1].lat, chained[i + 1].lon);

          let prev: { x: number; y: number; z: number } | null = null;
          for (let s = 0; s <= 30; s++) {
            const pt = project(slerp(a, b, s / 30));
            if (pt.z > 0.04) {
              prev = null;
              continue;
            }
            if (prev) {
              const face = clamp01(-((prev.z + pt.z) / 2));
              ctx!.strokeStyle = `rgba(${STEEL}, ${sphere * (0.18 + face * 0.42)})`;
              ctx!.lineWidth = 1.3;
              ctx!.beginPath();
              ctx!.moveTo(prev.x, prev.y);
              ctx!.lineTo(pt.x, pt.y);
              ctx!.stroke();
            }
            prev = pt;
          }

          // A signal running the route. This is the one thing on screen that
          // moves without the reader scrolling, so the scene is alive on
          // arrival rather than a still image.
          if (!reduced) {
            const t = ((time * 0.00009 + i * 0.13) % 1.35) / 1;
            if (t <= 1) {
              const pt = project(slerp(a, b, t));
              if (pt.z <= 0) {
                const fade = Math.sin(t * Math.PI);
                const glow = ctx!.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, 9 * pt.k);
                glow.addColorStop(0, `rgba(${BRIGHT}, ${sphere * fade * 0.75})`);
                glow.addColorStop(1, `rgba(${BRIGHT}, 0)`);
                ctx!.fillStyle = glow;
                ctx!.beginPath();
                ctx!.arc(pt.x, pt.y, 9 * pt.k, 0, TAU);
                ctx!.fill();

                ctx!.fillStyle = `rgba(${BRIGHT}, ${sphere * fade})`;
                ctx!.beginPath();
                ctx!.arc(pt.x, pt.y, 1.9 * pt.k, 0, TAU);
                ctx!.fill();
              }
            }
          }
        }
      }

      /* ---------------------------------------------------- the nodes */
      // Every node is somewhere between its place on the sphere and its place
      // in the graph, and then between the graph and its card slot.
      const drawn: Array<{ x: number; y: number; r: number; z: number; a: number; partner: boolean }> = [];
      const spread = stageR * 1.14;

      layout.forEach((n, i) => {
        const pin = pins[i % Math.max(1, pins.length)];
        const src = pin ? toVec(pin.lat + ((i * 13) % 17) - 8, pin.lon + ((i * 29) % 31) - 15) : toVec(0, 0);
        const s = project([src[0] * 1.02, src[1] * 1.02, src[2] * 1.02]);

        // Members belonging to the same chapter drift a little, so the graph
        // breathes instead of sitting frozen between beats.
        const wob = reduced ? 0 : Math.sin(time * 0.0004 + i * 1.7) * stageR * 0.018;
        const gx = cx + n.ox * spread * 1.12;
        const gy = cy + n.oy * spread * 0.92 + wob;

        let x = lerp(s.x, gx, graph);
        let y = lerp(s.y, gy, graph);

        if (bCards > 0 && n.partner) {
          x = lerp(x, n.gridX * width, easeInOut(bCards));
          y = lerp(y, n.gridY * height, easeInOut(bCards));
        }

        // Dimmed rather than clipped while behind the sphere, so nothing pops
        // as the globe dissolves.
        const behind = sphere * clamp01(s.z / 0.35);
        // Partners ride their card in and dissolve into it. Everyone else drops
        // back to a quiet constellation rather than vanishing, so the stage
        // keeps a floor under the cards instead of going flat black.
        const exit = n.partner ? 1 - handoff : 1 - clamp01(handoff * 1.5) * 0.8;
        const a = lerp(lerp(1, 0.05, behind), 1, graph) * exit;
        if (a <= 0.02) return;

        let r = 2.2 + (pin ? Math.min(3.4, pin.members * 0.24) : 0);
        r *= lerp(s.k, 1, graph);

        if (pointer.active) {
          const d = Math.hypot(x - pointer.x, y - pointer.y);
          if (d < 130) r *= 1 + (1 - d / 130) * 0.9;
        }

        drawn.push({ x, y, r, z: s.z, a, partner: n.partner });
      });

      // Edges between nearby nodes once the graph exists.
      if (graph > 0.04) {
        const reach = stageR * 0.86;
        const edgeFade = 1 - clamp01(handoff * 1.6) * 0.87;
        ctx!.lineWidth = 1.1;
        for (let i = 0; i < drawn.length; i++) {
          for (let j = i + 1; j < drawn.length; j++) {
            const dx = drawn[i].x - drawn[j].x;
            const dy = drawn[i].y - drawn[j].y;
            const d = Math.hypot(dx, dy);
            if (d > reach) continue;
            const a = (1 - d / reach) * 0.78 * graph * edgeFade * Math.min(drawn[i].a, drawn[j].a);
            if (a <= 0.015) continue;
            ctx!.strokeStyle = `rgba(${STEEL}, ${a})`;
            ctx!.beginPath();
            ctx!.moveTo(drawn[i].x, drawn[i].y);
            ctx!.lineTo(drawn[j].x, drawn[j].y);
            ctx!.stroke();
          }
        }
      }

      // Painter's algorithm: largest z is farthest, so it goes down first.
      drawn.sort((a, b) => b.z - a.z);
      for (const d of drawn) {
        if (d.partner) {
          // Partners carry a halo, so the eight points that are about to
          // become cards are picked out of the crowd before they move.
          const glow = ctx!.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 4.5);
          glow.addColorStop(0, `rgba(${BRIGHT}, ${d.a * 0.4})`);
          glow.addColorStop(1, `rgba(${BRIGHT}, 0)`);
          ctx!.fillStyle = glow;
          ctx!.beginPath();
          ctx!.arc(d.x, d.y, d.r * 4.5, 0, TAU);
          ctx!.fill();

          ctx!.fillStyle = `rgba(${BRIGHT}, ${d.a})`;
          ctx!.beginPath();
          ctx!.arc(d.x, d.y, d.r * 1.2, 0, TAU);
          ctx!.fill();
        } else {
          ctx!.fillStyle = `rgba(${INK}, ${d.a * 0.85})`;
          ctx!.beginPath();
          ctx!.arc(d.x, d.y, d.r, 0, TAU);
          ctx!.fill();
        }
      }

      /* ------------------------------------------------ chapter pins */
      if (sphere > 0.02) {
        // Front-most first, so when two labels collide the nearer city keeps
        // its name.
        const ordered = pins
          .map((pin) => ({ pin, pt: project(toVec(pin.lat, pin.lon)) }))
          .filter((e) => e.pt.z <= 0.02)
          .sort((a, b) => a.pt.z - b.pt.z);

        const size = wide ? 11 : 10;
        ctx!.font = `600 ${size}px ${MONO}`;
        ctx!.textBaseline = 'middle';

        // Names are present the moment the scene is, so the reader can read the
        // chapters without scrolling for them; they only fade as the pins lift
        // off the surface. The short intro is on the clock, not on scroll.
        const intro = reduced ? 1 : easeOut(clamp01((time - started) / 900));
        const named = intro * (1 - clamp01(bNetwork * 2.2));
        const taken: Array<[number, number, number, number]> = [];

        for (const { pin, pt } of ordered) {
          const vis = sphere * clamp01((0.22 - pt.z) / 0.45);
          if (vis <= 0.02) continue;

          // A slow ping, so a chapter reads as a live location.
          if (!reduced) {
            const phase = (time * 0.0004 + pin.lon / 360 + 1) % 1;
            ctx!.strokeStyle = `rgba(${STEEL}, ${vis * (1 - phase) * 0.45})`;
            ctx!.lineWidth = 1.2;
            ctx!.beginPath();
            ctx!.arc(pt.x, pt.y, (5 + phase * 16) * pt.k, 0, TAU);
            ctx!.stroke();
          }

          ctx!.strokeStyle = `rgba(${BRIGHT}, ${vis * 0.95})`;
          ctx!.lineWidth = 1.6;
          ctx!.beginPath();
          ctx!.arc(pt.x, pt.y, 5.5 * pt.k, 0, TAU);
          ctx!.stroke();

          ctx!.fillStyle = `rgba(${BRIGHT}, ${vis})`;
          ctx!.beginPath();
          ctx!.arc(pt.x, pt.y, 2.6 * pt.k, 0, TAU);
          ctx!.fill();

          const la = vis * named;
          if (la <= 0.06) continue;

          const text = pin.city.toUpperCase();
          const w = ctx!.measureText(text).width;
          let lx = pt.x + 13 * pt.k;
          const ly = pt.y;
          // Flip the label inboard rather than let it run off the canvas.
          if (lx + w + 12 > width) lx = pt.x - 13 * pt.k - w;

          const box: [number, number, number, number] = [lx - 6, ly - 9, w + 12, 18];
          const clash = taken.some(
            (t) => box[0] < t[0] + t[2] && box[0] + box[2] > t[0] && box[1] < t[1] + t[3] && box[1] + box[3] > t[1],
          );
          if (clash) continue;
          taken.push(box);

          // A plate under the name, so it is legible over the graticule.
          ctx!.fillStyle = `rgba(${GROUND}, ${la * 0.82})`;
          ctx!.beginPath();
          ctx!.roundRect(box[0], box[1], box[2], box[3], 3);
          ctx!.fill();

          ctx!.fillStyle = `rgba(${INK}, ${la * 0.95})`;
          ctx!.fillText(text, lx, ly + 0.5);
        }
      }
    }

    /* ------------------------------------------------------------ loop */

    function step(time: number) {
      draw(time);
      if (visible) frame = requestAnimationFrame(step);
    }

    const unsubscribe = progress.on('change', (v) => {
      p = v;
      if (reduced) draw(0);
    });
    p = progress.get();

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas!.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    };
    const onPointerLeave = () => {
      pointer.active = false;
    };

    const host = (canvas.parentElement as HTMLElement | null) ?? canvas;

    const resizeObserver = new ResizeObserver(() => {
      measure();
      if (reduced) draw(0);
    });
    resizeObserver.observe(canvas);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? true;
        if (visible && !reduced) {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(step);
        } else cancelAnimationFrame(frame);
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(canvas);

    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => {
      measure();
      draw(0);
    };
    scheme.addEventListener('change', onScheme);

    measure();

    if (reduced) {
      // One frame, at the beat where the geography still reads.
      p = 0.08;
      draw(0);
    } else {
      host.addEventListener('pointermove', onPointerMove);
      host.addEventListener('pointerleave', onPointerLeave);
      frame = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      scheme.removeEventListener('change', onScheme);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [progress, pins, nodes, align]);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}
