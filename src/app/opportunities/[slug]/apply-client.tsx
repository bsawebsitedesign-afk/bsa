'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardBar, CardBody } from '@/components/ui/card';
import { Chip } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { FieldError, Input, Label, Textarea } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

const NOTE_MAX = 1200; // matches applicationSchema in src/lib/validation.ts
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const URL_RE = /^https?:\/\/\S+\.\S+/i;

/* -------------------------------------------------------------------------- */
/* Per-type language. Applying to a tender is not applying for a job.  */
/* -------------------------------------------------------------------------- */

interface ActionCopy {
  /** Full-width button label. */
  cta: string;
  /** Short label for the card bar and modal kicker. */
  short: string;
  /** What the thing you sent is called. */
  noun: string;
  noteLabel: string;
  notePlaceholder: string;
}

const DEFAULT_ACTION: ActionCopy = {
  cta: 'Respond to this listing',
  short: 'Respond',
  noun: 'response',
  noteLabel: 'Your note',
  notePlaceholder: 'A few lines on why this is a fit and what you would bring.',
};

const ACTION: Record<string, ActionCopy> = {
  ROLE: {
    cta: 'Apply for this role',
    short: 'Apply',
    noun: 'application',
    noteLabel: 'Why this role',
    notePlaceholder: 'The closest comparable work you have done, and your availability. A short paragraph is enough.',
  },
  PARTNERSHIP: {
    cta: 'Register interest',
    short: 'Register interest',
    noun: 'enquiry',
    noteLabel: 'About your practice',
    notePlaceholder: 'What your practice delivers, the clients you work with, and the capacity you could commit.',
  },
  RFP: {
    cta: 'Register bid interest',
    short: 'Bid interest',
    noun: 'expression of interest',
    noteLabel: 'Relevant delivery experience',
    notePlaceholder: 'Comparable contracts, the jurisdictions you can operate in, and any clearances already held.',
  },
  SPEAKING: {
    cta: 'Submit a proposal',
    short: 'Submit proposal',
    noun: 'proposal',
    noteLabel: 'Your proposed session',
    notePlaceholder: 'A working title, the argument you would make, and the work it draws on. Two or three sentences.',
  },
  BOARD_POSITION: {
    cta: 'Express interest',
    short: 'Express interest',
    noun: 'expression of interest',
    noteLabel: 'Relevant background',
    notePlaceholder: 'Your operational background, any board or committee experience, and the time you can give.',
  },
};

export interface ApplyPrefill {
  name: string;
  email: string;
  org: string;
  profileUrl: string;
}

interface ApplyProps {
  slug: string;
  title: string;
  org: string;
  type: string;
  applyUrl: string | null;
  compensation: string | null;
  location: string;
  /** Formatted date, e.g. "Sep 11, 2026". Null for rolling listings. */
  deadlineLabel: string | null;
  daysLeft: number | null;
  closed: boolean;
  responses: number;
  prefill: ApplyPrefill | null;
  alreadyApplied: boolean;
}

type Status = 'idle' | 'sending' | 'done' | 'duplicate';

