'use client';

import React, { useEffect, useRef } from 'react';

/**
 * The hero.
 *
 * The badge is struck, not drawn. This takes the official medallion artwork,
 * reads it as a relief map, and rebuilds it as a real object in three
 * dimensions: tens of thousands of points of metal, each one carrying the
 * colour of the pixel it came from and a surface normal taken from the slope of
 * the engraving around it. It is then lit, turned and projected properly, so the
 * light rakes across the flanks of the shield and the rim as the coin moves.
 * Nobody has a hero that is literally their own logo, in relief, under a moving
 * light.
 *
 * How many points is not a constant. The sampling raster is derived from the
 * radius the coin is actually drawn at, so the grain stays the same physical
 * size on a laptop and on a large monitor rather than the coin turning into a
 * mosaic of tiles as it gets bigger. Points are drawn slightly wider than that
 * pitch, which is load-bearing: two adjacent ANTIALIASED rectangles do not
 * compose to full coverage, and at exactly one pitch the background leaks
 * through every seam as a fine weave across the whole medallion.
 *
 * Four beats:
 *
 *   1. STRIKE   - the metal arrives as a swirling cloud and locks into the
 *                 medallion from the centre outward, the way a die stamps from
 *                 the middle of a blank. A shock ring leaves the rim on impact.
 *   2. TURN     - the coin holds and rotates. Specular is Blinn-Phong off the
 *                 relief normals, so the engraved edges are what glint, not a
 *                 gradient painted over the top.
 *   3. ORBIT    - the chapters ride three inclined rings around the medallion,
 *                 at real depth: a node behind the coin is drawn behind it,
 *                 smaller and dimmer, and a signal runs the ring between them.
 *                 A ping leaves the rim on a slow cycle.
 *   4. RECEDE   - bound to scroll position, not a threshold. Scrolling pushes
 *                 every point out along its own normal and pulls the camera
 *                 back, so the medallion comes apart into the cloud it was
 *                 struck from. Scrolling up re-strikes it. The reader scrubs it.
 *
 * The pointer does two things at once: it swings the camera a little, and it
 * moves the light a lot. Moving the light across metal is what makes metal read
 * as metal, and it makes the thing feel handled rather than watched.
 *
 * Written against 2D canvas with its own projection maths rather than a 3D
 * library: no dependency, a few hundred lines. Points live in typed arrays and
 * are depth-sorted with a counting sort, so a frame allocates nothing. Colour
 * strings are quantised and cached, and canvas state is only re-set when it
 * actually changes, because at this point count the state changes cost more
 * than the fills. A device that still cannot hold the frame gets the cloud
 * rebuilt at a coarser pitch rather than having points dropped out of it. The
 * loop is suspended off-screen and a single settled frame is drawn under
 * `prefers-reduced-motion`.
 */

type RGB = [number, number, number];

const TAU = Math.PI * 2;

/** How long the blank takes to become a coin. */
const STRIKE_MS = 2200;
/** Camera distance and focal length, in model units. The coin is 1 unit wide. */
const CAM = 2.9;
const FOV = 2.9;
/** Depth buckets for the painter's-algorithm sort. */
const BUCKETS = 96;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Reads a theme token as RGB. The custom properties are stored space-separated
 * so Tailwind's `<alpha-value>` works in CSS; canvas needs numbers.
 */
function tokenRGB(name: string, fallback: RGB): RGB {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return fallback;
  const parts = raw.split(/[\s,]+/).map(Number);
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return fallback;
  return [parts[0], parts[1], parts[2]];
}

/**
 * `fillStyle` takes a string, and building one per point per frame is four
 * thousand allocations a frame. Colours are quantised to five bits a channel
 * and each string is built once, so a frame sets styles without allocating.
 */
const STYLE_CACHE: string[] = new Array(32768);
function style(r: number, g: number, b: number): string {
  const ri = r < 0 ? 0 : r > 255 ? 255 : r | 0;
  const gi = g < 0 ? 0 : g > 255 ? 255 : g | 0;
  const bi = b < 0 ? 0 : b > 255 ? 255 : b | 0;
  const key = ((ri & 0xf8) << 7) | ((gi & 0xf8) << 2) | (bi >> 3);
  let cached = STYLE_CACHE[key];
  if (cached === undefined) {
    cached = `rgb(${ri & 0xf8},${gi & 0xf8},${bi & 0xf8})`;
    STYLE_CACHE[key] = cached;
  }
  return cached;
}

/**
 * Reduces an image toward a target size by repeated halving.
 *
 * Canvas resamples with a small bilinear kernel, so asking it to go from the
 * 440px artwork to a 150px raster in one step reads roughly a fifth of the
 * source pixels and folds the rest back as moire. On this artwork that lands
 * squarely on the portcullis engraved across the shield and the concentric
 * rings around the rim, and the medallion renders as a checkerboard. No single
 * reduction here is more than 2x, which is what bilinear can actually resolve.
 */
function halveToward(image: CanvasImageSource, tw: number, th: number): CanvasImageSource {
  let src = image;
  let w = (image as HTMLImageElement).width;
  let h = (image as HTMLImageElement).height;

  while (w > tw * 2 && h > th * 2) {
    const nw = Math.max(tw, Math.round(w / 2));
    const nh = Math.max(th, Math.round(h / 2));
    const c = document.createElement('canvas');
    c.width = nw;
    c.height = nh;
    const cc = c.getContext('2d');
    if (!cc) break;
    cc.imageSmoothingEnabled = true;
    cc.imageSmoothingQuality = 'high';
    cc.drawImage(src, 0, 0, nw, nh);
    src = c;
    w = nw;
    h = nh;
  }
  return src;
}

/**
 * Separable box blur over a single-channel field. Edges clamp.
 *
 * Used on the luminance the height field is built from, never on the colour.
 * Built once per cloud, so the cost is invisible.
 */
function blurField(src: Float32Array, S: number, r: number): Float32Array {
  if (r < 1) return src;
  const tmp = new Float32Array(S * S);
  const out = new Float32Array(S * S);
  const inv = 1 / (r * 2 + 1);

  for (let y = 0; y < S; y++) {
    const row = y * S;
    for (let x = 0; x < S; x++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) {
        const xx = x + k < 0 ? 0 : x + k > S - 1 ? S - 1 : x + k;
        sum += src[row + xx];
      }
      tmp[row + x] = sum * inv;
    }
  }
  for (let x = 0; x < S; x++) {
    for (let y = 0; y < S; y++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) {
        const yy = y + k < 0 ? 0 : y + k > S - 1 ? S - 1 : y + k;
        sum += tmp[yy * S + x];
      }
      out[y * S + x] = sum * inv;
    }
  }
  return out;
}

/**
 * The medallion, drawn from scratch, for the case where the artwork does not
 * load. Same sampling pipeline reads it, so the fallback is a coin too rather
 * than an empty hero: rim, rivets, escutcheon, chevron.
 */
