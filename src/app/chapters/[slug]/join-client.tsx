'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

interface JoinChapterProps {
  slug: string;
  chapterName: string;
  /** The region the chapter covers, e.g. "Nordics". */
  region: string;
  /** How often the chapter meets, e.g. "Quarterly". */
  cadence: string;
  /** Chapter inbox, shown to members once they have joined. */
  contactEmail?: string | null;
  /** Whether a session cookie was present when the page rendered. */
  isSignedIn: boolean;
  /** Whether the signed-in member already belongs to this chapter. */
  isMember: boolean;
  /** MEMBER | COMMITTEE | CHAIR, when they belong. */
  role?: string | null;
  /** Inactive chapters cannot be joined - the API rejects it too. */
  isActive?: boolean;
}

const ROLE_LABEL: Record<string, string> = {
  CHAIR: 'Chair',
  COMMITTEE: 'Committee',
  MEMBER: 'Member',
};

const ROLE_COPY: Record<string, string> = {
  CHAIR: 'You chair this chapter and set its programme.',
  COMMITTEE: 'You sit on the chapter committee.',
  MEMBER: 'Your membership of this chapter is active.',
};

export function JoinChapter({
  slug,
  chapterName,
  region,
  cadence,
  contactEmail,
  isSignedIn,
  isMember,
  role,
  isActive = true,
}: JoinChapterProps) {
  const router = useRouter();
  const toast = useToast();

  const [joined, setJoined] = useState(isMember);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  /** Bumped on every failure so the shake animation retriggers. */
  const [errorKey, setErrorKey] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Re-sync once the server component re-renders after router.refresh().
  useEffect(() => {
    setJoined(isMember);
  }, [isMember]);

  const act = useCallback(
    async (method: 'POST' | 'DELETE') => {
      if (pending) return;
      const joining = method === 'POST';

      setPending(true);
      setError(null);
      setJoined(joining); // optimistic - reverted below if the API disagrees

      try {
        const res = await fetch(`/api/chapters/${slug}/join`, {
          method,
          headers: { 'Content-Type': 'application/json' },
          ...(joining ? { body: JSON.stringify({}) } : {}),
        });
        const data = await res.json();

        if (!data.ok) {
          if (!mounted.current) return;
          setJoined(!joining);
          setError(typeof data.error === 'string' ? data.error : 'That did not go through. Try again.');
          setErrorKey((k) => k + 1);
          return;
        }

        if (joining) {
          if (data.alreadyJoined) {
            toast.info('Already a member', typeof data.message === 'string' ? data.message : undefined);
          } else {
            toast.success(
              `You have joined ${chapterName}`,
              typeof data.message === 'string'
                ? data.message
                : `${region} meets ${cadence.toLowerCase()}. Dates go on the events page.`,
            );
          }
        } else {
          setConfirmLeave(false);
          toast.success('You have left the chapter', `You can rejoin ${chapterName} at any time.`);
        }

        router.refresh();
      } catch {
        if (!mounted.current) return;
        setJoined(!joining);
        setError('The request did not reach us. Check your connection and try again.');
        setErrorKey((k) => k + 1);
      } finally {
        if (mounted.current) setPending(false);
      }
    },
    [pending, slug, toast, chapterName, region, cadence, router],
  );

  /* ---------------------------------------------------------------- */
  /* Signed out  */
  /* ---------------------------------------------------------------- */
  if (!isSignedIn) {
    return (
      <div className="space-y-3">
        <Button href={`/login?redirect=/chapters/${slug}`} tone="magenta" size="lg" className="w-full">
          Sign in to join
        </Button>
        <p className="text-center font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
          Not a member yet?{' '}
          <Link href="/membership" className="underline decoration-2 underline-offset-2 hover:text-violet-bright">
            About membership
          </Link>
        </p>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Chapter paused  */
  /* ---------------------------------------------------------------- */
  if (!isActive) {
    return (
      <div className="border border-dashed border-line bg-surface-inset/60 p-4 text-center">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">Joining is closed</p>
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          This chapter is between chairs and is not taking new members. If you would take it on, say so and we will put
          you in touch with the previous committee.
        </p>
        <Button href="/contact?type=chapter" tone="ink" size="sm" className="mt-3 w-full">
          Restart this chapter →
        </Button>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Member  */
  /* ---------------------------------------------------------------- */
  if (joined) {
    return (
      <div className="space-y-3">
        <div className="animate-fade-up border border-line bg-cyan/12 p-4 shadow-panel">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-lg uppercase leading-none">On the register</span>
            <Chip tone="ink" size="sm">
              {ROLE_LABEL[role ?? 'MEMBER'] ?? role ?? 'Member'}
            </Chip>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            {ROLE_COPY[role ?? 'MEMBER'] ?? ROLE_COPY.MEMBER} The chapter meets {cadence.toLowerCase()}; dates are
            published on the events page.
          </p>
        </div>

        {contactEmail && (
          <a
            href={`mailto:${contactEmail}`}
            className="block border border-dashed border-line bg-base px-3 py-2 text-center font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted transition-colors hover:bg-cyan/10 hover:text-ink"
          >
            {contactEmail}
          </a>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button href="/events" tone="ink" size="sm" className="flex-1">
            Next sessions →
          </Button>

          {confirmLeave ? (
            <div className="flex flex-1 gap-2">
              <Button tone="magenta" size="sm" onClick={() => act('DELETE')} disabled={pending} className="flex-1">
                {pending ? 'Leaving…' : 'Confirm'}
              </Button>
              <Button tone="paper" size="sm" onClick={() => setConfirmLeave(false)} disabled={pending}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button tone="paper" size="sm" onClick={() => setConfirmLeave(true)} className="flex-1">
              Leave chapter
            </Button>
          )}
        </div>

        <p aria-live="polite" className="sr-only">
          {pending ? 'Updating your chapter membership' : `You are a member of ${chapterName}`}
        </p>

        {error && (
          <p
            key={errorKey}
            role="alert"
            className="animate-shake border border-line bg-rose/10 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-rose"
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Signed in, not a member  */
  /* ---------------------------------------------------------------- */
  return (
    <div className="space-y-3">
      <Button tone="lime" size="lg" onClick={() => act('POST')} disabled={pending} className="w-full">
        {pending ? (
          <>
            <span
              className="inline-block h-3 w-3 animate-caret-blink border border-line bg-surface-inset"
              aria-hidden
            />
            Joining…
          </>
        ) : (
          'Join this chapter'
        )}
      </Button>

      <p className="text-center font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
        Adds you to the chapter register · leave at any time
      </p>

      <p aria-live="polite" className="sr-only">
        {pending ? `Joining ${chapterName}` : ''}
      </p>

      {error && (
        <p
          key={errorKey}
          role="alert"
          className="animate-shake border border-line bg-rose/10 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-rose"
        >
          {error}
        </p>
      )}
    </div>
  );
}
