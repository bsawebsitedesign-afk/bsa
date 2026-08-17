'use client';

import React from 'react';
import { ShieldDoodle, VisionTargetDoodle, SecurityNodeDoodle, ScribbleUnderline } from '@/components/ui/security-doodles';
import { Sticker } from '@/components/ui/misc';
import { TiltCard } from '@/components/ui/scroll';

const GOALS = [
  {
    icon: '🛡️',
    title: 'Zero-Trust Defense Architecture',
    blurb: 'Empowering security leaders to implement resilient zero-trust frameworks across physical and digital perimeters.',
    badge: 'MISSION 01',
    tone: 'lime' as const,
  },
  {
    icon: '🌐',
    title: 'Global Executive Intelligence',
    blurb: 'Connecting verified C-suite security officers, CISOs, and directors across 80+ countries for real-time peer alignment.',
    badge: 'MISSION 02',
    tone: 'magenta' as const,
  },
  {
    icon: '⚡',
    title: 'Live Threat Telemetry & Intel',
    blurb: 'Sharing actionable field intelligence, post-mortems, and emergency directives before vendor advisories drop.',
    badge: 'MISSION 03',
    tone: 'tangerine' as const,
  },
  {
    icon: '🎓',
    title: 'Practitioner Mentorship & Career Growth',
    blurb: 'Accelerating the next generation of security talent through direct 1-on-1 executive mentorship and board seat pathways.',
    badge: 'MISSION 04',
    tone: 'cobalt' as const,
  },
];

export function SecurityVisionGrid() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-surface/90 p-8 lg:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl">
      {/* Background Doodles */}
      <ShieldDoodle className="pointer-events-none absolute -right-4 -top-4 h-32 w-32 text-cyan/20 rotate-12" />
      <VisionTargetDoodle className="pointer-events-none absolute -left-6 -bottom-6 h-40 w-40 text-violet/20" />

      <div className="relative text-center max-w-3xl mx-auto">
        <Sticker tone="lime" rotate={-2}>
          ✦ ALLIANCE GOAL & VISION DIRECTIVE
        </Sticker>
        <h2 className="mt-4 text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-tight">
          Pioneering the <span className="text-3d-pop-cyan italic">Future of Security</span>
        </h2>
        <div className="mt-2 mx-auto w-48">
          <ScribbleUnderline className="w-full h-4 text-cyan" />
        </div>
        <p className="mt-4 text-base font-semibold text-white/80 leading-relaxed max-w-2xl mx-auto">
          The Business Security Alliance unites elite security practitioners, researchers, and executive leaders under one shared operational mission.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {GOALS.map((goal) => (
          <TiltCard key={goal.title} strength={12} className="h-full">
            <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-white/15 bg-base/80 p-6 shadow-panel transition-all duration-300 hover:border-cyan/80 hover:bg-surface-raised hover:shadow-[0_15px_35px_rgba(0,0,0,0.5)]">
              {/* Header Badge & Icon */}
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan/30 bg-cyan/10 text-2xl shadow-panel transition-transform duration-300 group-hover:scale-110">
                    {goal.icon}
                  </span>
                  <Sticker tone={goal.tone} rotate={2} className="text-[10px]">
                    {goal.badge}
                  </Sticker>
                </div>

                <h3 className="mt-5 text-xl font-black text-white leading-snug tracking-tight transition-colors group-hover:text-cyan">
                  {goal.title}
                </h3>
                <p className="mt-3 text-xs font-semibold text-white/75 leading-relaxed">
                  {goal.blurb}
                </p>
              </div>

              {/* Action Indicator */}
              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-3 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-cyan">
                <span>DIRECTIVE ACTIVE</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </div>
            </div>
          </TiltCard>
        ))}
      </div>
    </div>
  );
}