function paintFallbackBadge(c: CanvasRenderingContext2D, S: number) {
  const m = S / 2;
  c.fillStyle = '#000';
  c.fillRect(0, 0, S, S);

  const disc = c.createRadialGradient(m * 0.7, m * 0.6, m * 0.1, m, m, m);
  disc.addColorStop(0, '#e9edf2');
  disc.addColorStop(0.6, '#aeb7c4');
  disc.addColorStop(1, '#6f7885');
  c.fillStyle = disc;
  c.beginPath();
  c.arc(m, m, m * 0.98, 0, TAU);
  c.fill();

  c.strokeStyle = '#f4f7fa';
  c.lineWidth = S * 0.012;
  for (const r of [0.92, 0.84, 0.74]) {
    c.beginPath();
    c.arc(m, m, m * r, 0, TAU);
    c.stroke();
  }

  // Rivets around the rim.
  c.fillStyle = '#fbfdff';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    c.beginPath();
    c.arc(m + Math.cos(a) * m * 0.88, m + Math.sin(a) * m * 0.88, S * 0.016, 0, TAU);
    c.fill();
  }

  // The escutcheon, split: steel-blue flank, polished flank.
  const w = m * 0.44;
  const shield = new Path2D();
  shield.moveTo(m - w, m - w * 1.05);
  shield.lineTo(m + w, m - w * 1.05);
  shield.lineTo(m + w, m + w * 0.25);
  shield.quadraticCurveTo(m + w, m + w * 0.95, m, m + w * 1.35);
  shield.quadraticCurveTo(m - w, m + w * 0.95, m - w, m + w * 0.25);
  shield.closePath();

  c.save();
  c.clip(shield);
  c.fillStyle = '#2e5274';
  c.fillRect(0, 0, m, S);
  c.fillStyle = '#dfe5ec';
  c.fillRect(m, 0, m, S);
  // The chevron device.
  c.fillStyle = '#f7fafd';
  c.beginPath();
  c.moveTo(m, m - w * 0.62);
  c.lineTo(m + w * 0.74, m + w * 0.06);
  c.lineTo(m + w * 0.42, m + w * 0.36);
  c.lineTo(m, m - w * 0.2);
  c.lineTo(m - w * 0.42, m + w * 0.36);
  c.lineTo(m - w * 0.74, m + w * 0.06);
  c.closePath();
  c.fill();
  c.restore();

  c.strokeStyle = '#ffffff';
  c.lineWidth = S * 0.014;
  c.stroke(shield);
}