export function ApplyPanel({
  slug,
  title,
  org,
  type,
  applyUrl,
  compensation,
  location,
  deadlineLabel,
  daysLeft,
  closed,
  responses,
  prefill,
  alreadyApplied,
}: ApplyProps) {
  const toast = useToast();
  const copy = ACTION[type] ?? DEFAULT_ACTION;

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>(alreadyApplied ? 'duplicate' : 'idle');
  const [name, setName] = useState(prefill?.name ?? '');
  const [email, setEmail] = useState(prefill?.email ?? '');
  const [orgName, setOrgName] = useState(prefill?.org ?? '');
  const [profileUrl, setProfileUrl] = useState(prefill?.profileUrl ?? '');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [reference, setReference] = useState<string | null>(null);

  const sending = status === 'sending';
  const sent = status === 'done';
  const duplicate = status === 'duplicate';

  function fail(message: string, fields?: Record<string, string>) {
    setFormError(message);
    if (fields) setErrors(fields);
    setShake((n) => n + 1);
    setStatus('idle');
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;

    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Your name, please.';
    if (!EMAIL_RE.test(email.trim())) next.email = 'That email address does not look right.';
    if (orgName.trim().length > 100) next.org = 'Keep this under 100 characters.';
    if (profileUrl.trim() && !URL_RE.test(profileUrl.trim())) {
      next.profileUrl = 'Needs to be a full URL, starting https://';
    }
    if (note.length > NOTE_MAX) next.note = `Trim this to ${NOTE_MAX} characters.`;

    setErrors(next);
    if (Object.keys(next).length > 0) {
      setFormError('Some of those fields need a second look.');
      setShake((n) => n + 1);
      return;
    }

    setFormError(null);
    setStatus('sending');

    try {
      const res = await fetch(`/api/opportunities/${slug}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          org: orgName.trim() || undefined,
          profileUrl: profileUrl.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });

      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        fields?: Record<string, string>;
        applicationId?: string;
      };

      if (!data.ok) {
        if (res.status === 409 && /already/i.test(data.error ?? '')) {
          setErrors({});
          setFormError(null);
          setStatus('duplicate');
          return;
        }
        fail(data.error ?? 'That did not go through. Try once more.', data.fields);
        return;
      }

      setReference(data.applicationId ?? null);
      setStatus('done');
      toast.success('Response sent', `${org} has your details.`);
    } catch {
      fail('The connection dropped before that reached us. Try again.');
    }
  }

  function closeModal() {
    setOpen(false);
    // A failed attempt should not be re-announced the next time the form opens.
    if (status === 'idle') setFormError(null);
  }

  const noteLeft = NOTE_MAX - note.length;
  const barTone = sent ? 'lime' : duplicate ? 'violet' : closed ? 'ink' : 'magenta';

  /* ------------------------------------------------------------------ */
  /* Rail card  */
  /* ------------------------------------------------------------------ */

  return (
    <>
      <Card className="shadow-panel-lg">
        <CardBar tone={barTone}>
          <span>{sent ? ' Sent' : duplicate ? 'Already responded' : closed ? 'Closed' : copy.short}</span>
          <span className="opacity-80">{responses === 0 ? 'first in' : `${responses} so far`}</span>
        </CardBar>

        <CardBody className="space-y-4">
          {sent ? (
            <ConfirmationPanel org={org} noun={copy.noun} reference={reference} email={email} compact />
          ) : duplicate ? (
            <div className="space-y-3">
              <p className="font-display text-sm uppercase leading-tight">You are already on this list.</p>
              <p className="text-sm leading-relaxed text-ink-muted">
                One {copy.noun} per email address, so {org} is not sent the same person twice. Nothing further is needed
                from you here.
              </p>
              <div className="border border-dashed border-line bg-violet/12 p-3 text-xs leading-relaxed text-ink-soft">
                Heard nothing and the deadline has passed? Let us know and we will follow it up with the poster.
              </div>
              <div className="flex flex-col gap-2">
                <Button href="/opportunities" tone="ink" size="sm" className="w-full">
                  Back to the board
                </Button>
                <Button href="/contact" tone="paper" size="sm" className="w-full">
                  Follow this one up
                </Button>
              </div>
            </div>
          ) : closed ? (
            <div className="space-y-3">
              <p className="font-display text-sm uppercase leading-tight">This listing has closed.</p>
              <p className="text-sm leading-relaxed text-ink-muted">
                The deadline was {deadlineLabel}. {org} may run it again, and comparable listings go up on the board
                regularly.
              </p>
              <Button href="/opportunities" tone="ink" size="sm" className="w-full">
                See what is still open
              </Button>
            </div>
          ) : (
            <>
              <dl className="space-y-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em]">
                <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-line pb-2">
                  <dt className="text-ink-muted">Compensation</dt>
                  <dd className="text-right">{compensation ?? 'On application'}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-line pb-2">
                  <dt className="text-ink-muted">Location</dt>
                  <dd className="text-right">{location}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-muted">Closes</dt>
                  <dd className={cn('text-right', daysLeft !== null && daysLeft <= 14 ? 'text-rose' : '')}>
                    {deadlineLabel ?? 'Rolling'}
                  </dd>
                </div>
              </dl>

              {applyUrl ? (
                <div className="space-y-3">
                  <Button href={applyUrl} tone="magenta" size="lg" className="w-full">
                    Respond on their site ↗
                  </Button>
                  <p className="text-xs leading-relaxed text-ink-muted">
                    {org} runs this one through their own process. Their form is the one that counts, and it opens in a
                    new tab.
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="w-full border border-line bg-surface px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] shadow-panel panel-hover"
                  >
                    Or register interest through BSA
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button tone="magenta" size="lg" className="w-full" onClick={() => setOpen(true)}>
                    {copy.cta}
                  </Button>
                  <ol className="space-y-1.5 text-xs leading-relaxed text-ink-muted">
                    <li className="flex gap-2">
                      <span className="font-mono font-bold text-ink">1.</span> Four fields and a note. No document
                      upload.
                    </li>
                    <li className="flex gap-2">
                      <span className="font-mono font-bold text-ink">2.</span> It goes to {org}, tagged as coming
                      through BSA.
                    </li>
                    <li className="flex gap-2">
                      <span className="font-mono font-bold text-ink">3.</span> They come back to you directly.
                    </li>
                  </ol>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Modal  */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        open={open}
        onClose={closeModal}
        kicker={sent ? 'Sent' : `${copy.short} · ${org}`}
        title={sent ? 'That is with them.' : duplicate ? 'You have already responded' : title}
        tone={sent ? 'lime' : duplicate ? 'violet' : 'magenta'}
        size="md"
      >
        {sent ? (
          <div className="space-y-5">
            <ConfirmationPanel org={org} noun={copy.noun} reference={reference} email={email} />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button tone="ink" className="flex-1" onClick={closeModal}>
                Back to the listing
              </Button>
              <Button href="/opportunities" tone="paper" className="flex-1">
                More listings →
              </Button>
            </div>
          </div>
        ) : duplicate ? (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-ink-soft">
              There is already a response against <strong>{email || 'that email address'}</strong> for this listing. The
              board keeps it to one per person so nobody is put forward twice.
            </p>
            <div className="border border-line bg-violet/12 p-4 text-sm leading-relaxed">
              While you wait: make sure your directory profile says what you do now. It is the first thing most people
              check before replying.
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button href="/dashboard" tone="violet" className="flex-1">
                Update my profile
              </Button>
              <Button tone="paper" className="flex-1" onClick={closeModal}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <motion.form
            key={shake}
            onSubmit={submit}
            noValidate
            className={cn('space-y-4', shake > 0 && 'animate-shake')}
            initial={false}
          >
            <p className="border border-dashed border-line bg-cyan/10 p-3 text-xs leading-relaxed text-ink-soft">
              Your details go to {org}, tagged as having come through BSA. Nothing is published, and nothing is passed
              anywhere else.
            </p>

            <div>
              <Label htmlFor="apply-name" required>
                Full name
              </Label>
              <Input
                id="apply-name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                invalid={Boolean(errors.name)}
                aria-invalid={Boolean(errors.name)}
                placeholder="Amara Osei"
                autoComplete="name"
                maxLength={80}
                required
              />
              <FieldError>{errors.name}</FieldError>
            </div>

            <div>
              <Label htmlFor="apply-email" required hint="where they reply">
                Work email
              </Label>
              <Input
                id="apply-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                invalid={Boolean(errors.email)}
                aria-invalid={Boolean(errors.email)}
                placeholder="you@yourfirm.com"
                autoComplete="email"
                required
              />
              <FieldError>{errors.email}</FieldError>
            </div>

            <div>
              <Label htmlFor="apply-org" hint="optional">
                Organisation
              </Label>
              <Input
                id="apply-org"
                name="org"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                invalid={Boolean(errors.org)}
                aria-invalid={Boolean(errors.org)}
                placeholder="Your employer or practice"
                autoComplete="organization"
                maxLength={100}
              />
              <FieldError>{errors.org}</FieldError>
            </div>

            <div>
              <Label htmlFor="apply-profile" hint="optional">
                LinkedIn or profile URL
              </Label>
              <Input
                id="apply-profile"
                name="profileUrl"
                type="url"
                value={profileUrl}
                onChange={(e) => setProfileUrl(e.target.value)}
                invalid={Boolean(errors.profileUrl)}
                aria-invalid={Boolean(errors.profileUrl)}
                placeholder="https://linkedin.com/in/yourname"
                autoComplete="url"
              />
              <FieldError>{errors.profileUrl}</FieldError>
            </div>

            <div>
              <Label htmlFor="apply-note" hint="optional">
                {copy.noteLabel}
              </Label>
              <Textarea
                id="apply-note"
                name="note"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
                invalid={Boolean(errors.note)}
                aria-invalid={Boolean(errors.note)}
                aria-describedby="apply-note-count"
                maxLength={NOTE_MAX}
                placeholder={copy.notePlaceholder}
                className="min-h-[80px]"
              />
              <div className="mt-1.5 flex items-baseline justify-between gap-3">
                <FieldError>{errors.note}</FieldError>
                <span
                  id="apply-note-count"
                  aria-live="polite"
                  className={cn(
                    'ml-auto font-mono text-[10px] font-bold uppercase tracking-[0.12em] tabular-nums',
                    noteLeft <= 120 ? 'text-rose' : 'text-ink-muted',
                  )}
                >
                  {note.length}/{NOTE_MAX}
                </span>
              </div>
            </div>

            <div aria-live="assertive">
              {formError && (
                <p className="border border-line bg-grad-brand-soft px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink shadow-panel">
                  {formError}
                </p>
              )}
            </div>

            <div className="sticky bottom-0 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 border-t border-dashed border-line bg-surface/95 backdrop-blur-md p-4 sm:p-5 flex flex-col gap-2 sm:flex-row-reverse z-20">
              <Button type="submit" tone="magenta" size="lg" className="flex-1 font-bold text-white shadow-glow-cyan" disabled={sending}>
                {sending ? 'Sending…' : `Submit ${copy.noun} →`}
              </Button>
              <Button type="button" tone="paper" size="lg" onClick={closeModal} disabled={sending}>
                Cancel
              </Button>
            </div>

            <p className="text-[11px] leading-relaxed text-ink-muted">
              One {copy.noun} per email address. You can follow up with BSA if you hear nothing after the deadline.
            </p>
          </motion.form>
        )}
      </Modal>

      <ConfirmationModal
        isOpen={status === 'done'}
        onClose={() => setStatus('idle')}
        icon="🚀"
        badgeTone="lime"
        badgeText="APPLICATION DELIVERED"
        title="Response Submitted!"
        subtitle={`Your ${copy.noun} for "${title}" has been delivered directly to ${org}.`}
        details={[
          { label: 'Listing', value: title },
          { label: 'Organization', value: org },
          { label: 'Applicant Name', value: name },
          { label: 'Reference Code', value: reference ? reference.slice(0, 8).toUpperCase() : 'BSA-APP-CONFIRMED' },
        ]}
        primaryAction={{
          label: 'Browse More Listings',
          href: '/opportunities',
        }}
        secondaryAction={{
          label: 'Close Window',
          onClick: () => setStatus('idle'),
        }}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Success panel - shown in the modal and again in the rail after it closes  */
/* -------------------------------------------------------------------------- */

function ConfirmationPanel({
  org,
  noun,
  reference,
  email,
  compact = false,
}: {
  org: string;
  noun: string;
  reference: string | null;
  email: string;
  compact?: boolean;
}) {
  return (
    <div className={cn('space-y-3', !compact && 'animate-fade-up')} role="status">
      <div className="flex items-center gap-3 border border-line bg-cyan/12 p-3 shadow-panel">
        <span aria-hidden className="font-display text-2xl leading-none"></span>
        <div className="min-w-0">
          <p className="font-display text-sm uppercase leading-tight">Sent to {org}</p>
          <p className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">
            confirmation to {email}
          </p>
        </div>
      </div>

      <ol className="space-y-2 text-xs leading-relaxed text-ink-muted">
        <li className="flex gap-2">
          <span className="font-mono font-bold text-ink">→</span> Your {noun} goes to the contact at {org} who posted
          the listing.
        </li>
        <li className="flex gap-2">
          <span className="font-mono font-bold text-ink">→</span> Anything after that happens directly between the two
          of you.
        </li>
        <li className="flex gap-2">
          <span className="font-mono font-bold text-ink">→</span> Nothing back after the deadline? Tell BSA and we will
          follow it up.
        </li>
      </ol>

      {reference && (
        <div className="flex items-center justify-between gap-2 border border-dashed border-line bg-surface-inset/60 px-3 py-2">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-ink-muted">Reference</span>
          <code className="truncate font-mono text-[11px] font-bold">{reference.slice(0, 8).toUpperCase()}</code>
        </div>
      )}

      {!compact && (
        <div className="flex flex-wrap gap-2">
          <Chip tone="lime" size="sm">
            Check your spam folder
          </Chip>
          <Chip size="sm">One {noun} per email</Chip>
        </div>
      )}
    </div>
  );
}
