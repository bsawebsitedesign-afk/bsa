'use client';

import React, { useEffect, useRef } from 'react';

/**
 * The hero.
 *
 * The badge is a struck medallion: a riveted rim, an escutcheon, a portcullis
 * lattice across the field, and circuit traces routed into the metal. This
 * draws that at viewport scale and puts it in motion, in three beats:
 *
 *   1. STRIKE  - the portcullis rules itself in, bar by bar, then the shield
 *                outline is engraved onto it in a single continuous stroke.
 *   2. ROUTE   - traces run out from the shield to their pads, at right angles
 *                the way a board is routed, and carry pulses between them.
 *   3. RECEDE  - bound to scroll position, not a threshold. Scrolling settles
 *                the plate back into the ground and widens the lattice;
 *                scrolling up brings it back. The reader is scrubbing it.
 *
 * The pointer polishes: bars near the cursor catch the light, as a raking light
 * moves across machined metal. Nothing glows. Everything is engraved.
 *
 * Hand-written 2D canvas, one layout read per frame, loop suspended off-screen,
 * single static frame under reduced motion.
 */

interface Bar {
  /** Orientation and position of one portcullis rule. */
  vertical: boolean;
  at: number;
  /** 0-1, when this bar rules itself in. */
  delay: number;
  /** 0-1, how strongly the pointer is lighting it. */
  lit: number;
}

interface Pad {
  x: number;
  y: number;
  r: number;
}

interface Trace {
  /** Right-angled route: a run out, a turn, a run to the pad. */
  points: Array<[number, number]>;
  length: number;
  pad: Pad;
  delay: number;
}

interface Pulse {
  trace: number;
  t: number;
  speed: number;
}

const STRIKE_MS = 1500;
const ROUTE_MS = 1400;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Reads a theme token and returns it as `r, g, b` for canvas colour strings.
 *
 * The custom properties are stored space-separated so Tailwind's
 * `<alpha-value>` works in CSS. Canvas needs commas, and `rgba(1 2 3, 0.5)` is
 * a parse error that throws on every frame, so the conversion happens here.
 */
function token(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!v) return fallback;
  return v.includes(',') ? v : v.split(/\s+/).join(', ');
}