export function HeroForge({
  className,
  /**
   * The official medallion, read as a relief map and never shown as an image.
   *
   * Tried in order, so the first entry can be the 440px WebP - 29kB, and the
   * detail the sampler needs on a large display, where the old 220px raster
   * ran out of engraving to read and the coin tiled. The PNG behind it covers
   * anything that cannot decode WebP; if both fail the badge is drawn.
   */
  sources = ['/brand-medallion-440.webp', '/brand-medallion-220.png'],
  /** Regional chapters. Sets how many nodes ride the orbits. */
  chapterCount = 6,
  /** Membership size. Sets how much traffic runs between them. */
  memberCount = 40,
}: {
  className?: string;
  sources?: string[];
  chapterCount?: number;
  memberCount?: number;
}) {
  const src = sources.join('|');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stage = (canvas.closest('[data-hero-stage]') as HTMLElement | null) ?? canvas;
    const host = (canvas.parentElement as HTMLElement | null) ?? canvas;

    let disposed = false;
    let width = 0;
    let height = 0;
    let frame = 0;
    let started = 0;
    let visible = true;
    let scrollT = 0;
    let ready = false;
    /** The decoded relief map, kept so a resize can re-raster it. */
    let relief: HTMLImageElement | null = null;
    /** The coin radius the current cloud was sampled for. */
    let builtForR = 0;

    /* ------------------------------------------------------------- palette */

    let INK: RGB = [240, 244, 250];
    let GROUND: RGB = [15, 19, 26];
    let STEEL: RGB = [82, 134, 184];
    let darkGround = true;

    function readPalette() {
      INK = tokenRGB('--ink', INK);
      GROUND = tokenRGB('--base', GROUND);
      STEEL = tokenRGB('--cyan', STEEL);
      darkGround = GROUND[0] * 0.299 + GROUND[1] * 0.587 + GROUND[2] * 0.114 < 128;
    }

    /* --------------------------------------------------------------- cloud */

    let N = 0;
    let tX!: Float32Array;
    let tY!: Float32Array;
    let tZ!: Float32Array;
    let nX!: Float32Array;
    let nY!: Float32Array;
    let nZ!: Float32Array;
    let sX!: Float32Array;
    let sY!: Float32Array;
    let sZ!: Float32Array;
    let cR!: Uint8Array;
    let cG!: Uint8Array;
    let cB!: Uint8Array;
    let pDelay!: Float32Array;
    let pSize!: Float32Array;
    let dX!: Float32Array;
    let dY!: Float32Array;
    let dZ!: Float32Array;
    /**
     * Per-frame scratch, reused so a frame allocates nothing.
     *
     * `qX/qY/qZ` hold each point's model-space position after the strike
     * interpolation and the scroll push. Both passes need them and they cost a
     * dozen multiply-adds each, which at thirty thousand points is worth not
     * paying twice.
     */
    let qX!: Float32Array;
    let qY!: Float32Array;
    let qZ!: Float32Array;
    /** Each point's strike progress, so the easing is evaluated once. */
    let qE!: Float32Array;
    let rZ!: Float32Array;
    let order!: Int32Array;
    const bucketAt = new Int32Array(BUCKETS + 1);

    /* -------------------------------------------------------------- orbits */

    interface Ring {
      /** Two orthonormal vectors spanning the ring's plane. */
      ux: number;
      uy: number;
      uz: number;
      vx: number;
      vy: number;
      vz: number;
      radius: number;
      speed: number;
    }
    interface Node {
      ring: number;
      angle: number;
      /** Traffic weight, from membership size. Sets how bright it burns. */
      weight: number;
    }

    let rings: Ring[] = [];
    let nodes: Node[] = [];

    function buildOrbits() {
      // Speeds are set so the nearest ring completes in about fourteen seconds
      // and the outer one in about thirty. Slower than this and a reader who
      // looks for three seconds cannot tell the chapters are moving at all.
      const tilts = [
        { inc: 0.42, roll: 0.2, radius: 0.63, speed: 0.00046 },
        { inc: -0.66, roll: 1.1, radius: 0.78, speed: -0.00031 },
        { inc: 1.24, roll: -0.5, radius: 0.9, speed: 0.00021 },
      ];
      rings = tilts.map(({ inc, roll, radius, speed }) => {
        // u is the ring's own x axis, rolled in plane; v is its y axis, tilted
        // out of the page. Both unit length, so a point is u·cos + v·sin.
        const cr = Math.cos(roll);
        const sr = Math.sin(roll);
        const ci = Math.cos(inc);
        const si = Math.sin(inc);
        return {
          ux: cr,
          uy: sr * ci,
          uz: sr * si,
          vx: -sr,
          vy: cr * ci,
          vz: cr * si,
          radius,
          speed,
        };
      });

      const count = Math.max(5, Math.min(14, chapterCount));
      nodes = Array.from({ length: count }, (_, i) => ({
        ring: i % rings.length,
        angle: (i / count) * TAU + (i % 3) * 0.4,
        weight: 0.5 + ((i * 37 + memberCount) % 50) / 100,
      }));
    }

    /* ---------------------------------------------------------- the relief */

    /**
     * Reads the artwork into a point cloud.
     *
     * Height is a dome plus the artwork's own luminance, so the coin is convex
     * and the engraving sits on top of the curve rather than replacing it. The
     * normal at each point comes from the slope of that height field, which is
     * what makes the specular land on the engraved edges.
     */
    function buildCloud(image: HTMLImageElement | null) {
      // The sampling pitch is chosen in SCREEN pixels, not in source pixels.
      //
      // A fixed sample budget spends the same number of points however big the
      // coin is drawn, which is exactly backwards: on a 2560 display the
      // medallion is twice the width it has on a 1280 laptop, so each point is
      // twice as wide and the surface reads as a mosaic of tiles rather than as
      // struck metal. Deriving the raster from R instead keeps the grain the
      // same physical size everywhere - the coin gets *more* points as it gets
      // bigger, not bigger ones.
      //
      // Below `lg` the medallion is a backdrop behind the copy at low alpha, so
      // it is sampled coarsely on purpose; there is nothing there to read.
      const wide = width >= 1024;
      // High-definition responsive micro-pixel pitch: 1.75px on desktop, 2.5px on mobile
      const pitchPx = wide ? 1.75 : 2.5;
      const maxS = wide ? 310 : 220;
      const S = Math.max(64, Math.min(maxS, Math.round((layout().R / pitchPx) * densityScale)));
      // One sample per raster pixel. The raster is already sized to the screen,
      // so a stride here would only undo the work above.
      const step = 1;

      const off = document.createElement('canvas');
      off.width = S;
      off.height = S;
      const octx = off.getContext('2d', { willReadFrequently: true });
      if (!octx) return;

      octx.fillStyle = '#000';
      octx.fillRect(0, 0, S, S);
      octx.imageSmoothingEnabled = true;
      octx.imageSmoothingQuality = 'high';
      if (image) {
        const fit = Math.min(S / image.width, S / image.height);
        const dw = image.width * fit;
        const dh = image.height * fit;
        octx.drawImage(halveToward(image, Math.ceil(dw), Math.ceil(dh)), (S - dw) / 2, (S - dh) / 2, dw, dh);
      } else {
        paintFallbackBadge(octx, S);
      }

      const data = octx.getImageData(0, 0, S, S).data;

      const lumAt = (px: number, py: number) => {
        const x = px < 0 ? 0 : px > S - 1 ? S - 1 : px;
        const y = py < 0 ? 0 : py > S - 1 ? S - 1 : py;
        const i = (y * S + x) * 4;
        if (data[i + 3] < 120) return 0;
        return (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
      };

      // The height field is built from a low-passed copy of the luminance.
      //
      // The artwork is a render of brushed metal and carries fine grain. At the
      // old coarse raster that grain was averaged away by the downsample; read
      // at full rate it lands in the height field, and since the normal is the
      // slope of that field, neighbouring points end up facing different ways.
      // The coin then renders as salt-and-pepper rather than as a surface -
      // more detail, but less legible, which is the opposite of the point.
      //
      // Only the geometry is smoothed. Colour is still taken per point, so the
      // engraving stays as sharp as the raster allows.
      const lumField = new Float32Array(S * S);
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) lumField[y * S + x] = lumAt(x, y);
      }
      // A fixed fraction of the coin, so the surface is equally smooth at every
      // sampling density rather than getting noisier as the raster grows.
      //
      // The radius is set by the worst aliasing in the artwork, which is the
      // portcullis engraved across the shield: a regular lattice of fine lines
      // beating against a regular lattice of sample points, which checkerboards
      // exactly the way two combs do. Low-passing the height field below the
      // pitch of those lines is what stops it.
      const smooth = blurField(lumField, S, Math.max(1, Math.round(S / 90)));
      const smoothAt = (px: number, py: number) => {
        const x = px < 0 ? 0 : px > S - 1 ? S - 1 : px;
        const y = py < 0 ? 0 : py > S - 1 ? S - 1 : py;
        return smooth[y * S + x];
      };

      const DOME = 0.3;
      const RELIEF = 0.17;
      /**
       * The coin's own convexity.
       *
       * Parabolic, not hemispherical. `sqrt(1 - r²)` is the true profile of a
       * sphere and its slope goes vertical at the edge, so two sample points a
       * pixel apart on the rim came out with normals tens of degrees apart -
       * one caught the light and its neighbour did not, all the way round. That
       * is the checkerboard that was eating the rim, and no amount of smoothing
       * the artwork touches it, because it is in the geometry rather than in
       * the image. A paraboloid has a bounded slope everywhere and, at a rise
       * of 0.3 across a disc of 1.0, is visually the same shallow cap.
       */
      const heightAt = (px: number, py: number) => {
        const mx = (px + 0.5) / S - 0.5;
        const my = 0.5 - (py + 0.5) / S;
        const rr = Math.min(1, Math.hypot(mx, my) / 0.5);
        const dome = 1 - rr * rr;
        return dome * DOME + (smoothAt(px, py) - 0.55) * RELIEF;
      };

      // Slopes are measured across a fixed fraction of the coin rather than
      // across one raster pixel, so the surface is lit identically at every
      // sampling density. Without this the normals sharpen as S rises and the
      // medallion is visibly more contrasty on a large monitor than a small one.
      const GRAD = Math.max(1, Math.round(S / 160));
      const gradScale = S / (2 * GRAD);

      const xs: number[] = [];
      const ys: number[] = [];
      const zs: number[] = [];
      const ns: number[] = [];
      const cs: number[] = [];

      for (let py = 0; py < S; py += step) {
        for (let px = 0; px < S; px += step) {
          const i = (py * S + px) * 4;
          const a = data[i + 3];
          const lum = lumAt(px, py);
          // The artwork sits on black. Anything that dark is the ground, not
          // the coin, and never becomes metal.
          if (a < 120 || lum < 0.085) continue;

          const mx = (px + 0.5) / S - 0.5;
          const my = 0.5 - (py + 0.5) / S;
          if (Math.hypot(mx, my) > 0.505) continue;

          const h = heightAt(px, py);
          const gx = (heightAt(px + GRAD, py) - heightAt(px - GRAD, py)) * gradScale;
          const gy = (heightAt(px, py - GRAD) - heightAt(px, py + GRAD)) * gradScale;
          // Softer than it was. At the old strength an engraved edge produced a
          // normal turned almost flat to the camera, so two neighbouring points
          // either side of a line came out white and black - the surface read as
          // noise rather than as relief.
          let vx = -gx * 0.24;
          let vy = -gy * 0.24;
          let vz = 1;
          const len = Math.hypot(vx, vy, vz) || 1;
          vx /= len;
          vy /= len;
          vz /= len;

          xs.push(mx);
          ys.push(my);
          zs.push(h);
          ns.push(vx, vy, vz);
          cs.push(data[i], data[i + 1], data[i + 2]);
        }
      }

      N = xs.length;
      if (N === 0) return;

      tX = new Float32Array(N);
      tY = new Float32Array(N);
      tZ = new Float32Array(N);
      nX = new Float32Array(N);
      nY = new Float32Array(N);
      nZ = new Float32Array(N);
      sX = new Float32Array(N);
      sY = new Float32Array(N);
      sZ = new Float32Array(N);
      cR = new Uint8Array(N);
      cG = new Uint8Array(N);
      cB = new Uint8Array(N);
      pDelay = new Float32Array(N);
      pSize = new Float32Array(N);
      dX = new Float32Array(N);
      dY = new Float32Array(N);
      dZ = new Float32Array(N);
      qX = new Float32Array(N);
      qY = new Float32Array(N);
      qZ = new Float32Array(N);
      qE = new Float32Array(N);
      rZ = new Float32Array(N);
      order = new Int32Array(N);

      const spacing = step / S;
      for (let i = 0; i < N; i++) {
        tX[i] = xs[i];
        tY[i] = ys[i];
        tZ[i] = zs[i];
        nX[i] = ns[i * 3];
        nY[i] = ns[i * 3 + 1];
        nZ[i] = ns[i * 3 + 2];
        cR[i] = cs[i * 3];
        cG[i] = cs[i * 3 + 1];
        cB[i] = cs[i * 3 + 2];

        // Where this point waits before the strike: a shell around the coin.
        const a = Math.random() * TAU;
        const u = Math.random() * 2 - 1;
        const s = Math.sqrt(1 - u * u);
        const rad = 1.7 + Math.random() * 1.9;
        sX[i] = Math.cos(a) * s * rad;
        sY[i] = u * rad * 0.75;
        sZ[i] = Math.sin(a) * s * rad * 0.8;

        // Centre locks first, rim last, as a die stamps a blank.
        pDelay[i] = clamp01(Math.hypot(xs[i], ys[i]) / 0.5) * 0.75 + Math.random() * 0.2;
        // Comfortably WIDER than the sampling pitch, which is the whole trick.
        //
        // Two adjacent antialiased rectangles do not compose to full coverage:
        // each contributes partial alpha to the pixels along the seam, and
        // under source-over the second one only covers part of what the first
        // left, so a quarter of the background survives at every join. Across a
        // regular lattice that is a fine dark grid over the entire coin - the
        // "checkerboard" that no amount of smoothing the artwork, the normals,
        // the dome or the alpha could remove, because it was a compositing
        // artefact rather than anything in the model. Once a point is wider
        // than its pitch by more than that spread, each seam falls inside a
        // neighbour's solid interior and there is nothing left to leak through.
        //
        // The margin is a fixed ~1.2px on screen rather than a fixed ratio,
        // because that is what antialiasing actually costs: a proportional
        // overlap would be wasteful at a coarse pitch and too thin at a fine one.
        pSize[i] = spacing * (1 + 1.2 / pitchPx + Math.random() * 0.05);

        // Scroll pushes each point off along its own normal, so the coin comes
        // apart as a surface rather than a fog.
        dX[i] = nX[i] * 0.8 + xs[i] * 1.4 + (Math.random() - 0.5) * 0.5;
        dY[i] = nY[i] * 0.8 + ys[i] * 1.4 + (Math.random() - 0.5) * 0.5;
        dZ[i] = nZ[i] * 0.9 + (Math.random() - 0.5) * 0.6;
      }

      ready = true;
    }

    /* -------------------------------------------------------------- camera */

    const pointer = { x: 0, y: 0, active: false };
    let yaw = -0.6;
    let pitch = 0.16;
    let yawTarget = 0;
    let pitchTarget = 0;
    let lightX = 0.42;
    let lightY = 0.62;
    let lightZ = 0.66;
    /** Frame budget, watched so a slow device sheds detail instead of frames. */
    let avgMs = 16;
    /**
     * How much of the target sampling density this device actually holds.
     *
     * The previous guard skipped every Nth point of the depth-sorted order and
     * drew the survivors wider. That is a random subsample of a regular
     * lattice, so it clumps: the medallion came out with holes torn in it and
     * looked worse than it had before any of this density work. Rebuilding the
     * cloud at a coarser pitch instead keeps the lattice regular, so a slow
     * device gets the same surface with a bigger grain rather than a broken one.
     *
     * Ratchets down only. A device that proves it cannot hold the frame keeps
     * the lower density for the session: stepping back up risks oscillating,
     * and a visible pulse in the grain is worse than a slightly coarse coin.
     */
    let densityScale = 1;
    let sinceDensityDrop = 0;

    function layout() {
      const wide = width >= 1024;
      return {
        // Pulled in off the right edge: at 0.735 a third of the outer orbit
        // was outside the frame and the coin read as a detail rather than as
        // the second half of the composition.
        cx: wide ? width * 0.7 : width * 0.5,
        cy: wide ? height * 0.47 : height * 0.4,
        // Model unit 1.0 in pixels. The coin is 1 unit across, the outer orbit
        // 1.8 - so R has to leave room for the orbit, not just the coin, or
        // the widest ring is cropped by the right edge of the frame.
        R: wide ? Math.min(width * 0.3, height * 0.56) : Math.min(width * 0.58, height * 0.34),
        // On a phone the coin is behind the headline rather than beside it, so
        // it stays a backdrop. On desktop it is the subject and runs at full.
        alpha: wide ? 1 : 0.42,
      };
    }

    function update(elapsed: number) {
      const rect = stage.getBoundingClientRect();
      const runway = Math.max(1, rect.height - window.innerHeight);
      scrollT = clamp01(-rect.top / runway);

      if (!reduced) {
        yawTarget = pointer.active ? pointer.x * 0.55 : 0;
        pitchTarget = pointer.active ? pointer.y * -0.3 : 0;
        // The coin is presented, not spun.
        //
        // A medallion turning through a full revolution spends most of its
        // time edge-on, where it is a bright smear rather than a badge - the
        // reader arrives, sees a sliver, and the whole point of striking their
        // own mark in relief is lost. So it rocks either side of face-on
        // instead: the relief stays legible the entire time and the light
        // still rakes across it. The full turn is saved for the recede, where
        // the coin coming apart is the thing being shown.
        const rock = Math.sin(elapsed * 0.00021) * 0.5 + Math.sin(elapsed * 0.00037) * 0.12;
        const spin = scrollT * scrollT * 7;
        yaw += (rock + spin + yawTarget - yaw) * 0.07;
        pitch += (0.16 + Math.sin(elapsed * 0.00035) * 0.09 + pitchTarget - pitch) * 0.06;

        // The pointer moves the light much further than it moves the camera.
        // Metal reads as metal when the highlight travels across it.
        //
        // With the pointer away the light keeps moving on its own, on a slow
        // figure-of-eight. A still light on a slowly turning coin is the thing
        // that made this read as a static picture: the relief is all in the
        // specular, and specular that never travels is just a texture.
        //
        // The idle path stays above the coin and reasonably frontal. Swung all
        // the way down to zero elevation the light rakes across the relief, and
        // a raking light multiplies every difference between two neighbouring
        // normals - which is how a surface with fine engraving on it turns into
        // a field of speckle. It still travels far enough to read.
        const swing = elapsed * 0.00041;
        const lx = pointer.active ? pointer.x * 0.95 : Math.sin(swing) * 0.62;
        const ly = pointer.active ? 0.35 - pointer.y * 0.85 : 0.46 + Math.cos(swing * 0.62) * 0.22;
        const ll = Math.hypot(lx, ly, 0.88) || 1;
        lightX += (lx / ll - lightX) * 0.08;
        lightY += (ly / ll - lightY) * 0.08;
        lightZ += (0.7 / ll - lightZ) * 0.08;
      } else {
        yaw = -0.34;
        pitch = 0.18;
      }
    }

    /* ---------------------------------------------------------------- draw */

    /**
     * The ground the medallion hangs in.
     *
     * A struck object needs something to be struck against. Without this the
     * coin sits on flat page colour and reads as a decal; with it there is a
     * pool of light behind the rim, so the metal has somewhere to be. It
     * breathes on a long cycle and follows the light, which is the cheapest
     * possible way to keep the frame alive between the strike and the scroll.
     */
    /**
     * The pool, rendered once into a small bitmap.
     *
     * It covers most of the viewport - nearly four times the coin's radius
     * across - and a radial gradient is evaluated per destination pixel. At a
     * 2000px window that was five million gradient samples every frame and by
     * far the most expensive thing on the canvas, points included. Blitting a
     * cached 192px bitmap up to size costs a scale instead, which is one draw
     * the compositor is built for. The alpha ramp lives in the bitmap; the
     * strength is applied with globalAlpha at blit time.
     */
    let poolBitmap: HTMLCanvasElement | null = null;
    let poolKey = '';

    function ensurePool() {
      const key = `${STEEL[0]},${STEEL[1]},${STEEL[2]}`;
      if (poolBitmap && poolKey === key) return;

      const P = 192;
      const c = document.createElement('canvas');
      c.width = P;
      c.height = P;
      const pc = c.getContext('2d');
      if (!pc) return;

      const g = pc.createRadialGradient(P / 2, P / 2, P * 0.04, P / 2, P / 2, P / 2);
      g.addColorStop(0, `rgba(${key},1)`);
      g.addColorStop(0.38, `rgba(${key},0.38)`);
      g.addColorStop(1, `rgba(${key},0)`);
      pc.fillStyle = g;
      pc.fillRect(0, 0, P, P);

      poolBitmap = c;
      poolKey = key;
    }

    function drawGround(elapsed: number, cx: number, cy: number, R: number, alpha: number) {
      const fade = (1 - scrollT * 0.95) * alpha;
      if (fade <= 0.01) return;

      ensurePool();
      if (!poolBitmap) return;

      const breathe = 0.84 + Math.sin(elapsed * 0.00072) * 0.16;
      // The pool leans the way the light does, by a fraction of the radius.
      const gx = cx + lightX * R * 0.22;
      const gy = cy - lightY * R * 0.22;
      const reach = R * 1.85;
      const peak = (darkGround ? 0.3 : 0.12) * fade * breathe;

      ctx!.globalCompositeOperation = darkGround ? 'lighter' : 'source-over';
      ctx!.globalAlpha = clamp01(peak);
      ctx!.drawImage(poolBitmap, gx - reach, gy - reach, reach * 2, reach * 2);
      ctx!.globalAlpha = 1;
      ctx!.globalCompositeOperation = 'source-over';
    }

    function drawCloud(elapsed: number, cx: number, cy: number, R: number, alpha: number) {
      if (!ready || N === 0) return;

      const progress = reduced ? 1 : easeOutCubic(clamp01(elapsed / STRIKE_MS));
      // One swirl for the whole cloud, computed once: per-point trig here costs
      // nine thousand sin/cos a frame and buys nothing visible.
      const swirl = (1 - progress) * 2.6;
      const cw = Math.cos(swirl);
      const sw = Math.sin(swirl);

      const cyaw = Math.cos(yaw);
      const syaw = Math.sin(yaw);
      const cpit = Math.cos(pitch);
      const spit = Math.sin(pitch);

      const cam = CAM + scrollT * 1.5;
      const push = scrollT * scrollT * 1.9;
      // The recede holds its presence and then goes, rather than dimming
      // linearly from the first pixel of scroll. On a linear ramp the coin was
      // already at a third of its strength by the time it had visibly started
      // to come apart, so the beat the runway exists for happened to something
      // the reader could no longer see.
      const fade = (1 - Math.pow(scrollT, 1.7) * 0.92) * alpha;
      if (fade <= 0.01) return;

      // Half vector, for Blinn-Phong. The view direction is +z in camera space.
      const hx = lightX;
      const hy = lightY;
      const hz = lightZ + 1;
      const hl = Math.hypot(hx, hy, hz) || 1;
      const bx = hx / hl;
      const by = hy / hl;
      const bz = hz / hl;

      bucketAt.fill(0);

      // ---- pass one: place every point, and count it into a depth bucket.
      for (let i = 0; i < N; i++) {
        let e = 1;
        if (!reduced) {
          // easeOutQuint, unrolled. `Math.pow` here is one call per point per
          // frame, and at thirty thousand points that is the single most
          // expensive line in the loop.
          const t = clamp01((progress - pDelay[i] * 0.55) / 0.45);
          const u = 1 - t;
          const u2 = u * u;
          e = 1 - u2 * u2 * u;
        }
        qE[i] = e;

        const ox = sX[i] * cw + sZ[i] * sw;
        const oz = -sX[i] * sw + sZ[i] * cw;
        const px = ox + (tX[i] + dX[i] * push - ox) * e;
        const py = sY[i] + (tY[i] + dY[i] * push - sY[i]) * e;
        const pz = oz + (tZ[i] + dZ[i] * push - oz) * e;

        qX[i] = px;
        qY[i] = py;
        qZ[i] = pz;

        const z1 = -px * syaw + pz * cyaw;
        const z2 = py * spit + z1 * cpit;

        rZ[i] = z2;
        let b = (((z2 + 1.6) / 3.2) * BUCKETS) | 0;
        if (b < 0) b = 0;
        else if (b >= BUCKETS) b = BUCKETS - 1;
        bucketAt[b + 1]++;
      }

      for (let b = 0; b < BUCKETS; b++) bucketAt[b + 1] += bucketAt[b];
      for (let i = 0; i < N; i++) {
        let b = (((rZ[i] + 1.6) / 3.2) * BUCKETS) | 0;
        if (b < 0) b = 0;
        else if (b >= BUCKETS) b = BUCKETS - 1;
        order[bucketAt[b]++] = i;
      }

      // ---- pass two: shade and draw, far to near.
      //
      // Painted, not accumulated. Points now sit at just over the sampling
      // pitch so they overlap slightly, and under `lighter` that overlap adds:
      // the medallion clipped to flat white and the shield in the middle of it
      // disappeared. Source-over paints each point at its own shaded colour,
      // so what the reader sees is the artwork's own silver and steel-blue
      // with a light on it. The additive work that is still wanted - the node
      // glows, the pool, the strike bloom - does it locally.
      ctx!.globalCompositeOperation = 'source-over';

      // `globalAlpha` and `fillStyle` are state changes, and at this point
      // count they cost more than the fills do. Points arrive depth-sorted, so
      // alpha moves slowly and monotonically and neighbours usually share a
      // quantised colour: tracking the last value written turns tens of
      // thousands of assignments into a few hundred.
      let lastAlphaQ = -1;
      let lastFill = '';

      for (let k = 0; k < N; k++) {
        const i = order[k];
        // Computed in pass one and kept: it costs a clamp and a fifth power,
        // which is not worth paying twice per point per frame.
        const e = qE[i];
        if (e <= 0.001) continue;

        const px = qX[i];
        const py = qY[i];
        const pz = qZ[i];

        const x1 = px * cyaw + pz * syaw;
        const z1 = -px * syaw + pz * cyaw;
        const y2 = py * cpit - z1 * spit;
        const z2 = rZ[i];

        const depth = cam - z2;
        if (depth < 0.35) continue;
        const k1 = FOV / depth;
        const sxp = cx + x1 * k1 * R;
        const syp = cy - y2 * k1 * R;
        if (sxp < -40 || sxp > width + 40 || syp < -40 || syp > height + 40) continue;

        // Normals ride the same rotation as the points.
        const mx = nX[i] * cyaw + nZ[i] * syaw;
        const mz1 = -nX[i] * syaw + nZ[i] * cyaw;
        const my = nY[i] * cpit - mz1 * spit;
        const mz = nY[i] * spit + mz1 * cpit;

        let diff = mx * lightX + my * lightY + mz * lightZ;
        if (diff < 0) diff = 0;
        let spec = mx * bx + my * by + mz * bz;
        // A broad highlight rather than a pinpoint one. At 26 the specular
        // covered a handful of points and was gone before the eye found it;
        // at 16 it is a band that visibly sweeps the relief as the light moves.
        // Raised by squaring rather than by `Math.pow`, for the same reason as
        // the easing above.
        if (spec < 0) {
          spec = 0;
        } else {
          const s2 = spec * spec;
          const s4 = s2 * s2;
          const s8 = s4 * s4;
          spec = s8 * s8;
        }
        // The limb: a surface turning away from the camera keeps a lit lip, as
        // a curved metal face does under a raking light.
        const facing = mz < 0 ? -mz : mz;
        const f1 = 1 - facing;
        const rim = f1 * f1 * f1 * 0.5;

        // Ambient is high enough that the shadowed flank is still metal rather
        // than a hole, and the diffuse term lands a lit face at about the
        // artwork's own silver instead of past it.
        const lit = 0.32 + diff * 0.74 + rim;
        const sizePx = Math.max(1, pSize[i] * k1 * R);
        // Depth of field, cheaply: distance dims, it does not blur.
        //
        // Calibrated against the depth the scene actually reaches - the camera
        // sits at 2.9 and the coin is half a unit thick, so nothing is ever
        // nearer than about 2.3. The previous curve bottomed out at 0.36 for
        // every point on the face of the medallion, which is why the whole
        // object rendered as a ghost of itself.
        const dim = clamp01(1.66 - depth * 0.28);

        let nextAlpha: number;
        let nextFill: string;

        if (darkGround) {
          // Depth dimming is shading, so it goes into the colour, not into the
          // alpha.
          //
          // Points sit at just over the sampling pitch, which means every one
          // overlaps its neighbours a little. Two overlapping semi-transparent
          // squares composite brighter than one, so across a regular lattice
          // the overlaps drew a regular weave over the whole medallion - the
          // checkerboard that survived every attempt to fix it in the artwork,
          // in the normals and in the dome, because it was never in any of
          // them. Multiplying the colour down instead lets the settled coin
          // draw fully opaque, and opaque squares have no seams.
          const glare = spec * 255 * dim;
          nextAlpha = clamp01(fade * (0.5 + e * 0.5));
          nextFill = style(
            cR[i] * lit * dim + glare,
            cG[i] * lit * dim + glare * 0.99,
            cB[i] * lit * dim + glare * 0.95,
          );
        } else {
          // On a pale ground the coin is engraved rather than lit: ink where
          // the light does not reach, paper where it does.
          //
          // Mixed toward the page's own ground rather than laid on as
          // translucent ink, for the same reason as above and with the sign
          // flipped: overlapping translucent marks stack up DARKER, so the
          // seams came out as a grid of double-inked lines. Held back from full
          // strength either way - ink at full strength on paper is a
          // silhouette, and the engraving is what should read.
          const shade = clamp01(1.12 - lit * 0.72 - spec * 0.6);
          const blue = clamp01((cB[i] - cR[i]) / 42);
          const k = clamp01(shade * dim * 0.72);
          nextAlpha = clamp01(fade * (0.5 + e * 0.5));
          nextFill = style(
            GROUND[0] + (INK[0] + (STEEL[0] - INK[0]) * blue - GROUND[0]) * k,
            GROUND[1] + (INK[1] + (STEEL[1] - INK[1]) * blue - GROUND[1]) * k,
            GROUND[2] + (INK[2] + (STEEL[2] - INK[2]) * blue - GROUND[2]) * k,
          );
        }

        // Quantised to 1/128, which is finer than the eye resolves against a
        // dark plate and coarse enough that a run of neighbouring points shares
        // one assignment.
        const alphaQ = (nextAlpha * 128) | 0;
        if (alphaQ !== lastAlphaQ) {
          lastAlphaQ = alphaQ;
          ctx!.globalAlpha = alphaQ / 128;
        }
        if (nextFill !== lastFill) {
          lastFill = nextFill;
          ctx!.fillStyle = nextFill;
        }

        ctx!.fillRect(sxp - sizePx * 0.5, syp - sizePx * 0.5, sizePx, sizePx);
      }

      ctx!.globalCompositeOperation = 'source-over';
      ctx!.globalAlpha = 1;
    }

    /** Projects a model-space point. Returns screen x, y and the scale factor. */
    function project(x: number, y: number, z: number, cx: number, cy: number, R: number, cam: number) {
      const cyaw = Math.cos(yaw);
      const syaw = Math.sin(yaw);
      const cpit = Math.cos(pitch);
      const spit = Math.sin(pitch);
      const x1 = x * cyaw + z * syaw;
      const z1 = -x * syaw + z * cyaw;
      const y2 = y * cpit - z1 * spit;
      const z2 = y * spit + z1 * cpit;
      const depth = Math.max(0.35, cam - z2);
      const k = FOV / depth;
      return { x: cx + x1 * k * R, y: cy - y2 * k * R, z: z2, k };
    }

    /**
     * The chapters, riding their rings. Drawn in two passes so the half of each
     * orbit behind the coin is genuinely behind it.
     */
    function drawOrbits(elapsed: number, side: number, cx: number, cy: number, R: number, alpha: number) {
      const cam = CAM + scrollT * 1.5;
      const arrive = clamp01((elapsed - STRIKE_MS * 0.55) / 1200);
      if (arrive <= 0) return;
      const fade = (1 - Math.pow(scrollT, 1.7) * 0.94) * alpha * arrive;
      if (fade <= 0.01) return;

      const steel = `${STEEL[0]},${STEEL[1]},${STEEL[2]}`;
      const ink = darkGround ? '255,255,255' : `${INK[0]},${INK[1]},${INK[2]}`;

      // ---- the rings themselves
      ctx!.lineWidth = 1;
      for (const ring of rings) {
        const SEG = 44;
        for (let s = 0; s < SEG; s++) {
          const a0 = (s / SEG) * TAU;
          const a1 = ((s + 1) / SEG) * TAU;
          const p0 = project(
            (ring.ux * Math.cos(a0) + ring.vx * Math.sin(a0)) * ring.radius,
            (ring.uy * Math.cos(a0) + ring.vy * Math.sin(a0)) * ring.radius,
            (ring.uz * Math.cos(a0) + ring.vz * Math.sin(a0)) * ring.radius,
            cx,
            cy,
            R,
            cam,
          );
          if (p0.z * side < 0) continue;
          const p1 = project(
            (ring.ux * Math.cos(a1) + ring.vx * Math.sin(a1)) * ring.radius,
            (ring.uy * Math.cos(a1) + ring.vy * Math.sin(a1)) * ring.radius,
            (ring.uz * Math.cos(a1) + ring.vz * Math.sin(a1)) * ring.radius,
            cx,
            cy,
            R,
            cam,
          );
          const near = clamp01(0.35 + p0.z * 0.6);
          ctx!.strokeStyle = `rgba(${steel},${(side > 0 ? 0.52 : 0.2) * near * fade})`;
          ctx!.beginPath();
          ctx!.moveTo(p0.x, p0.y);
          ctx!.lineTo(p1.x, p1.y);
          ctx!.stroke();
        }
      }

      // ---- a signal running each ring, drawn as a short lit arc with a head.
      //      The rings are the routes between chapters; something has to be
      //      travelling them or they are three drawn ellipses.
      if (!reduced) {
        for (let r = 0; r < rings.length; r++) {
          const ring = rings[r];
          const head = elapsed * (0.00058 + r * 0.00016) + r * 2.1;
          const TRAIL = 9;
          for (let s = TRAIL; s > 0; s--) {
            const a0 = head - s * 0.055;
            const a1 = head - (s - 1) * 0.055;
            const p0 = project(
              (ring.ux * Math.cos(a0) + ring.vx * Math.sin(a0)) * ring.radius,
              (ring.uy * Math.cos(a0) + ring.vy * Math.sin(a0)) * ring.radius,
              (ring.uz * Math.cos(a0) + ring.vz * Math.sin(a0)) * ring.radius,
              cx,
              cy,
              R,
              cam,
            );
            if (p0.z * side < 0) continue;
            const p1 = project(
              (ring.ux * Math.cos(a1) + ring.vx * Math.sin(a1)) * ring.radius,
              (ring.uy * Math.cos(a1) + ring.vy * Math.sin(a1)) * ring.radius,
              (ring.uz * Math.cos(a1) + ring.vz * Math.sin(a1)) * ring.radius,
              cx,
              cy,
              R,
              cam,
            );
            // Brightest at the head, gone by the tail.
            const heat = (1 - (s - 1) / TRAIL) ** 2;
            ctx!.strokeStyle = `rgba(${steel},${heat * (side > 0 ? 0.85 : 0.3) * fade})`;
            ctx!.lineWidth = 1 + heat * 1.6;
            ctx!.beginPath();
            ctx!.moveTo(p0.x, p0.y);
            ctx!.lineTo(p1.x, p1.y);
            ctx!.stroke();
          }
        }
        ctx!.lineWidth = 1;
      }

      // ---- the nodes, and the traffic between the ones that can see each other
      const placed: Array<{ x: number; y: number; z: number; k: number; w: number }> = [];
      for (const node of nodes) {
        const ring = rings[node.ring];
        const a = node.angle + elapsed * ring.speed;
        const p = project(
          (ring.ux * Math.cos(a) + ring.vx * Math.sin(a)) * ring.radius,
          (ring.uy * Math.cos(a) + ring.vy * Math.sin(a)) * ring.radius,
          (ring.uz * Math.cos(a) + ring.vz * Math.sin(a)) * ring.radius,
          cx,
          cy,
          R,
          cam,
        );
        placed.push({ ...p, w: node.weight });
      }

      for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
          const a = placed[i];
          const b = placed[j];
          if (a.z * side < 0 || b.z * side < 0) continue;
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > R * 0.7) continue;
          const near = clamp01(0.3 + (a.z + b.z) * 0.35);
          ctx!.strokeStyle = `rgba(${steel},${(1 - d / (R * 0.7)) * 0.5 * near * fade})`;
          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y);
          ctx!.lineTo(b.x, b.y);
          ctx!.stroke();
        }
      }

      for (const p of placed) {
        if (p.z * side < 0) continue;
        const size = Math.max(2, 3.8 * p.k) * (0.8 + p.w * 0.4);
        const near = clamp01(0.35 + p.z * 0.65);
        const pulse = 0.66 + Math.sin(elapsed * 0.0022 + p.w * 9) * 0.34;

        ctx!.globalCompositeOperation = darkGround ? 'lighter' : 'source-over';
        ctx!.fillStyle = `rgba(${steel},${0.3 * near * fade * pulse})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, size * 3.4, 0, TAU);
        ctx!.fill();
        ctx!.fillStyle = `rgba(${ink},${0.95 * near * fade})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, size * 0.5, 0, TAU);
        ctx!.fill();
        ctx!.globalCompositeOperation = 'source-over';

        ctx!.strokeStyle = `rgba(${steel},${0.8 * near * fade})`;
        ctx!.lineWidth = 1.4;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, size, 0, TAU);
        ctx!.stroke();
      }
      ctx!.globalAlpha = 1;
    }

    /**
     * The shock ring off the strike, and the slow ping the coin puts out
     * afterwards. Screen-space circles: they read as a wave leaving the rim.
     */
    function drawWaves(elapsed: number, cx: number, cy: number, R: number, alpha: number) {
      const fade = (1 - scrollT) * alpha;
      if (fade <= 0.01) return;
      const steel = `${STEEL[0]},${STEEL[1]},${STEEL[2]}`;

      const shock = clamp01((elapsed - STRIKE_MS * 0.72) / 900);
      if (shock > 0 && shock < 1) {
        const e = easeOutCubic(shock);
        // A bloom off the die at the instant of impact, then the ring leaving
        // the rim. The bloom is what gives the strike a moment of weight.
        if (darkGround && e < 0.55) {
          const bloom = (1 - e / 0.55) ** 2;
          const reach = R * 1.5;
          const flash = ctx!.createRadialGradient(cx, cy, 0, cx, cy, reach);
          flash.addColorStop(0, `rgba(255,255,255,${bloom * 0.3 * fade})`);
          flash.addColorStop(0.35, `rgba(${steel},${bloom * 0.2 * fade})`);
          flash.addColorStop(1, `rgba(${steel},0)`);
          ctx!.globalCompositeOperation = 'lighter';
          ctx!.fillStyle = flash;
          ctx!.fillRect(cx - reach, cy - reach, reach * 2, reach * 2);
          ctx!.globalCompositeOperation = 'source-over';
        }

        ctx!.strokeStyle = `rgba(${steel},${(1 - e) * 0.8 * fade})`;
        ctx!.lineWidth = 3.5 * (1 - e) + 0.5;
        ctx!.beginPath();
        ctx!.arc(cx, cy, R * (0.42 + e * 0.85), 0, TAU);
        ctx!.stroke();

        // A second, faster ring half a beat ahead, so the impact reads as a
        // shock rather than as one expanding circle.
        const e2 = easeOutCubic(clamp01(shock * 1.45));
        ctx!.strokeStyle = `rgba(${steel},${(1 - e2) * 0.4 * fade})`;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.arc(cx, cy, R * (0.42 + e2 * 1.25), 0, TAU);
        ctx!.stroke();
      }

      if (reduced || elapsed < STRIKE_MS) return;
      const cycle = 4600;
      for (let w = 0; w < 2; w++) {
        const t = (((elapsed - STRIKE_MS + w * cycle * 0.5) % cycle) / cycle) as number;
        const e = easeOutCubic(t);
        ctx!.strokeStyle = `rgba(${steel},${(1 - t) * (1 - t) * 0.36 * fade})`;
        ctx!.lineWidth = 1.2;
        ctx!.beginPath();
        ctx!.arc(cx, cy, R * (0.5 + e * 1.05), 0, TAU);
        ctx!.stroke();
      }
    }

    function draw(elapsed: number) {
      update(elapsed);
      const { cx, cy, R, alpha } = layout();

      ctx!.clearRect(0, 0, width, height);
      drawGround(elapsed, cx, cy, R, alpha);
      drawOrbits(elapsed, -1, cx, cy, R, alpha);
      drawCloud(elapsed, cx, cy, R, alpha);
      drawOrbits(elapsed, 1, cx, cy, R, alpha);
      drawWaves(elapsed, cx, cy, R, alpha);
    }

    /* ---------------------------------------------------------------- loop */

    function step(now: number) {
      if (disposed) return;
      if (!started) started = now;
      const t0 = performance.now();
      draw(now - started);

      // If the device cannot hold the frame, shed detail rather than frames.
      //
      // Nothing is measured until the strike is over: the opening is the most
      // expensive part of the whole sequence and it runs alongside hydration,
      // so judging the device on it would downgrade machines that are perfectly
      // capable of the settled scene. After that, a sustained overrun costs one
      // rung of density, at most three times.
      avgMs += (performance.now() - t0 - avgMs) * 0.05;

      if (now - started > STRIKE_MS + 1400 && ++sinceDensityDrop > 45) {
        if (avgMs > 11 && densityScale > 0.45) {
          // A device that is merely over budget loses one rung; one that is
          // nowhere near it loses two, so it reaches a frame rate it can hold
          // in about a second rather than degrading visibly for eight.
          const rungs = avgMs > 22 ? 2 : 1;
          densityScale = Math.max(0.45, densityScale - 0.17 * rungs);
          rebuildCloud();
          sinceDensityDrop = 0;
        }
      }

      if (!reduced && visible) frame = requestAnimationFrame(step);
    }

    function start() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(step);
    }

    /** Re-rasters the relief for the size and density now in force. */
    function rebuildCloud() {
      buildCloud(relief);
      builtForR = layout().R;
    }

    /* ------------------------------------------------------------- sizing */

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const nextW = Math.max(1, rect.width);
      const nextH = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      width = nextW;
      height = nextH;
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* ---------------------------------------------------------- listeners */

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas!.getBoundingClientRect();
      const { cx, cy, R } = layout();
      pointer.x = Math.max(-1.6, Math.min(1.6, (e.clientX - rect.left - cx) / R));
      pointer.y = Math.max(-1.6, Math.min(1.6, (e.clientY - rect.top - cy) / R));
      pointer.active = true;
    };
    const onPointerLeave = () => {
      pointer.active = false;
    };

    /**
     * The cloud is rasterised for the size the coin is drawn at, so a window
     * that changes size enough to change that has to rebuild it - otherwise
     * dragging a window from a laptop screen to a large monitor leaves the
     * medallion sampled for the small one, which is the tiling this density
     * work exists to remove.
     *
     * Debounced and thresholded: a rebuild re-reads the artwork and reallocates
     * every buffer, so it must not run on each frame of a drag, and a few
     * pixels of iOS URL-bar movement must not trigger it at all.
     */
    let rebuildTimer = 0;
    const cancelRebuild = () => window.clearTimeout(rebuildTimer);
    const maybeRebuild = () => {
      cancelRebuild();
      rebuildTimer = window.setTimeout(() => {
        if (disposed || !ready) return;
        const nextR = layout().R;
        if (builtForR > 0 && Math.abs(nextR - builtForR) / builtForR < 0.2) return;
        rebuildCloud();
        if (reduced) draw(STRIKE_MS * 2);
      }, 260);
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      maybeRebuild();
      if (reduced) draw(STRIKE_MS * 2);
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
      readPalette();
      if (reduced) draw(STRIKE_MS * 2);
    };
    scheme.addEventListener('change', onScheme);

    /* ------------------------------------------------------------ kick off */

    readPalette();
    resize();
    buildOrbits();

    const image = new Image();
    image.decoding = 'async';

    const begin = (img: HTMLImageElement | null) => {
      if (disposed) return;
      relief = img;
      buildCloud(img);
      builtForR = layout().R;
      if (reduced) {
        draw(STRIKE_MS * 2);
      } else {
        host.addEventListener('pointermove', onPointerMove);
        host.addEventListener('pointerleave', onPointerLeave);
        start();
      }
    };

    // Walks the source list, so a browser that cannot decode WebP silently
    // falls through to the PNG rather than losing the medallion.
    let attempt = 0;
    const tryNext = () => {
      if (disposed) return;
      if (attempt >= sources.length) {
        // Nothing decodable: the badge is drawn rather than left an empty hero.
        begin(null);
        return;
      }
      image.src = sources[attempt++];
    };
    image.onload = () => begin(image);
    image.onerror = tryNext;
    tryNext();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cancelRebuild();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      scheme.removeEventListener('change', onScheme);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerleave', onPointerLeave);
      image.onload = null;
      image.onerror = null;
    };
  }, [src, chapterCount, memberCount]);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}
