'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { Sticker } from '@/components/ui/misc';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/* Content rendering  */
/* -------------------------------------------------------------------------- */

/**
 * Module content is stored as plain text. Paragraphs are separated by a blank
 * line, `**text**` is strong, `*text*` is emphasis, and lines beginning with
 * "- " become a list. Nothing here interprets HTML, so authored content can
 * never inject markup.
 */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter((p) => p !== '');

  return parts.map((part, i) => {
    const key = `${keyPrefix}-i${i}`;

    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={key} className="font-extrabold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={key} className="italic text-cyan font-semibold">
          {part.slice(1, -1)}
        </em>
      );
    }

    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

function renderContent(content: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];

  content.split('\n\n').forEach((block, bi) => {
    let bullets: string[] = [];

    const flushBullets = () => {
      if (bullets.length === 0) return;
      const items = bullets;
      bullets = [];
      nodes.push(
        <ul key={`b${bi}-ul${nodes.length}`} className="my-4 space-y-2.5 border-l-2 border-cyan/40 pl-5">
          {items.map((item, li) => (
            <li key={li} className="relative text-base leading-[1.8] font-semibold text-white/90">
              {renderInline(item, `b${bi}-l${li}`)}
            </li>
          ))}
        </ul>,
      );
    };

    block.split('\n').forEach((rawLine, li) => {
      const line = rawLine.trim();
      if (line === '') return;

      if (line.startsWith('- ')) {
        bullets.push(line.slice(2));
        return;
      }

      flushBullets();
      nodes.push(
        <p key={`b${bi}-p${li}`} className="mb-5 text-base leading-[1.8] font-medium text-white/85 last:mb-0">
          {renderInline(line, `b${bi}-p${li}`)}
        </p>,
      );
    });

    flushBullets();
  });

  return nodes;
}

/* -------------------------------------------------------------------------- */
/* Module accordion  */
/* -------------------------------------------------------------------------- */

export interface ResourceModuleItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  minutes: number;
  resourceUrl: string | null;
}

interface ResourceModulesProps {
  slug: string;
  resourceTitle: string;
  modules: ResourceModuleItem[];
  /** Module ids the signed-in member has already marked as read. */
  completedIds: string[];
  isSignedIn: boolean;
}

