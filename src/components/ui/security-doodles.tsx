'use client';

import React from 'react';

/** Hand-drawn hand-crafted SVG security doodles and vision icons */

export function CurlyArrowDoodle({ className = 'w-16 h-12 text-cyan' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M10 15 C 30 5, 60 10, 75 30 C 85 42, 60 55, 45 45 C 35 38, 50 20, 85 35"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="4 2"
        className="animate-pulse"
      />
      <path d="M75 25 L88 36 L72 42" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShieldDoodle({ className = 'w-12 h-12 text-cyan' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M32 6 L54 14 V30 C54 44 42 54 32 58 C22 54 10 44 10 30 V14 L32 6 Z"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="round"
        className="drop-shadow-[0_0_12px_rgba(120,168,215,0.6)]"
      />
      <path d="M32 20 V38" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M23 29 H41" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function VisionTargetDoodle({ className = 'w-16 h-16 text-cyan' }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 4" />
      <circle cx="40" cy="40" r="20" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="40" cy="40" r="6" fill="currentColor" />
      <path d="M40 4 V16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M40 64 V76" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M4 40 H16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M64 40 H76" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function ScribbleUnderline({ className = 'w-full h-4 text-cyan' }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} preserveAspectRatio="none">
      <path
        d="M5 12 Q 75 4, 150 14 T 295 10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SecurityNodeDoodle({ className = 'w-20 h-20 text-cyan' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <line x1="20" y1="20" x2="80" y2="30" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <line x1="80" y1="30" x2="60" y2="80" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <line x1="60" y1="80" x2="20" y2="20" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <line x1="20" y1="20" x2="50" y2="50" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <line x1="80" y1="30" x2="50" y2="50" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <line x1="60" y1="80" x2="50" y2="50" stroke="currentColor" strokeWidth="2" opacity="0.6" />

      <circle cx="20" cy="20" r="7" fill="#78A8D7" />
      <circle cx="80" cy="30" r="7" fill="#2E5274" />
      <circle cx="60" cy="80" r="7" fill="#78A8D7" />
      <circle cx="50" cy="50" r="9" fill="#FFFFFF" stroke="#78A8D7" strokeWidth="3" />
    </svg>
  );
}

export function PodcastMicDoodle({ className = 'w-16 h-16 text-cyan' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="24" y="10" width="16" height="26" rx="8" stroke="currentColor" strokeWidth="3" fill="currentColor" fillOpacity="0.1" />
      <path d="M16 28 C16 38 23 44 32 44 C41 44 48 38 48 28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 44 V54" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M22 54 H42" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M8 20 C6 25 6 31 8 36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 2" className="animate-pulse" />
      <path d="M56 20 C58 25 58 31 56 36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 2" className="animate-pulse" />
    </svg>
  );
}

export function SoundWaveDoodle({ className = 'w-24 h-12 text-cyan' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M10 20 H18 M26 10 V30 M34 4 V36 M42 14 V26 M50 2 V38 M58 8 V32 M66 16 V24 M74 4 V36 M82 12 V28 M90 20 H98" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

export function BroadcastTowerDoodle({ className = 'w-16 h-16 text-cyan' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M32 16 L14 56 H50 L32 16 Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="32" cy="12" r="4" fill="currentColor" />
      <path d="M24 8 C28 4 36 4 40 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-pulse" />
      <path d="M18 4 C26 -2 38 -2 46 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-pulse" />
      <path d="M22 34 H42 M26 44 H38" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

export function HeadphonesDoodle({ className = 'w-16 h-16 text-cyan' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M12 36 V28 C12 17 21 8 32 8 C43 8 52 17 52 28 V36" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <rect x="8" y="32" width="10" height="18" rx="5" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="3" />
      <rect x="46" y="32" width="10" height="18" rx="5" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