export function HeroLattice({
  className,
  /** Real membership size. Sets how far the lattice extends. */
  memberCount = 40,
  /** Disciplines represented. Sets how many traces are routed. */
  disciplineCount = 5,
}: {
  className?: string;
  memberCount?: number;
  disciplineCount?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const stage = (canvas.closest('[data-hero-stage]') as HTMLElement | null) ?? canvas;
    const host = (canvas.parentElement as HTMLElement | null) ?? canvas;

    let width = 0;
    let height = 0;
    let bars: Bar[] = [];
    let traces: Trace[] = [];
    let pulses: Pulse[] = [];
    let shield: Path2D | null = null;
    let shieldLength = 0;
    let frame = 0;
    let visible = true;
    let started = 0;
    let built = false;
    let scrollT = 0;

    // Resolved once per build so the canvas repaints correctly on theme change.
    let INK = '22, 24, 28';
    let STEEL = '46, 82, 116';
    let LIGHT = '255, 255, 255';

    const pointer = { x: -9999, y: -9999, active: false };

    /* ---------------------------------------------------------------- build */

    function geometry() {
      const wide = width >= 1024;
      return {
        // Clear of the copy column, which holds the left seven of twelve.
        cx: wide ? width * 0.82 : width * 0.5,
        cy: height * (wide ? 0.56 : 0.5),
        // Half-width of the escutcheon.
        w: Math.min(width, height) * (wide ? 0.15 : 0.22),
        // Traces never cross this line, so they never run under the headline.
        guard: wide ? width * 0.58 : 0,
      };
    }

    /** The escutcheon, at the geometry's current position and size. */
    function makeShield(cx: number, cy: number, w: number) {
      const h = w * 1.34;
      const p = new Path2D();
      p.moveTo(cx - w, cy - h * 0.62);
      p.lineTo(cx + w, cy - h * 0.62);
      p.lineTo(cx + w, cy + h * 0.06);
      p.quadraticCurveTo(cx + w, cy + h * 0.5, cx, cy + h * 0.66);
      p.quadraticCurveTo(cx - w, cy + h * 0.5, cx - w, cy + h * 0.06);
      p.closePath();
      // Rough perimeter, enough to drive the engraving stroke.
      shieldLength = (w * 2 + h * 1.28) * 2;
      return p;
    }

    function build(force: boolean) {
      const rect = canvas!.getBoundingClientRect();
      const nextW = Math.max(1, rect.width);
      const nextH = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const widthStable = built && Math.abs(nextW - width) < 2;
      width = nextW;
      height = nextH;

      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      INK = token('--ink', INK);
      STEEL = token('--cyan', STEEL);
      LIGHT = token('--bevel-light', LIGHT);

      const { cx, cy, w } = geometry();
      shield = makeShield(cx, cy, w);
      const { guard } = geometry();

      // A height-only change is the iOS URL bar; keep everything else.
      if (widthStable && !force) return;

      // ---- the portcullis: an orthogonal lattice, spaced from the shield.
      const gap = Math.max(34, Math.min(64, w / 2.4));
      bars = [];
      for (let x = (width % gap) / 2; x < width; x += gap) {
        bars.push({ vertical: true, at: x, delay: Math.abs(x - cx) / Math.max(1, width), lit: 0 });
      }
      for (let y = (height % gap) / 2; y < height; y += gap) {
        bars.push({ vertical: false, at: y, delay: Math.abs(y - cy) / Math.max(1, height), lit: 0 });
      }

      // ---- traces routed out to pads, one per discipline, plus a few more
      //      the larger the membership.
      const count = Math.max(3, Math.min(10, disciplineCount + Math.round(Math.sqrt(memberCount) / 3)));
      traces = [];
      for (let i = 0; i < count; i++) {
        const side = i % 2 === 0 ? 1 : -1;
        const t = (i + 1) / (count + 1);
        const startY = cy + (t - 0.5) * w * 2.2;
        const runOut = w * (1.3 + (i % 3) * 0.45);
        const turnX = cx + side * runOut;
        const padY = cy + (t - 0.5) * height * 0.52;

        const points: Array<[number, number]> = [
          [cx + side * w * 0.9, startY],
          [Math.max(guard, turnX), startY],
          [Math.max(guard, turnX), padY],
        ];
        let length = 0;
        for (let p = 1; p < points.length; p++) {
          length += Math.hypot(points[p][0] - points[p - 1][0], points[p][1] - points[p - 1][1]);
        }
        traces.push({ points, length, pad: { x: turnX, y: padY, r: 3.2 }, delay: i / count });
      }

      pulses = traces.map((_, i) => ({
        trace: i,
        t: Math.random(),
        speed: 0.0022 + Math.random() * 0.003,
      }));

      built = true;
    }

    /* --------------------------------------------------------------- update */

    function update(elapsed: number) {
      const stageRect = stage.getBoundingClientRect();
      const runway = Math.max(1, stageRect.height - window.innerHeight);
      scrollT = clamp01(-stageRect.top / runway);

      const strike = reduced ? 1 : easeOutCubic(clamp01(elapsed / STRIKE_MS));
      const route = reduced ? 1 : easeOutCubic(clamp01((elapsed - STRIKE_MS) / ROUTE_MS));

      // The pointer polishes nearby bars.
      for (const bar of bars) {
        if (pointer.active && !reduced) {
          const d = bar.vertical ? Math.abs(bar.at - pointer.x) : Math.abs(bar.at - pointer.y);
          if (d < 130) bar.lit = Math.max(bar.lit, 1 - d / 130);
        }
        bar.lit *= 0.92;
      }

      if (!reduced) {
        for (const p of pulses) {
          p.t += p.speed * (1 + scrollT);
          if (p.t > 1) p.t = 0;
        }
      }

      return { strike, route, fade: 1 - scrollT * 0.55 };
    }

    /* ----------------------------------------------------------------- draw */

    function draw(elapsed: number) {
      const { strike, route, fade } = update(elapsed);
      ctx!.clearRect(0, 0, width, height);

      const { cx, cy, w } = geometry();
      // Scroll widens the lattice as the plate settles back.
      const spread = 1 + scrollT * 0.3;

      // ---- portcullis. Each bar is a dark rule with a lit lip beside it, the
      //      way a raised bar catches light on one edge.
      for (const bar of bars) {
        const local = clamp01((strike - bar.delay * 0.55) / 0.45);
        if (local <= 0) continue;

        const base = 0.07 * fade * local;
        const lip = (0.3 + bar.lit * 0.5) * fade * local;

        if (bar.vertical) {
          const x = cx + (bar.at - cx) * spread;
          ctx!.strokeStyle = `rgba(${INK}, ${base + bar.lit * 0.06})`;
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.moveTo(x, 0);
          ctx!.lineTo(x, height * local);
          ctx!.stroke();

          ctx!.strokeStyle = `rgba(${LIGHT}, ${lip * 0.35})`;
          ctx!.beginPath();
          ctx!.moveTo(x + 1, 0);
          ctx!.lineTo(x + 1, height * local);
          ctx!.stroke();
        } else {
          const y = cy + (bar.at - cy) * spread;
          ctx!.strokeStyle = `rgba(${INK}, ${base + bar.lit * 0.06})`;
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.moveTo(0, y);
          ctx!.lineTo(width * local, y);
          ctx!.stroke();

          ctx!.strokeStyle = `rgba(${LIGHT}, ${lip * 0.35})`;
          ctx!.beginPath();
          ctx!.moveTo(0, y + 1);
          ctx!.lineTo(width * local, y + 1);
          ctx!.stroke();
        }
      }

      // ---- traces, routed at right angles and drawn in sequence
      for (let i = 0; i < traces.length; i++) {
        const tr = traces[i];
        const local = clamp01((route - tr.delay * 0.6) / 0.4);
        if (local <= 0) continue;

        ctx!.strokeStyle = `rgba(${STEEL}, ${0.22 * fade})`;
        ctx!.lineWidth = 1.4;
        ctx!.lineJoin = 'miter';
        ctx!.setLineDash([tr.length, tr.length]);
        ctx!.lineDashOffset = tr.length * (1 - local);
        ctx!.beginPath();
        ctx!.moveTo(tr.points[0][0], tr.points[0][1]);
        for (let p = 1; p < tr.points.length; p++) ctx!.lineTo(tr.points[p][0], tr.points[p][1]);
        ctx!.stroke();
        ctx!.setLineDash([]);

        if (local > 0.98) {
          // The pad the trace lands on: a ring, not a glowing dot.
          ctx!.strokeStyle = `rgba(${STEEL}, ${0.4 * fade})`;
          ctx!.lineWidth = 1.4;
          ctx!.beginPath();
          ctx!.arc(tr.pad.x, tr.pad.y, tr.pad.r, 0, Math.PI * 2);
          ctx!.stroke();
          ctx!.fillStyle = `rgba(${LIGHT}, ${0.5 * fade})`;
          ctx!.beginPath();
          ctx!.arc(tr.pad.x, tr.pad.y, 1.1, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      // ---- pulses running the traces
      if (route > 0.4 && !reduced) {
        for (const p of pulses) {
          const tr = traces[p.trace];
          if (!tr) continue;
          let travelled = p.t * tr.length;
          let x = tr.points[0][0];
          let y = tr.points[0][1];
          for (let s = 1; s < tr.points.length; s++) {
            const [ax, ay] = tr.points[s - 1];
            const [bx, by] = tr.points[s];
            const seg = Math.hypot(bx - ax, by - ay);
            if (travelled <= seg) {
              const k = seg === 0 ? 0 : travelled / seg;
              x = ax + (bx - ax) * k;
              y = ay + (by - ay) * k;
              break;
            }
            travelled -= seg;
            x = bx;
            y = by;
          }
          ctx!.fillStyle = `rgba(${STEEL}, ${0.85 * fade})`;
          ctx!.beginPath();
          ctx!.arc(x, y, 2, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      // ---- the escutcheon, engraved onto the plate in one stroke
      if (shield && strike > 0.25) {
        const cut = clamp01((strike - 0.25) / 0.75);

        // Shadowed lower lip, then the lit upper lip: a struck edge.
        ctx!.save();
        ctx!.setLineDash([shieldLength, shieldLength]);
        ctx!.lineDashOffset = shieldLength * (1 - cut);

        ctx!.translate(0, 1);
        ctx!.strokeStyle = `rgba(${INK}, ${0.28 * fade})`;
        ctx!.lineWidth = 2.4;
        ctx!.stroke(shield);
        ctx!.translate(0, -2);
        ctx!.strokeStyle = `rgba(${LIGHT}, ${0.5 * fade})`;
        ctx!.lineWidth = 1.6;
        ctx!.stroke(shield);
        ctx!.restore();

        // The field, filling in behind the engraving once it has closed.
        if (cut > 0.92) {
          const fill = clamp01((cut - 0.92) / 0.08);
          ctx!.save();
          ctx!.clip(shield);
          const grad = ctx!.createLinearGradient(cx - w, cy - w, cx + w, cy + w);
          grad.addColorStop(0, `rgba(${STEEL}, ${0.16 * fill * fade})`);
          grad.addColorStop(1, `rgba(${STEEL}, ${0.04 * fill * fade})`);
          ctx!.fillStyle = grad;
          ctx!.fillRect(cx - w * 1.2, cy - w * 1.6, w * 2.4, w * 3.2);

          // The chevron device.
          ctx!.fillStyle = `rgba(${LIGHT}, ${0.5 * fill * fade})`;
          ctx!.beginPath();
          ctx!.moveTo(cx, cy - w * 0.5);
          ctx!.lineTo(cx + w * 0.72, cy + w * 0.16);
          ctx!.lineTo(cx + w * 0.42, cy + w * 0.44);
          ctx!.lineTo(cx, cy - w * 0.02);
          ctx!.lineTo(cx - w * 0.42, cy + w * 0.44);
          ctx!.lineTo(cx - w * 0.72, cy + w * 0.16);
          ctx!.closePath();
          ctx!.fill();
          ctx!.restore();
        }
      }
    }

    /* ----------------------------------------------------------------- loop */

    function step(now: number) {
      if (!started) started = now;
      draw(now - started);
      if (!reduced && visible) frame = requestAnimationFrame(step);
    }

    function start() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(step);
    }

    /* ------------------------------------------------------------- listeners */

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas!.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    };
    const onPointerLeave = () => {
      pointer.active = false;
      pointer.x = -9999;
      pointer.y = -9999;
    };

    const resizeObserver = new ResizeObserver(() => {
      build(false);
      if (reduced) draw(STRIKE_MS + ROUTE_MS);
    });
    resizeObserver.observe(canvas);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? true;
        if (visible && !reduced) start();
        else cancelAnimationFrame(frame);
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(canvas);

    // Repaint in the new palette when the reader switches light and dark.
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => {
      build(true);
      draw(STRIKE_MS + ROUTE_MS);
    };
    scheme.addEventListener('change', onScheme);

    build(true);

    if (reduced) {
      draw(STRIKE_MS + ROUTE_MS);
    } else {
      host.addEventListener('pointermove', onPointerMove);
      host.addEventListener('pointerleave', onPointerLeave);
      start();
    }

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      scheme.removeEventListener('change', onScheme);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [memberCount, disciplineCount]);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}
