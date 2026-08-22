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
        const angle = Math.round((lng + 180) % 360);
        const distance = Math.min(85, Math.max(25, Math.round(25 + ((90 - lat) / 180) * 60)));
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

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const center = width / 2;
      const radius = center * 0.86;

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
      const grad = ctx.createConicGradient(sweepAngle, center, center);
      grad.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
      grad.addColorStop(0.12, 'rgba(6, 182, 212, 0.08)');
      grad.addColorStop(0.28, 'rgba(6, 182, 212, 0.0)');
      grad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.fill();

      // Leading Radar Sweep Line
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(center + radius * Math.cos(sweepAngle), center + radius * Math.sin(sweepAngle));
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Render Chapter Beacons
      displayChapters.forEach((ch) => {
        const rad = (ch.angle * Math.PI) / 180;
        const dist = (ch.distance / 100) * radius;
        const x = center + dist * Math.cos(rad);
        const y = center + dist * Math.sin(rad);

        const isSelected = activeChapter.slug === ch.slug;
        const isHover = hovered?.slug === ch.slug;

        // Outer Beacon Ring
        ctx.strokeStyle = isSelected
          ? 'rgba(0, 240, 255, 0.9)'
          : isHover
          ? 'rgba(198, 244, 50, 0.9)'
          : 'rgba(6, 182, 212, 0.4)';
        ctx.lineWidth = isSelected || isHover ? 2 : 1;
        ctx.beginPath();
        ctx.arc(x, y, isSelected ? 8 : 6, 0, Math.PI * 2);
        ctx.stroke();

        // Pulsing Solid Core
        ctx.fillStyle = isSelected ? '#00F0FF' : isHover ? '#C6F432' : '#22D3EE';
        ctx.shadowColor = isSelected ? '#00F0FF' : '#22D3EE';
        ctx.shadowBlur = isSelected ? 12 : 4;
        ctx.beginPath();
        ctx.arc(x, y, isSelected ? 4 : 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // City Label near beacon
        ctx.fillStyle = isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)';
        ctx.font = isSelected ? 'bold 10px monospace' : '9px monospace';
        ctx.fillText(ch.city.split(',')[0], x + 9, y + 3);
      });

      angle = (angle + 1.2) % 360;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
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
            5 HUBS CONNECTED · {activeChapter.ping}ms
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
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs font-bold transition-all duration-200 cursor-pointer ${
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
