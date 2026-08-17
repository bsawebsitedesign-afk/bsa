'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TiltCard } from '@/components/ui/scroll';
import { Sticker } from '@/components/ui/misc';
import { Chip } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const DOMAINS = [
  { id: 'cyber', label: 'Cyber Defense', icon: '🛡️', color: 'from-cyan/30 to-blue-600/30' },
  { id: 'ai', label: 'AI Security & Ethics', icon: '🤖', color: 'from-purple-500/30 to-indigo-600/30' },
  { id: 'risk', label: 'Executive Risk', icon: '⚡', color: 'from-amber-500/30 to-orange-600/30' },
  { id: 'zerotrust', label: 'Zero-Trust Architect', icon: '🔐', color: 'from-emerald-500/30 to-teal-600/30' },
];

export function SecurityPassportForge() {
  const [name, setName] = useState('Alex Rivera');
  const [handle, setHandle] = useState('@arivera_sec');
  const [domain, setDomain] = useState(DOMAINS[0]);
  const [level, setLevel] = useState('LEVEL 04 // EXECUTIVE PASS');

  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-surface/95 p-6 lg:p-10 shadow-panel">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-violet/15 blur-3xl" />

      <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
        {/* Controls Column */}
        <div className="space-y-6 lg:col-span-6">
          <div>
            <Sticker tone="magenta" rotate={-2}>
              🔥 BUILD YOUR SECURITY IDENTITY
            </Sticker>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white">
              Create Your <span className="text-3d-pop-cyan italic">3D Executive Passport</span>
            </h2>
            <p className="mt-2 text-sm font-semibold text-ink-soft">
              Customize your verified digital credential. Share your domain expertise across the global network.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="passport-name-input" className="block font-mono text-xs font-bold uppercase tracking-wider text-cyan">
                Full Name
              </label>
              <input
                id="passport-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line bg-base/80 px-4 py-2.5 font-sans font-bold text-white placeholder-ink-soft focus:border-cyan focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="passport-handle-input" className="block font-mono text-xs font-bold uppercase tracking-wider text-cyan">
                Network Handle
              </label>
              <input
                id="passport-handle-input"
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line bg-base/80 px-4 py-2.5 font-mono font-bold text-cyan placeholder-ink-soft focus:border-cyan focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-mono text-xs font-bold uppercase tracking-wider text-cyan">
                Security Discipline
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2.5">
                {DOMAINS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDomain(d)}
                    className={`flex items-center gap-2 rounded-xl border p-3 font-mono text-xs font-bold transition-all ${
                      domain.id === d.id
                        ? 'border-cyan bg-cyan/20 text-white shadow-panel'
                        : 'border-line bg-surface/60 text-ink-soft hover:border-cyan/40 hover:text-white'
                    }`}
                  >
                    <span>{d.icon}</span>
                    <span className="truncate">{d.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Live Interactive 3D Preview Card */}
        <div className="lg:col-span-6 flex justify-center">
          <TiltCard strength={15} className="w-full max-w-sm">
            <motion.div
              layout
              className={`relative overflow-hidden rounded-3xl border-2 border-white/20 bg-gradient-to-br ${domain.color} bg-surface/90 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl`}
            >
              {/* Top Security Hologram Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-cyan animate-ping" />
                  <span className="font-mono text-[10px] font-extrabold uppercase tracking-[0.2em] text-cyan">
                    BSA // PASSPORT ID
                  </span>
                </div>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-[10px] font-extrabold text-white">
                  VERIFIED
                </span>
              </div>

              {/* Identity Details */}
              <div className="mt-6 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-cyan/40 bg-cyan/20 text-2xl shadow-panel">
                  {domain.icon}
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-white tracking-tight leading-tight">
                    {name || 'Alex Rivera'}
                  </h3>
                  <p className="font-mono text-xs font-bold text-cyan">{handle || '@arivera'}</p>
                </div>
              </div>

              {/* Domain & Rank Chips */}
              <div className="mt-6 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Chip tone="lime" size="sm" className="font-bold">
                    {domain.label}
                  </Chip>
                  <Chip tone="tangerine" size="sm" className="font-bold">
                    EXECUTIVE PASS
                  </Chip>
                </div>
                <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/70">
                  {level}
                </p>
              </div>

              {/* Bottom Hologram Barcode & Action */}
              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <div className="font-mono text-[11px] font-bold text-cyan">
                  BSA-NX-88402
                </div>
                <Button href="/register" tone="magenta" size="sm" arrow>
                  Claim Passport
                </Button>
              </div>
            </motion.div>
          </TiltCard>
        </div>
      </div>
    </div>
  );
}
