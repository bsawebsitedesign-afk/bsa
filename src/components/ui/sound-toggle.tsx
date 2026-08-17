'use client';

import React, { useState } from 'react';

export function CyberSoundToggle() {
  const [active, setActive] = useState(false);

  const toggleSound = () => {
    setActive(!active);
    if (!active && typeof window !== 'undefined') {
      try {
        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } catch {
        // Fallback gracefully
      }
    }
  };

  return (
    <button
      type="button"
      onClick={toggleSound}
      title={active ? 'Cyber Sound FX Active' : 'Enable Cyber Sound FX'}
      className="inline-flex items-center gap-2 rounded-xl border border-cyan/40 bg-surface/80 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-cyan transition-all hover:border-cyan hover:bg-cyan/10"
    >
      <span className="flex items-end gap-0.5 h-3">
        <span className={`w-0.5 bg-cyan rounded-full transition-all ${active ? 'h-3 animate-pulse' : 'h-1.5'}`} />
        <span className={`w-0.5 bg-cyan rounded-full transition-all ${active ? 'h-2 animate-bounce' : 'h-2.5'}`} />
        <span className={`w-0.5 bg-cyan rounded-full transition-all ${active ? 'h-3.5 animate-pulse' : 'h-1'}`} />
      </span>
      <span>{active ? 'AUDIO FX: ON' : 'AUDIO FX'}</span>
    </button>
  );
}