export function ResourceModules({ slug, resourceTitle, modules, completedIds, isSignedIn }: ResourceModulesProps) {
  const router = useRouter();
  const toast = useToast();
  const reduced = useReducedMotion();

  const [done, setDone] = useState<Set<string>>(() => new Set(completedIds));
  const [pendingId, setPendingId] = useState<string | null>(null);
  /** Failures are scoped to the module that failed, and keyed so the shake retriggers. */
  const [failure, setFailure] = useState<{ moduleId: string; message: string; key: number } | null>(null);
  const mounted = useRef(true);

  // Open the first module that has not been read yet, so the page lands where
  // the reader left off. Computed once - later refreshes must not collapse a
  // panel the reader is in the middle of.
  const [open, setOpen] = useState<Set<string>>(() => {
    const first = modules.find((m) => !completedIds.includes(m.id)) ?? modules[0];
    return new Set(first ? [first.id] : []);
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Re-sync after router.refresh() re-renders the server component.
  useEffect(() => {
    setDone(new Set(completedIds));
  }, [completedIds]);

  // The progress card links to "#module-<id>". Opening the panel is what makes
  // that link useful, so both the initial hash and later hash changes are read.
  useEffect(() => {
    const openFromHash = () => {
      const id = window.location.hash.replace('#module-', '');
      if (!id || !modules.some((m) => m.id === id)) return;
      setOpen((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    };

    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, [modules]);

  const toggleOpen = useCallback((id: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setCompletion = useCallback(
    async (moduleId: string, complete: boolean) => {
      if (!isSignedIn) {
        router.push(`/login?redirect=${encodeURIComponent(`/resources/${slug}`)}`);
        return;
      }

      if (pendingId) return;

      setPendingId(moduleId);
      setFailure(null);

      try {
        const res = complete
          ? await fetch('/api/resources/complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ moduleId }),
            })
          : await fetch(`/api/resources/complete?moduleId=${encodeURIComponent(moduleId)}`, { method: 'DELETE' });

        if (res.status === 401) {
          router.push(`/login?redirect=${encodeURIComponent(`/resources/${slug}`)}`);
          return;
        }

        const data = await res.json();

        if (!mounted.current) return;

        if (!data.ok) {
          if (res.status === 401 || (typeof data.error === 'string' && (data.error.includes('auth') || data.error.includes('session')))) {
            router.push(`/login?redirect=${encodeURIComponent(`/resources/${slug}`)}`);
            return;
          }
          const message = typeof data.error === 'string' ? data.error : 'That did not save. Try again.';
          setFailure({ moduleId, message, key: Date.now() });
          toast.error('Not saved', message);
          return;
        }

        setDone((prev) => {
          const next = new Set(prev);
          if (complete) next.add(moduleId);
          else next.delete(moduleId);
          return next;
        });

        if (complete) {
          if (data.alreadyComplete) {
            toast.info('Already marked as read');
          } else if (data.resourceComplete) {
            toast.success('Resource complete', `You have read every module in ${resourceTitle}.`);
          } else {
            toast.success(
              'Marked as read',
              typeof data.doneModules === 'number' && typeof data.totalModules === 'number'
                ? `${data.doneModules} of ${data.totalModules} modules read.`
                : undefined,
            );
          }
        } else {
          toast.success('Marked as unread', 'It is back on your list.');
        }

        router.refresh();
      } catch {
        if (!mounted.current) return;
        setFailure({
          moduleId,
          message: 'Network problem. Check your connection and try again.',
          key: Date.now(),
        });
      } finally {
        if (mounted.current) setPendingId(null);
      }
    },
    [isSignedIn, pendingId, resourceTitle, router, slug, toast],
  );

  const allDone = modules.length > 0 && modules.every((m) => done.has(m.id));

  /** Parsed once per module rather than on every accordion toggle. */
  const rendered = useMemo(
    () => new Map<string, React.ReactNode[]>(modules.map((m) => [m.id, renderContent(m.content)] as const)),
    [modules],
  );

  return (
    <div className="space-y-4">
      <p aria-live="polite" className="sr-only">
        {pendingId ? 'Saving your progress' : `${done.size} of ${modules.length} modules marked as read`}
      </p>

      {modules.map((moduleItem, index) => {
        const isOpen = open.has(moduleItem.id);
        const isDone = done.has(moduleItem.id);
        const isPending = pendingId === moduleItem.id;
        const panelId = `panel-${moduleItem.id}`;

        return (
          <article
            key={moduleItem.id}
            id={`module-${moduleItem.id}`}
            className={cn(
              'scroll-mt-28 rounded-2xl border border-line bg-surface/90 backdrop-blur-md shadow-panel-lg overflow-hidden transition-all duration-200',
              isOpen && 'border-cyan/50 shadow-cyan/10',
              isDone && 'bg-cyan/10',
            )}
          >
            <h3>
              <button
                type="button"
                onClick={() => toggleOpen(moduleItem.id)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full items-start gap-4 p-5 text-left sm:p-6"
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-extrabold shadow-sm transition-colors',
                    isDone ? 'bg-cyan/20 border border-cyan/40 text-cyan' : 'bg-surface-inset border border-line text-white',
                  )}
                >
                  {isDone ? '✓' : String(index + 1).padStart(2, '0')}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black uppercase tracking-wider text-cyan">
                      Module {String(index + 1).padStart(2, '0')} · {moduleItem.minutes} min
                    </span>
                    {isDone && (
                      <span className="border border-cyan/40 bg-cyan/20 px-2.5 py-0.5 font-mono text-[10px] font-extrabold text-cyan uppercase tracking-wider rounded-full">
                        ✓ Read
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block font-display text-xl sm:text-2xl font-black text-white leading-tight">{moduleItem.title}</span>
                  <span className="mt-1.5 block font-sans text-sm font-semibold leading-relaxed text-ink-soft">
                    {moduleItem.summary}
                  </span>
                </span>

                <span
                  aria-hidden
                  className={cn(
                    'mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-base font-bold text-white transition-all duration-200',
                    isOpen && 'rotate-45 bg-cyan/20 border-cyan/40 text-cyan',
                  )}
                >
                  +
                </span>
              </button>
            </h3>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  key="panel"
                  role="region"
                  aria-label={moduleItem.title}
                  initial={reduced ? false : { height: 0, opacity: 0 }}
                  animate={reduced ? undefined : { height: 'auto', opacity: 1 }}
                  exit={reduced ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden border-t border-dashed border-line"
                >
                  <div className="p-5 sm:p-7">
                    <div className="max-w-[68ch]">{rendered.get(moduleItem.id)}</div>

                    {moduleItem.resourceUrl && (
                      <div className="mt-6 max-w-[68ch] border border-line bg-base p-4">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-muted">
                          Further reading
                        </p>
                        <Button href={moduleItem.resourceUrl} tone="paper" size="sm" className="mt-3">
                          Open reference ↗
                        </Button>
                      </div>
                    )}

                    <div className="mt-7 flex flex-col gap-3 border-t border-dashed border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
                      {!isSignedIn ? (
                        <>
                          <p className="text-xs font-medium leading-relaxed text-ink-soft">
                            Mark this once you have read it. Sign in required to save your progress.
                          </p>
                          <Button
                            href={`/login?redirect=/resources/${slug}`}
                            tone="lime"
                            size="sm"
                            className="shrink-0 font-extrabold"
                          >
                            Sign in to mark complete →
                          </Button>
                        </>
                      ) : isDone ? (
                        <>
                          <div className="flex items-center gap-3">
                            <Sticker tone="lime" rotate={-5} className="text-[10px]">
                              Read
                            </Sticker>
                            <p className="text-xs leading-relaxed text-ink-muted">
                              Marked as read. Nobody else sees this - it is your bookmark.
                            </p>
                          </div>
                          <Button
                            tone="paper"
                            size="sm"
                            onClick={() => setCompletion(moduleItem.id, false)}
                            disabled={isPending}
                            className="flex-shrink-0"
                          >
                            {isPending ? 'Updating…' : 'Mark as unread'}
                          </Button>
                        </>
                      ) : (
                        <>
                          <p className="text-xs leading-relaxed text-ink-muted">
                            Mark this once you have read it and the resource remembers your place.
                          </p>
                          <Button
                            tone="lime"
                            size="sm"
                            onClick={() => setCompletion(moduleItem.id, true)}
                            disabled={isPending}
                            className="flex-shrink-0"
                          >
                            {isPending ? (
                              <>
                                <span
                                  aria-hidden
                                  className="inline-block h-3 w-3 animate-caret-blink border border-line bg-surface-inset"
                                />
                                Saving…
                              </>
                            ) : (
                              'Mark complete'
                            )}
                          </Button>
                        </>
                      )}
                    </div>

                    {failure?.moduleId === moduleItem.id && (
                      <p
                        key={failure.key}
                        role="alert"
                        className="mt-4 animate-shake border border-line bg-rose/10 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-rose"
                      >
                        {failure.message}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </article>
        );
      })}

      {allDone && (
        <div className="animate-fade-up border border-line bg-cyan/12 p-6 shadow-panel-lg sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <Chip tone="ink" size="sm" className="mb-3">
                Complete
              </Chip>
              <h3 className="text-2xl leading-tight sm:text-3xl">You have read all of {resourceTitle}.</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                The next useful step is usually a conversation. Other members have run this work in their own
                organisations and will tell you what the writing left out.
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-col gap-3">
              <Button href="/directory" tone="ink" size="md">
                Find members who have done it
              </Button>
              <Button href="/resources" tone="paper" size="md">
                Back to the library
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
