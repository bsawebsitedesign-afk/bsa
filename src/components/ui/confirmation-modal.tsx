'use client';

import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from './button';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badgeText?: string;
  badgeTone?: 'cyan' | 'lime' | 'amber' | 'magenta' | 'violet';
  details?: Array<{ label: string; value: string }>;
  primaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  icon?: string;
}

const TONE_CLASSES = {
  cyan: {
    glow: 'shadow-glow-cyan border-cyan/40 bg-cyan/10 text-cyan-bright',
    badge: 'bg-cyan/20 border-cyan/40 text-cyan',
    buttonTone: 'lime' as const,
  },
  lime: {
    glow: 'shadow-glow-lime border-lime/40 bg-lime/10 text-lime',
    badge: 'bg-lime/20 border-lime/40 text-lime',
    buttonTone: 'lime' as const,
  },
  amber: {
    glow: 'shadow-glow-amber border-amber/40 bg-amber/10 text-amber',
    badge: 'bg-amber/20 border-amber/40 text-amber',
    buttonTone: 'tangerine' as const,
  },
  magenta: {
    glow: 'shadow-glow-magenta border-magenta/40 bg-magenta/10 text-magenta',
    badge: 'bg-magenta/20 border-magenta/40 text-magenta',
    buttonTone: 'magenta' as const,
  },
  violet: {
    glow: 'shadow-glow-violet border-violet/40 bg-violet/10 text-violet-bright',
    badge: 'bg-violet/20 border-violet/40 text-violet-bright',
    buttonTone: 'violet' as const,
  },
};

export function ConfirmationModal({
  isOpen,
  onClose,
  title,
  subtitle,
  badgeText,
  badgeTone = 'lime',
  details = [],
  primaryAction,
  secondaryAction,
  icon = '🎉',
}: ConfirmationModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const tone = TONE_CLASSES[badgeTone] ?? TONE_CLASSES.lime;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-void/80 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-full max-w-lg overflow-hidden border border-line bg-surface p-6 sm:p-8 shadow-panel-lg z-10"
          >
            {/* Top decorative sheen */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-grad-brand" />

            <div className="text-center space-y-4">
              {/* Animated Icon Medallion */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 350 }}
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border text-3xl ${tone.glow}`}
              >
                {icon}
              </motion.div>

              {/* Title & Subtitle */}
              <div>
                {badgeText && (
                  <span className={`inline-block mb-2 rounded border px-3 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest ${tone.badge}`}>
                    {badgeText}
                  </span>
                )}
                <h3 className="text-2xl font-extrabold text-white text-ink tracking-tight">{title}</h3>
                {subtitle && <p className="mt-2 text-sm leading-relaxed text-ink-muted">{subtitle}</p>}
              </div>

              {/* Details List */}
              {details.length > 0 && (
                <div className="my-4 border border-dashed border-line bg-surface-inset p-4 rounded text-left font-mono text-xs space-y-2">
                  {details.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b border-line/40 pb-1.5 last:border-b-0 last:pb-0">
                      <span className="text-ink-muted">{item.label}</span>
                      <strong className="text-white text-ink font-bold">{item.value}</strong>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 flex flex-col sm:flex-row justify-center gap-3">
                {primaryAction && (
                  <Button
                    href={primaryAction.href}
                    onClick={() => {
                      if (primaryAction.onClick) primaryAction.onClick();
                      onClose();
                    }}
                    tone={tone.buttonTone}
                    size="md"
                    className="w-full sm:w-auto"
                  >
                    {primaryAction.label}
                  </Button>
                )}
                {secondaryAction ? (
                  <Button
                    href={secondaryAction.href}
                    onClick={() => {
                      if (secondaryAction.onClick) secondaryAction.onClick();
                      onClose();
                    }}
                    tone="paper"
                    size="md"
                    className="w-full sm:w-auto"
                  >
                    {secondaryAction.label}
                  </Button>
                ) : (
                  <Button onClick={onClose} tone="paper" size="md" className="w-full sm:w-auto">
                    Close
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
