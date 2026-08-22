'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from '@phosphor-icons/react';
import { cn, type Accent } from '@/lib/utils';

/**
 * Dialog.
 *
 * Escape closes it, background scroll is locked while it is open, focus moves
 * into the panel and returns to the trigger on close, and Tab is trapped
 * inside. The backdrop darkens and blurs the plate rather than hiding it, so
 * the reader keeps their place on the page underneath.
 */
export function Modal({
  open,
  onClose,
  title,
  kicker,
  tone = 'violet',
  size = 'md',
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  kicker?: string;
  tone?: Accent | 'ink';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();

  const accents: Record<string, string> = {
    lime: 'before:bg-cyan text-cyan',
    magenta: 'before:bg-grad-brand text-cyan-bright',
    violet: 'before:bg-violet text-violet-bright',
    tangerine: 'before:bg-amber text-amber',
    cobalt: 'before:bg-violet-deep text-violet-bright',
    ink: 'before:bg-line-bright text-ink-soft',
  };

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl' };

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    returnFocusTo.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    const focusTimer = window.setTimeout(() => {
      if (!panelRef.current?.contains(document.activeElement)) {
        const target = panelRef.current?.querySelector<HTMLElement>(
          'input:not([type="hidden"]), textarea, select, button, a[href]',
        );
        (target ?? panelRef.current)?.focus();
      }
    }, 40);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimer);
      returnFocusTo.current?.focus?.();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[95] flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-6">
          <motion.button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="absolute inset-0 h-full w-full cursor-default bg-void/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className={cn(
              // Frosted rather than opaque: the dialog sits over the page the
              // reader was on, and keeping that page faintly visible through
              // the panel is what stops a dialog feeling like a new screen.
              'glass-panel relative my-auto w-full overflow-hidden rounded-t-xl shadow-panel-lg focus:outline-none sm:rounded-xl',
              widths[size],
            )}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.97 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.97 }}
            transition={{ duration: reduced ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className={cn(
                'relative flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6',
                'before:absolute before:left-0 before:top-1/2 before:h-8 before:w-[3px] before:-translate-y-1/2 before:rounded-r',
                accents[tone] ?? accents.violet,
              )}
            >
              <div className="min-w-0">
                {kicker && (
                  <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.2em] opacity-90">
                    {kicker}
                  </p>
                )}
                <h2 className="mt-1 truncate text-lg font-semibold text-ink">{title}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded text-ink-muted transition-colors hover:bg-surface-high hover:text-ink"
              >
                <X weight="bold" className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="max-h-[82vh] overflow-y-auto p-5 sm:p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
