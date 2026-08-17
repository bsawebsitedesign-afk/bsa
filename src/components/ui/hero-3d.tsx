'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { LogoMark } from '@/components/logo';

export function Hero3DMedallion({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -18;
    const rotateY = ((x - centerX) / centerX) * 18;

    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setRotate({ x: rotateX, y: rotateY });
    setGlare({ x: glareX, y: glareY, opacity: 0.25 });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
    setGlare({ x: 50, y: 50, opacity: 0 });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative flex items-center justify-center p-8 transition-transform duration-200 ease-out cursor-pointer group"
      style={{ perspective: 1200 }}
    >
      {/* Outer ambient glow */}
      <div className="absolute inset-4 rounded-full bg-cyan/15 blur-3xl transition-opacity duration-500 group-hover:bg-cyan/25" />

      {/* 3D Container */}
      <motion.div
        animate={{ rotateX: rotate.x, rotateY: rotate.y }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative flex h-64 w-64 items-center justify-center rounded-full border border-cyan/30 bg-surface-raised/90 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:h-72 sm:w-72"
      >
        {/* Beveled Rim 1 */}
        <div
          className="absolute inset-2 rounded-full border border-cyan/40 bg-gradient-to-br from-surface-high via-surface to-surface-inset shadow-inner"
          style={{ transform: 'translateZ(10px)' }}
        />

        {/* Beveled Rim 2 (Riveted Metal look) */}
        <div
          className="absolute inset-5 rounded-full border-2 border-line-bright/60 bg-gradient-to-tl from-cyan-deep/30 via-transparent to-white/10"
          style={{ transform: 'translateZ(20px)' }}
        />

        {/* Inner Glare Overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full transition-opacity duration-300"
          style={{
            transform: 'translateZ(25px)',
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.opacity}), transparent 60%)`,
          }}
        />

        {/* Center Medallion Emblem */}
        <div
          className="relative flex h-40 w-40 items-center justify-center drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:scale-105"
          style={{ transform: 'translateZ(40px)' }}
        >
          <LogoMark className="h-full w-full" />
        </div>

        {/* Floating Satellite Ring */}
        <div
          className="pointer-events-none absolute -inset-4 rounded-full border border-cyan/20 animate-spin"
          style={{ animationDuration: '30s', transform: 'translateZ(5px)' }}
        />

        <div
          className="pointer-events-none absolute -inset-8 rounded-full border border-line/30 border-dashed animate-spin"
          style={{ animationDuration: '45s', animationDirection: 'reverse', transform: 'translateZ(-10px)' }}
        />
      </motion.div>
    </div>
  );
}
