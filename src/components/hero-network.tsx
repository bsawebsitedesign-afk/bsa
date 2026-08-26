'use client';

import React, { useEffect, useRef } from 'react';

/**
 * The hero.
 *
 * The subject of this site is people finding each other, so that is what the
 * hero draws: a room of members, each one a real figure rather than a dot, and
 * the connections between them forming and re-forming as they move.
 *
 * Four beats:
 *
 *   1. ARRIVE  - the members come in from off-frame and settle into the room,
 *                centre outward. Nobody is there, then everybody is.
 *   2. WEAVE   - anyone close enough to anyone else is linked, and the link is
 *                recomputed every frame. Because the figures drift, the mesh is
 *                never the same twice: connections are made and dropped live.
 *   3. INTROS  - signals hop the mesh, member to member, and the member they
 *                land on rings out. That is an introduction travelling a
 *                network, which is the whole product in one gesture.
 *   4. DISPERSE- bound to scroll position, not a threshold. Scrolling pushes
 *                the room apart until the links snap; scrolling back up pulls
 *                it together again. The reader scrubs it.
 *
 * The pointer parts the crowd - figures lean away from it and the links stretch
 * with them - so the thing feels handled rather than watched.
 *
 * Hand-written 2D canvas: no dependency, nothing exotic, so it runs the same in
 * every browser back to Safari 12. Density is derived from the area of the
 * frame, not from a breakpoint, so a phone gets a legible handful of figures
 * and a wide monitor gets a crowd at the same physical spacing. Positions are
 * resolved once per frame into typed arrays and reused by the link pass, the
 * loop is suspended off-screen, and reduced motion gets one settled frame.
 */

interface Member {
  /** Where this figure lives, before drift. Normalised 0-1 of the frame. */
  hx: number;
  hy: number;
  /** Off-frame position it arrives from. */
  sx: number;
  sy: number;
  /** Drift is a slow Lissajous, not integrated velocity: it cannot blow up. */
  phase: number;
  speed: number;
  amp: number;
  /** Ring radius in px, set at build from the frame's short side. */
  r: number;
  /** Chapter anchors: drawn larger, with a second ring. */
  hub: boolean;
  /** 0-1, when this figure arrives. */
  delay: number;
  /** Decaying ring left by an introduction landing here. */
  flash: number;
}

interface Signal {
  from: number;
  to: number;
  t: number;
  speed: number;
}

const TAU = Math.PI * 2;
const ARRIVE_MS = 1500;
const WEAVE_MS = 900;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

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

