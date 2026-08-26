'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export interface ChapterNode {
  slug: string;
  name: string;
  city: string;
  region: string;
  country: string;
  lead: string;
  cadence: string;
  coordinates: string;
  contactEmail: string;
  angle: number; // in degrees
  distance: number; // percentage radius (25% - 85%)
  active: boolean;
  ping: number;
  emoji: string;
}

const DEFAULT_REAL_CHAPTERS: ChapterNode[] = [
  {
    slug: 'bsa-new-york',
    name: 'BSA New York',
    city: 'New York, NY',
    region: 'Northeast United States',
    country: 'United States',
    lead: 'Michael Anderson',
    cadence: 'Monthly Sessions',
    coordinates: '40.71° N, 74.01° W',
    contactEmail: 'ny-lead@businesssecurityalliance.com',
    angle: 135,
    distance: 65,
    active: true,
    ping: 24,
    emoji: '🗽',
  },
  {
    slug: 'bsa-texas',
    name: 'BSA Texas',
    city: 'Austin, TX',
    region: 'South Central United States',
    country: 'United States',
    lead: 'Sarah Mitchell',
    cadence: 'Bi-Monthly Sessions',
    coordinates: '30.27° N, 97.74° W',
    contactEmail: 'texas-lead@businesssecurityalliance.com',
    angle: 215,
    distance: 70,
    active: true,
    ping: 32,
    emoji: '🤠',
  },
  {
    slug: 'bsa-california',
    name: 'BSA California',
    city: 'Los Angeles, CA',
    region: 'Western United States',
    country: 'United States',
    lead: 'David Carter',
    cadence: 'Monthly Sessions',
    coordinates: '34.05° N, 118.24° W',
    contactEmail: 'california-lead@businesssecurityalliance.com',
    angle: 285,
    distance: 80,
    active: true,
    ping: 38,
    emoji: '🌴',
  },
  {
    slug: 'bsa-florida',
    name: 'BSA Florida',
    city: 'Miami, FL',
    region: 'Southeast United States',
    country: 'United States',
    lead: 'Jessica Morgan',
    cadence: 'Quarterly Sessions',
    coordinates: '25.76° N, 80.19° W',
    contactEmail: 'florida-lead@businesssecurityalliance.com',
    angle: 165,
    distance: 50,
    active: true,
    ping: 28,
    emoji: '☀️',
  },
  {
    slug: 'bsa-london',
    name: 'BSA London',
    city: 'London, UK',
    region: 'Europe',
    country: 'United Kingdom',
    lead: 'James Wilson',
    cadence: 'Monthly Sessions',
    coordinates: '51.51° N, 0.13° W',
    contactEmail: 'london-lead@businesssecurityalliance.com',
    angle: 45,
    distance: 60,
    active: true,
    ping: 42,
    emoji: '🏛️',
  },
];

