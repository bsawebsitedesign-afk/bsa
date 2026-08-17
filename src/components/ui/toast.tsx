'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from '@phosphor-icons/react/dist/ssr';
import { cn } from '@/lib/utils';

export type ToastTone = 'success' | 'error' | 'info' | 'lime' | 'magenta' | 'violet' | 'tangerine';

export interface ToastInput {
  title: string;
  body?: string;
  emoji?: string;
  tone?: ToastTone;
}

interface Toast extends ToastInput {
  id: number;
}

interface ToastApi {
  push: (toast: ToastInput) => void;
  success: (title: string, body?: string) => void;
  error: (title: string, body?: string) => void;
  info: (title: string, body?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const TONES: Record<ToastTone, { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: 'bg-emerald/20', border: 'border-emerald/40', text: 'text-emerald', icon: '✓' },
  lime: { bg: 'bg-cyan/20', border: 'border-cyan/40', text: 'text-cyan', icon: '✓' },
  error: { bg: 'bg-rose/20', border: 'border-rose/40', text: 'text-rose', icon: '✕' },
  magenta: { bg: 'bg-magenta/20', border: 'border-magenta/40', text: 'text-magenta', icon: '★' },
  info: { bg: 'bg-cyan/20', border: 'border-cyan/40', text: 'text-cyan', icon: 'ℹ' },
  violet: { bg: 'bg-violet/20', border: 'border-violet/40', text: 'text-violet-bright', icon: '✦' },
  tangerine: { bg: 'bg-amber/20', border: 'border-amber/40', text: 'text-amber', icon: '⚡' },
};

const DISMISS_AFTER_MS = 5400;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const reduced = useReducedMotion();

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (toast: ToastInput) => {
      const id = nextId.current++;
      // At most four on screen; the oldest falls off the top.
      setToasts((current) => [...current.slice(-3), { ...toast, id }]);
      setTimeout(() => remove(id), DISMISS_AFTER_MS);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (title, body) => push({ title, body, tone: 'success' }),
      error: (title, body) => push({ title, body, tone: 'error' }),
      info: (title, body) => push({ title, body, tone: 'info' }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-6 right-6 z-[90] flex w-[min(380px,calc(100vw-3rem))] flex-col gap-3"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const tone = TONES[toast.tone ?? 'info'];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
                animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="pointer-events-auto relative flex items-start gap-3.5 rounded-2xl border border-line bg-surface/95 p-4 shadow-panel-lg backdrop-blur-xl"
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border text-xs font-black shadow-sm',
                    tone.bg,
                    tone.border,
                    tone.text,
                  )}
                  aria-hidden
                >
                  {toast.emoji ?? tone.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold leading-snug text-white text-ink">{toast.title}</p>
                  {toast.body && <p className="mt-1 text-xs leading-relaxed text-ink-muted">{toast.body}</p>}
                </div>
                <button
                  onClick={() => remove(toast.id)}
                  aria-label="Dismiss"
                  className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-raised hover:text-white"
                >
                  <X weight="bold" className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