export function HeroNetwork({
  className,
  /** Real membership size. Nudges how crowded the room is. */
  memberCount = 40,
  /** Regional chapters. Sets how many figures are drawn as anchors. */
  chapterCount = 5,
}: {
  className?: string;
  memberCount?: number;
  chapterCount?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(pointer: fine)').matches;

    const stage = (canvas.closest('[data-hero-stage]') as HTMLElement | null) ?? canvas;
    const host = (canvas.parentElement as HTMLElement | null) ?? canvas;

    let width = 0;
    let height = 0;
    let members: Member[] = [];
    let signals: Signal[] = [];
    /** Resolved screen-space positions for this frame, shared by every pass. */
    let px = new Float32Array(0);
    let py = new Float32Array(0);
    let pr = new Float32Array(0);
    let linkDist = 0;
    let frame = 0;
    let visible = true;
    let started = 0;
    let built = false;
    let scrollT = 0;

    // Resolved at build so the canvas repaints correctly on a theme change.
    let INK = '245, 248, 255';
    let CYAN = '120, 168, 215';
    let SURFACE = '22, 28, 38';

    const pointer = { x: -9999, y: -9999, active: false };

    /* ---------------------------------------------------------------- build */

    function build(force: boolean) {
      const rect = canvas!.getBoundingClientRect();
      const nextW = Math.max(1, rect.width);
      const nextH = Math.max(1, rect.height);
      // A phone renders this full-bleed behind the whole hero. At dpr 2 that is
      // four times the fill for strokes a thumb's width from the glass, and it
      // is the single biggest thing this costs on a handset.
      const dpr = Math.min(window.devicePixelRatio || 1, nextW < 640 ? 1.5 : 2);

      const widthStable = built && Math.abs(nextW - width) < 2;
      width = nextW;
      height = nextH;

      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.lineCap = 'round';

      INK = token('--ink', INK);
      CYAN = token('--cyan-bright', CYAN);
      SURFACE = token('--surface', SURFACE);

      // Figure size comes off the short side, so the room keeps the same
      // physical scale on a phone and on a 27-inch monitor instead of scaling
      // into either confetti or beach balls.
      const short = Math.min(width, height);
      const base = Math.max(11, Math.min(20, short / 42));

      // Density per area rather than per breakpoint. The membership only ever
      // nudges it: this is a hero, not a chart. A phone is capped harder than
      // the area alone would give, because every figure is six filled paths and
      // fill rate is what a handset runs out of first.
      const target = Math.round((width * height) / 21000 + Math.sqrt(memberCount));
      const count = Math.max(14, Math.min(width < 640 ? 26 : 64, target));
      const hubs = Math.max(2, Math.min(6, Math.round(chapterCount / 2)));

      // Reach is deliberately generous. A mesh you have to look for is not a
      // network, it is a starfield: links have to be the first thing read. It
      // comes off the room's own spacing rather than the short side, because a
      // phone's frame is tall and narrow - keyed to the short side there, whole
      // rows of figures sat unlinked and the hero read as an empty plate.
      // A height-only change is the iOS URL bar collapsing; keep the room - but
      // the reach still has to follow the frame it is now covering.
      const keep = widthStable && !force;
      const spaced = Math.sqrt((width * height) / Math.max(1, keep ? members.length : count));
      linkDist = Math.max(180, Math.min(340, spaced * 1.9));
      if (keep) return;

      // Jittered grid rather than pure random: random alone clumps, and a clump
      // of figures reads as a smudge instead of as people.
      const cols = Math.max(3, Math.round(Math.sqrt(count * (width / Math.max(1, height)))));
      const rows = Math.max(3, Math.ceil(count / cols));

      members = [];
      for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols) % rows;
        const hx = (col + 0.5 + (Math.random() - 0.5) * 0.72) / cols;
        const hy = (row + 0.5 + (Math.random() - 0.5) * 0.72) / rows;
        const edge = Math.random() * TAU;
        const hub = i % Math.max(1, Math.floor(count / hubs)) === 0;

        members.push({
          hx,
          hy,
          // Arrives from outside the frame, on the side it is headed for.
          sx: hx + Math.cos(edge) * 0.9,
          sy: hy + Math.sin(edge) * 0.9,
          phase: Math.random() * TAU,
          speed: 0.16 + Math.random() * 0.22,
          amp: 0.018 + Math.random() * 0.03,
          r: base * (hub ? 1.5 : 0.82 + Math.random() * 0.36),
          hub,
          // Centre outward, so the room fills from the middle.
          delay: Math.hypot(hx - 0.5, hy - 0.5) * 1.5,
          flash: 0,
        });
      }

      // Two relaxation passes. Jitter alone lets a pair land on top of each
      // other, and two overlapping figures read as one smudged blob.
      const gap = (base * 3.4) / Math.min(width, height);
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < members.length; i++) {
          for (let j = i + 1; j < members.length; j++) {
            const a = members[i];
            const b = members[j];
            const dx = b.hx - a.hx;
            const dy = b.hy - a.hy;
            const d = Math.hypot(dx, dy) || 0.0001;
            if (d >= gap) continue;
            const push = ((gap - d) / d) * 0.5;
            a.hx -= dx * push;
            a.hy -= dy * push;
            b.hx += dx * push;
            b.hy += dy * push;
          }
        }
      }
      for (const m of members) {
        m.hx = Math.max(0.03, Math.min(0.97, m.hx));
        m.hy = Math.max(0.05, Math.min(0.95, m.hy));
        const edge = Math.random() * TAU;
        m.sx = m.hx + Math.cos(edge) * 0.9;
        m.sy = m.hy + Math.sin(edge) * 0.9;
        m.delay = Math.hypot(m.hx - 0.5, m.hy - 0.5) * 1.5;
      }

      px = new Float32Array(count);
      py = new Float32Array(count);
      pr = new Float32Array(count);

      signals = [];
      const signalCount = Math.max(3, Math.min(9, Math.round(count / 6)));
      for (let i = 0; i < signalCount; i++) {
        const from = Math.floor(Math.random() * count);
        signals.push({
          from,
          to: (from + 1 + Math.floor(Math.random() * (count - 1))) % count,
          t: Math.random(),
          speed: 0.006 + Math.random() * 0.008,
        });
      }

      built = true;
    }

    /* --------------------------------------------------------------- update */

    /**
     * How much of the frame this point belongs to the artwork.
     *
     * The copy has to stay readable over the top of a live drawing, and a scrim
     * dark enough to guarantee that on its own would flatten the room. So the
     * crowd thins where the words are instead: above lg the copy holds the left
     * seven columns and the room owns the right.
     *
     * Below lg there is no such split. The hero is no longer a clipped 100dvh
     * box there, so the copy runs its full height and there is no band left to
     * thin - the old middle-band cut held the room at 0.3 behind a scrim, which
     * is why the animation read as nothing at all on a phone. The room stays up
     * everywhere instead and the scrim over it carries the type.
     */
    function guard(x: number, y: number) {
      if (width >= 1024) return 0.12 + 0.88 * clamp01((x - width * 0.26) / (width * 0.34));
      return 0.8;
    }

    function update(elapsed: number) {
      // The stage is pinned above lg only. Below it the hero scrolls away like
      // any other section, so there is no runway to scrub: reading the stage's
      // rect every frame would be a forced layout for nothing, and dispersing
      // the room on the way past left a blank screen where the hero had been.
      if (width >= 1024) {
        const stageRect = stage.getBoundingClientRect();
        const runway = Math.max(1, stageRect.height - window.innerHeight);
        scrollT = clamp01(-stageRect.top / runway);
      } else {
        scrollT = 0;
      }

      const arrive = reduced ? 1 : clamp01(elapsed / ARRIVE_MS);
      const weave = reduced ? 1 : easeOutCubic(clamp01((elapsed - ARRIVE_MS * 0.55) / WEAVE_MS));
      // Scrolling pushes the room apart from its centre until the links snap.
      const spread = 1 + scrollT * 0.85;
      const drift = elapsed / 1000;

      for (let i = 0; i < members.length; i++) {
        const m = members[i];
        const enter = easeOutCubic(clamp01((arrive - m.delay * 0.42) / 0.58));

        // Drift in normalised space so it is the same gesture at every size.
        const wanderX = Math.cos(drift * m.speed + m.phase) * m.amp;
        const wanderY = Math.sin(drift * m.speed * 1.31 + m.phase * 1.7) * m.amp;

        const nx = m.sx + (m.hx + wanderX - m.sx) * enter;
        const ny = m.sy + (m.hy + wanderY - m.sy) * enter;

        let x = width * (0.5 + (nx - 0.5) * spread);
        let y = height * (0.5 + (ny - 0.5) * spread);

        // The pointer parts the crowd.
        if (pointer.active && !reduced) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const d = Math.hypot(dx, dy);
          const reach = linkDist * 1.1;
          if (d < reach && d > 0.01) {
            const push = (1 - d / reach) ** 2 * reach * 0.42;
            x += (dx / d) * push;
            y += (dy / d) * push;
          }
        }

        px[i] = x;
        py[i] = y;
        pr[i] = m.r * enter;
        m.flash *= 0.94;
      }

      if (!reduced) {
        for (const s of signals) {
          s.t += s.speed;
          if (s.t >= 1) {
            // Landed: the member rings out, and the signal hops onward to
            // someone they are actually linked to.
            const arrived = members[s.to];
            if (arrived) arrived.flash = 1;
            s.from = s.to;
            s.to = neighbour(s.from);
            s.t = 0;
          }
        }
      }

      // Down to 0.45, not to nothing. At 0.1 the last stretch of the runway was
      // a pinned viewport with an empty plate in it - the room had gone and the
      // copy had already cleared, so the reader got a blank screen before the
      // section let go. Holding the room up means the frame the hero releases
      // on still reads as a room coming apart rather than as a missing section.
      return { weave, fade: 1 - scrollT * 0.55 };
    }

    /** Someone within reach of `i`, so introductions travel real links. */
    function neighbour(i: number) {
      let best = -1;
      let seen = 0;
      const reach2 = (linkDist * 1.15) ** 2;
      for (let j = 0; j < members.length; j++) {
        if (j === i) continue;
        const dx = px[j] - px[i];
        const dy = py[j] - py[i];
        if (dx * dx + dy * dy > reach2) continue;
        seen++;
        // Reservoir pick: one pass, no array.
        if (Math.random() < 1 / seen) best = j;
      }
      return best === -1 ? (i + 1 + Math.floor(Math.random() * (members.length - 1))) % members.length : best;
    }

    /* ----------------------------------------------------------------- draw */

    /** A person, not a dot: head and shoulders inside their own ring. */
    function figure(x: number, y: number, r: number, alpha: number, hub: boolean) {
      // Disc first, so links pass behind people rather than through them.
      ctx!.fillStyle = `rgba(${SURFACE}, ${0.92 * alpha})`;
      ctx!.beginPath();
      ctx!.arc(x, y, r, 0, TAU);
      ctx!.fill();

      ctx!.strokeStyle = `rgba(${CYAN}, ${(hub ? 0.85 : 0.5) * alpha})`;
      ctx!.lineWidth = hub ? 2 : 1.2;
      ctx!.stroke();

      if (hub) {
        ctx!.strokeStyle = `rgba(${CYAN}, ${0.3 * alpha})`;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.arc(x, y, r * 1.42, 0, TAU);
        ctx!.stroke();
      }

      ctx!.fillStyle = `rgba(${INK}, ${(hub ? 0.95 : 0.8) * alpha})`;
      ctx!.beginPath();
      ctx!.arc(x, y - r * 0.34, r * 0.27, 0, TAU);
      ctx!.fill();
      ctx!.beginPath();
      ctx!.arc(x, y + r * 0.3, r * 0.52, Math.PI, 0);
      ctx!.closePath();
      ctx!.fill();
    }

    function draw(elapsed: number) {
      const { weave, fade } = update(elapsed);
      ctx!.clearRect(0, 0, width, height);
      if (fade <= 0.01) return;

      // ---- links. Recomputed every frame, which is the point: the mesh is
      //      alive because the room is moving.
      // ponytail: O(n^2) pair scan, capped at 64 figures - grid buckets only
      // if the density ever goes past a few hundred.
      // `Math.hypot` is overflow-safe and correspondingly slow, and this is the
      // hottest line on the page. Most pairs are out of reach, so they are
      // rejected on the squared distance and only survivors pay for a sqrt.
      const linkDist2 = linkDist * linkDist;
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const dx = px[j] - px[i];
          const dy = py[j] - py[i];
          const d2 = dx * dx + dy * dy;
          if (d2 > linkDist2) continue;
          const d = Math.sqrt(d2);

          const strength = 1 - d / linkDist;
          const anchored = members[i].hub || members[j].hub;
          const alpha =
            strength *
            (anchored ? 0.95 : 0.62) *
            weave *
            fade *
            Math.min(guard(px[i], py[i]), guard(px[j], py[j]));
          if (alpha < 0.012) continue;

          ctx!.strokeStyle = `rgba(${CYAN}, ${alpha})`;
          ctx!.lineWidth = anchored ? 1.9 : 1.3;
          ctx!.beginPath();
          ctx!.moveTo(px[i], py[i]);
          ctx!.lineTo(px[j], py[j]);
          ctx!.stroke();
        }
      }

      // ---- introductions in flight, each with the tail it has just covered
      for (const s of signals) {
        const ax = px[s.from];
        const ay = py[s.from];
        const bx = px[s.to];
        const by = py[s.to];
        if (ax === undefined || bx === undefined) continue;
        if (Math.hypot(bx - ax, by - ay) > linkDist * 1.4) continue;

        const x = ax + (bx - ax) * s.t;
        const y = ay + (by - ay) * s.t;
        const tail = Math.max(0, s.t - 0.28);
        const a = weave * fade * guard(x, y);

        const grad = ctx!.createLinearGradient(ax + (bx - ax) * tail, ay + (by - ay) * tail, x, y);
        grad.addColorStop(0, `rgba(${CYAN}, 0)`);
        grad.addColorStop(1, `rgba(${CYAN}, ${0.9 * a})`);
        ctx!.strokeStyle = grad;
        ctx!.lineWidth = 2.4;
        ctx!.beginPath();
        ctx!.moveTo(ax + (bx - ax) * tail, ay + (by - ay) * tail);
        ctx!.lineTo(x, y);
        ctx!.stroke();

        ctx!.fillStyle = `rgba(${INK}, ${0.95 * a})`;
        ctx!.beginPath();
        ctx!.arc(x, y, 2.6, 0, TAU);
        ctx!.fill();
      }

      // ---- the members, and the ring left where an introduction landed
      for (let i = 0; i < members.length; i++) {
        const m = members[i];
        const a = fade * guard(px[i], py[i]);
        if (pr[i] < 0.4 || a < 0.02) continue;

        if (m.flash > 0.02) {
          ctx!.strokeStyle = `rgba(${CYAN}, ${m.flash * 0.7 * a})`;
          ctx!.lineWidth = 1.6;
          ctx!.beginPath();
          ctx!.arc(px[i], py[i], pr[i] * (1.6 + (1 - m.flash) * 2.4), 0, TAU);
          ctx!.stroke();
        }

        figure(px[i], py[i], pr[i] * (1 + m.flash * 0.12), a, m.hub);
      }
    }

    /* ----------------------------------------------------------------- loop */

    /**
     * Phones draw at 30fps.
     *
     * Everything here is driven off elapsed time rather than off a frame count,
     * so the drift and the signals travel at exactly the same speed either way -
     * the only thing halving costs is the fill, which is the thing a handset
     * runs out of. On a desktop the loop is left alone.
     */
    let lastFrame = 0;

    function step(now: number) {
      if (!started) started = now;
      if (width < 640 && now - lastFrame < 32) {
        if (!reduced && visible) frame = requestAnimationFrame(step);
        return;
      }
      lastFrame = now;
      draw(now - started);
      if (!reduced && visible) frame = requestAnimationFrame(step);
    }

    function start() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(step);
    }

    /* ------------------------------------------------------------ listeners */

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
      if (reduced) draw(ARRIVE_MS + WEAVE_MS);
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

    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => {
      build(true);
      draw(ARRIVE_MS + WEAVE_MS);
    };
    scheme.addEventListener('change', onScheme);

    build(true);

    if (reduced) {
      draw(ARRIVE_MS + WEAVE_MS);
    } else {
      // Only where there is something to part the crowd with. On touch,
      // `pointermove` fires all the way through a scroll drag, so the lens
      // shoved the room around every time the reader flicked the page.
      if (fine) {
        host.addEventListener('pointermove', onPointerMove);
        host.addEventListener('pointerleave', onPointerLeave);
      }
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
  }, [memberCount, chapterCount]);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}