export function GlobalSecurityRadar({
  className,
  chapters,
}: {
  className?: string;
  chapters?: Array<{
    slug: string;
    name: string;
    region: string;
    city: string;
    country: string;
    latitude?: number | null;
    longitude?: number | null;
    emoji?: string | null;
    meetingCadence?: string | null;
    contactEmail?: string | null;
    isActive?: boolean;
  }>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const displayChapters: ChapterNode[] = React.useMemo(() => {
    if (chapters && chapters.length > 0) {
      return chapters.map((ch, idx) => {
        const lat = ch.latitude ?? 40.71;
        const lng = ch.longitude ?? -74.01;

        // Smart geographic-to-radar polar projection with sector distribution
        // Map longitude (-180..+180) to angle (0..360) and latitude (-90..+90) to radial distance
        let angle = Math.round((lng + 180) % 360);
        let distance = Math.min(82, Math.max(30, Math.round(30 + ((85 - lat) / 170) * 52)));

        // Slight micro-offset for identical coordinates to prevent stacked dots
        angle = (angle + (idx * 5) % 15) % 360;

        const pingMs = 20 + ((idx * 7) % 30);

        return {
          slug: ch.slug,
          name: ch.name,
          city: ch.city,
          region: ch.region,
          country: ch.country,
          lead: ch.name.replace('BSA ', '') + ' Lead',
          cadence: ch.meetingCadence || 'Quarterly Sessions',
          coordinates: `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(2)}° ${lng >= 0 ? 'E' : 'W'}`,
          contactEmail: ch.contactEmail || `${ch.slug}@businesssecurityalliance.com`,
          angle,
          distance,
          active: ch.isActive ?? true,
          ping: pingMs,
          emoji: ch.emoji || '⬡',
        };
      });
    }
    return DEFAULT_REAL_CHAPTERS;
  }, [chapters]);

  const [activeChapter, setActiveChapter] = useState<ChapterNode>(displayChapters[0] || DEFAULT_REAL_CHAPTERS[0]);
  const [hovered, setHovered] = useState<ChapterNode | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle = 0;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // The radar sits a long way down a 14,000px page. Without this it kept
    // sweeping at 60fps the whole time the reader was anywhere else on the
    // site, which is where the scroll jank was coming from.
    let visible = false;

    // The sweep wedge is always the same wedge - only its rotation changes, and
    // the context can be rotated instead. Rebuilding it per frame allocated a
    // gradient object every 16ms.
    const sweep = ctx.createConicGradient(0, 0, 0);
    sweep.addColorStop(0, 'rgba(6, 182, 212, 0.42)');
    sweep.addColorStop(0.12, 'rgba(6, 182, 212, 0.08)');
    sweep.addColorStop(0.28, 'rgba(6, 182, 212, 0.0)');
    sweep.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const center = width / 2;
      const radius = center * 0.84;

      ctx.clearRect(0, 0, width, height);

      // Radar Concentric Circles with cyber grid glow
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.16)';
      ctx.lineWidth = 1;

      [0.25, 0.5, 0.75, 1].forEach((r) => {
        ctx.beginPath();
        ctx.arc(center, center, radius * r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Crosshair Lines
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.22)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(center - radius, center);
      ctx.lineTo(center + radius, center);
      ctx.moveTo(center, center - radius);
      ctx.lineTo(center, center + radius);
      ctx.stroke();
      ctx.setLineDash([]);

      // Diagonal Range Axes
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
      ctx.beginPath();
      const diag = radius * 0.707;
      ctx.moveTo(center - diag, center - diag);
      ctx.lineTo(center + diag, center + diag);
      ctx.moveTo(center - diag, center + diag);
      ctx.lineTo(center + diag, center - diag);
      ctx.stroke();

      // Rotating Radar Beam (Conic Gradient)
      const sweepAngle = (angle * Math.PI) / 180;
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(sweepAngle);
      ctx.fillStyle = sweep;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Leading Radar Sweep Line. Two strokes rather than a shadow: a canvas
      // shadow is a real blur pass, and this one ran every frame.
      const sx = center + radius * Math.cos(sweepAngle);
      const sy = center + radius * Math.sin(sweepAngle);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.22)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(sx, sy);
      ctx.stroke();
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(sx, sy);
      ctx.stroke();

      // First Pass: Calculate Screen Positions of Nodes
      const nodesWithPos = displayChapters.map((ch) => {
        const rad = (ch.angle * Math.PI) / 180;
        const dist = (ch.distance / 100) * radius;
        const x = center + dist * Math.cos(rad);
        const y = center + dist * Math.sin(rad);
        return { ch, x, y };
      });

      // Render Beacon Dots
      nodesWithPos.forEach(({ ch, x, y }) => {
        const isSelected = activeChapter.slug === ch.slug;
        const isHover = hovered?.slug === ch.slug;

        // Outer Beacon Ring
        ctx.strokeStyle = isSelected
          ? 'rgba(0, 240, 255, 0.95)'
          : isHover
          ? 'rgba(198, 244, 50, 0.95)'
          : 'rgba(6, 182, 212, 0.5)';
        ctx.lineWidth = isSelected || isHover ? 2 : 1;
        ctx.beginPath();
        ctx.arc(x, y, isSelected ? 8 : 6, 0, Math.PI * 2);
        ctx.stroke();

        // Halo, then core. Same read as a shadow at a fraction of the cost.
        ctx.fillStyle = isSelected ? 'rgba(0, 240, 255, 0.28)' : 'rgba(34, 211, 238, 0.16)';
        ctx.beginPath();
        ctx.arc(x, y, isSelected ? 10 : 6.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isSelected ? '#00F0FF' : isHover ? '#C6F432' : '#22D3EE';
        ctx.beginPath();
        ctx.arc(x, y, isSelected ? 4 : 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Second Pass: De-conflicted Label Placement with Dark Pill Backgrounds & Leader Lines
      interface PlacedLabel {
        x: number;
        y: number;
        w: number;
        h: number;
      }
      const placedLabels: PlacedLabel[] = [];

      nodesWithPos.forEach(({ ch, x, y }) => {
        const cityName = ch.city.split(',')[0].trim();
        const isSelected = activeChapter.slug === ch.slug;

        ctx.font = isSelected ? 'bold 10px monospace' : '9px monospace';
        const textWidth = ctx.measureText(cityName).width;
        const pillWidth = textWidth + 10;
        const pillHeight = 15;

        // Candidate offsets relative to dot (Right, Left, Bottom, Top, Diagonals)
        const candidates = [
          { lx: x + 12, ly: y - 7, align: 'left', drawX: x + 12, drawY: y - 7 },
          { lx: x - pillWidth - 12, ly: y - 7, align: 'right', drawX: x - 12, drawY: y - 7 },
          { lx: x - pillWidth / 2, ly: y + 12, align: 'center', drawX: x, drawY: y + 12 },
          { lx: x - pillWidth / 2, ly: y - 22, align: 'center', drawX: x, drawY: y - 22 },
          { lx: x + 14, ly: y + 10, align: 'left', drawX: x + 14, drawY: y + 10 },
          { lx: x - pillWidth - 14, ly: y + 10, align: 'right', drawX: x - 14, drawY: y + 10 },
        ];

        // Choose candidate that does not collide with already placed labels
        let chosen = candidates[0];
        for (const cand of candidates) {
          const candBox = { x: cand.lx, y: cand.ly, w: pillWidth, h: pillHeight };
          const collides = placedLabels.some((prev) => {
            return !(
              candBox.x + candBox.w + 4 < prev.x ||
              candBox.x > prev.x + prev.w + 4 ||
              candBox.y + candBox.h + 2 < prev.y ||
              candBox.y > prev.y + prev.h + 2
            );
          });

          if (!collides) {
            chosen = cand;
            break;
          }
        }

        // Clamp label inside canvas bounds
        let finalLx = Math.max(4, Math.min(width - pillWidth - 4, chosen.lx));
        let finalLy = Math.max(4, Math.min(height - pillHeight - 4, chosen.ly));

        placedLabels.push({ x: finalLx, y: finalLy, w: pillWidth, h: pillHeight });

        // Draw leader line if label is displaced significantly
        const centerPillX = finalLx + pillWidth / 2;
        const centerPillY = finalLy + pillHeight / 2;
        const distFromDot = Math.hypot(centerPillX - x, centerPillY - y);

        if (distFromDot > 18) {
          ctx.strokeStyle = isSelected ? 'rgba(0, 240, 255, 0.6)' : 'rgba(6, 182, 212, 0.35)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(centerPillX, centerPillY);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Draw Pill Background Box for ultra legibility
        ctx.fillStyle = isSelected ? 'rgba(7, 14, 28, 0.92)' : 'rgba(11, 15, 25, 0.85)';
        ctx.strokeStyle = isSelected ? 'rgba(0, 240, 255, 0.8)' : 'rgba(6, 182, 212, 0.35)';
        ctx.lineWidth = isSelected ? 1.5 : 1;

        // Rounded Rect Pill
        const radius = 3;
        ctx.beginPath();
        ctx.roundRect(finalLx, finalLy, pillWidth, pillHeight, radius);
        ctx.fill();
        ctx.stroke();

        // Draw City Text inside Pill
        ctx.fillStyle = isSelected ? '#00F0FF' : '#E2E8F0';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(cityName, finalLx + 5, finalLy + pillHeight / 2 + 0.5);
      });

      angle = (angle + 1.2) % 360;
      if (visible && !reduced) animId = requestAnimationFrame(render);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        const now = entry?.isIntersecting ?? true;
        if (now === visible) return;
        visible = now;
        cancelAnimationFrame(animId);
        if (visible && !reduced) animId = requestAnimationFrame(render);
      },
      { threshold: 0 },
    );
    observer.observe(canvas);

    // One frame regardless, so the radar is never blank before it is reached.
    render();

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
    };
  }, [activeChapter, hovered, displayChapters]);

  return (
    <div
      className={`relative flex flex-col items-center justify-between p-6 border border-cyan/40 bg-[#0B0F19] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden ${className}`}
    >
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-cyan/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-violet/15 blur-3xl" />

      {/* Header Bar */}
      <div className="relative mb-3 flex w-full items-center justify-between border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan shadow-[0_0_10px_#06b6d4]"></span>
          </span>
          <span className="font-mono text-xs font-black uppercase tracking-widest text-cyan">
            GLOBAL CHAPTER RADAR
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse" />
          <span className="font-mono text-[10px] font-bold text-lime uppercase tracking-wider">
            {displayChapters.length} HUBS CONNECTED · {activeChapter.ping}ms
          </span>
        </div>
      </div>

      {/* Radar Canvas & Telemetry Display */}
      <div className="relative flex w-full flex-col sm:flex-row items-center justify-center gap-6 py-2">
        {/* Animated Radar Canvas */}
        <div className="relative flex h-60 w-60 sm:h-64 sm:w-64 items-center justify-center shrink-0">
          <canvas ref={canvasRef} width={300} height={300} className="h-full w-full cursor-pointer" />
          <div className="pointer-events-none absolute inset-0 rounded-full border border-cyan/20 shadow-[inset_0_0_20px_rgba(6,182,212,0.15)]" />
        </div>

        {/* Live Chapter Telemetry Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeChapter.slug}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full sm:flex-1 rounded-xl border border-cyan/40 bg-[#111726] p-4 space-y-3 shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-cyan">
                  ACTIVE CHAPTER NODE
                </span>
                <h4 className="text-base font-black text-white flex items-center gap-1.5 mt-0.5">
                  <span>{activeChapter.emoji}</span>
                  <span>{activeChapter.name}</span>
                </h4>
                <p className="text-xs font-medium text-white/70">{activeChapter.city} · {activeChapter.region}</p>
              </div>
              <span className="rounded-full border border-lime/50 bg-lime/15 px-2 py-0.5 font-mono text-[9px] font-bold text-lime">
                ONLINE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10 font-mono text-xs">
              <div className="rounded-lg bg-[#070A12] p-2.5 border border-white/10">
                <span className="text-[9px] font-bold text-cyan uppercase tracking-wider block">CHAPTER LEAD</span>
                <span className="font-bold text-white text-[11px] truncate block mt-0.5">{activeChapter.lead}</span>
              </div>
              <div className="rounded-lg bg-[#070A12] p-2.5 border border-white/10">
                <span className="text-[9px] font-bold text-cyan uppercase tracking-wider block">MEETING CADENCE</span>
                <span className="font-bold text-white text-[11px] block mt-0.5">{activeChapter.cadence}</span>
              </div>
              <div className="rounded-lg bg-[#070A12] p-2.5 border border-white/10">
                <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider block">COORDINATES</span>
                <span className="font-bold text-slate-300 text-[10px] block mt-0.5">{activeChapter.coordinates}</span>
              </div>
              <div className="rounded-lg bg-[#070A12] p-2.5 border border-white/10">
                <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider block">CONTACT</span>
                <span className="font-bold text-cyan text-[10px] truncate block mt-0.5">{activeChapter.contactEmail}</span>
              </div>
            </div>

            <div className="pt-1">
              <Link
                href={`/chapters/${activeChapter.slug}`}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-cyan/50 bg-cyan/20 px-3 py-2 text-xs font-bold text-cyan-bright transition-all hover:bg-cyan hover:text-black shadow-sm group"
              >
                <span>Open Chapter Hub</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Interactive Chapter Selector Pills */}
      <div className="relative mt-4 flex w-full flex-wrap items-center justify-center gap-2 border-t border-white/10 pt-4">
        {displayChapters.map((ch) => {
          const isSelected = activeChapter.slug === ch.slug;
          return (
            <button
              key={ch.slug}
              type="button"
              onClick={() => setActiveChapter(ch)}
              onMouseEnter={() => setHovered(ch)}
              onMouseLeave={() => setHovered(null)}
              className={`flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs font-bold transition-all duration-200 ${
                isSelected
                  ? 'border-cyan bg-cyan/25 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)] scale-105'
                  : 'border-white/15 bg-white/5 text-white/80 hover:border-cyan/50 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>{ch.emoji}</span>
              <span>{ch.city.split(',')[0]}</span>
              <span className="text-[10px] text-cyan/70 font-mono">[{ch.region.split(' ')[0]}]</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
