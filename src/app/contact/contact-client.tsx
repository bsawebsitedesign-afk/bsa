'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/badge';
import { FieldError, Input, Label, Select, Textarea } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { HubspotForm } from '@/components/hubspot-form';
import { cn } from '@/lib/utils';

/** One entry in the reason selector. Defined server-side and passed down. */
export interface ContactReason {
  /** FormSubmission.formType value. */
  value: string;
  /** Short slug used in ?type= deep links and as the campaign tag. */
  slug: string;
  label: string;
  /** Shown under the select once the reason is picked. */
  blurb: string;
  /** Placeholder that nudges people to include the useful details. */
  prompt: string;
  reply: string;
  emoji: string;
  /** Where to send them after a successful submit. */
  next: { label: string; href: string };
}

const MESSAGE_MAX = 2000;
const MESSAGE_WARN = 1800;

interface FormState {
  name: string;
  email: string;
  company: string;
  formType: string;
  message: string;
}

const EMPTY: FormState = { name: '', email: '', company: '', formType: 'CONTACT', message: '' };

export function ContactClient({
  reasons,
  initialType,
  signedInEmail,
}: {
  reasons: ContactReason[];
  initialType: string;
  /** Prefills the email box when someone is already signed in. */
  signedInEmail?: string | null;
}) {
  const toast = useToast();
  const [formMode, setFormMode] = useState<'hubspot' | 'native'>('hubspot');
  const [form, setForm] = useState<FormState>({
    ...EMPTY,
    formType: initialType,
    email: signedInEmail ?? '',
  });
  const [website, setWebsite] = useState(''); // honeypot
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const [topError, setTopError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sentAs, setSentAs] = useState<ContactReason | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const active = useMemo(
    () => reasons.find((reason) => reason.value === form.formType) ?? reasons[0],
    [reasons, form.formType],
  );

  const remaining = MESSAGE_MAX - form.message.length;
  const sending = status === 'sending';

  // One live region that never unmounts, so screen readers still hear the
  // outcome when the whole form is swapped for the success panel.
  const liveMessage =
    status === 'sending'
      ? 'Sending your message.'
      : status === 'done'
        ? `Message sent. We will reply to ${form.email} within ${sentAs?.reply ?? 'two working days'}.`
        : topError
          ? `That did not send. ${topError}`
          : '';

  // The success panel replaces the form, so it can only be scrolled to once it
  // has actually mounted.
  useEffect(() => {
    if (status === 'done') panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [status]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear the inline error the moment someone starts fixing the field.
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;

    setStatus('sending');
    setTopError(null);
    setFieldErrors({});

    try {
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          company: form.company,
          message: form.message,
          formType: form.formType,
          source: 'contact-page',
          campaign: active?.slug ?? 'general',
          website,
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        setStatus('idle');
        setTopError(data.error || 'That did not go through. Give it another go.');
        if (data.fields) setFieldErrors(data.fields as Record<string, string>);
        return;
      }

      setSentAs(active ?? null);
      setStatus('done');
      toast.push({
        title: 'Message sent',
        body: 'A human reads every one of these.',
        emoji: '',
        tone: 'lime',
      });
    } catch {
      setStatus('idle');
      setTopError('The network dropped that one. Check your connection and try again.');
    }
  }

  function reset() {
    setForm({ ...EMPTY, formType: initialType, email: signedInEmail ?? '' });
    setWebsite('');
    setSentAs(null);
    setTopError(null);
    setFieldErrors({});
    setStatus('idle');
  }

  /* ------------------------------------------------------------------ */
  /* SUCCESS  */
  /* ------------------------------------------------------------------ */

  const successPanel = (
    <div ref={panelRef} className="border border-line bg-surface shadow-panel-lg animate-fade-up">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-cyan/12 px-5 py-3">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em]">Message delivered</span>
        <span aria-hidden className="font-display text-lg leading-none"></span>
      </div>

      <div className="p-6 sm:p-8">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink-muted">
          <span aria-hidden>{sentAs?.emoji} </span>
          {sentAs?.label ?? 'Message sent'}
        </p>

        <h2 className="text-display-md mt-3">Got it. It landed.</h2>

        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          Your message is in the inbox a real person opens, not a ticket queue that closes itself after 30 days. Expect
          a reply at <strong className="font-bold">{form.email}</strong> within{' '}
          <strong className="text-cyan px-0.5 font-bold">{sentAs?.reply ?? 'two working days'}</strong>. If it takes
          longer than that, send it again - nobody here is ignoring you, the inbox is just staffed by volunteers.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 border-t border-dashed border-line pt-5 sm:grid-cols-2">
          {sentAs && (
            <Button href={sentAs.next.href} tone="magenta" className="w-full">
              {sentAs.next.label}
            </Button>
          )}
          <Button type="button" tone="paper" className="w-full" onClick={reset}>
            Send another message
          </Button>
        </div>

        <p className="mt-5 font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-ink-muted">
          In the meantime, the member directory and events calendar are open to browse.
        </p>
      </div>
    </div>
  );

  /* ------------------------------------------------------------------ */
  /* FORM  */
  /* ------------------------------------------------------------------ */

  const formPanel = (
    <form onSubmit={onSubmit} noValidate className="relative rounded-2xl border border-line bg-surface/95 backdrop-blur-xl shadow-panel-lg overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-inset/80 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan/15 text-cyan border border-cyan/30 text-sm font-bold">
            ✉️
          </span>
          <span className="text-base font-extrabold text-white">Send an Enquiry</span>
        </div>
        <span className="rounded-full bg-cyan/15 border border-cyan/40 px-3 py-1 font-mono text-xs font-bold text-cyan flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan animate-pulse" />
          {sending ? 'Sending message…' : 'Direct Executive Line'}
        </span>
      </div>

      <div className="space-y-6 p-6 sm:p-8">
        {/* Reason first - it changes what the rest of the form asks for. */}
        <div>
          <Label htmlFor="contact-reason" required hint="Direct routing">
            What is this about?
          </Label>
          <Select
            id="contact-reason"
            name="formType"
            value={form.formType}
            invalid={Boolean(fieldErrors.formType)}
            onChange={(event) => update('formType', event.target.value)}
            disabled={sending}
            className="rounded-xl border border-line bg-base px-4 py-3 text-sm text-white font-medium focus:border-cyan focus:ring-1 focus:ring-cyan"
          >
            {reasons.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {reason.emoji} {reason.label}
              </option>
            ))}
          </Select>
          <FieldError>{fieldErrors.formType}</FieldError>

          {active && (
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-cyan/30 bg-cyan/10 p-3.5 text-xs text-cyan">
              <span className="shrink-0 rounded-full bg-cyan/20 border border-cyan/40 px-2.5 py-0.5 font-mono text-[11px] font-bold text-cyan uppercase tracking-wider">
                ⚡ Reply in {active.reply}
              </span>
              <span className="min-w-0 flex-1 font-medium text-white/90">{active.blurb}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="contact-name" required>
              Your name
            </Label>
            <Input
              id="contact-name"
              name="name"
              value={form.name}
              autoComplete="name"
              placeholder="Kwame Asante"
              maxLength={80}
              invalid={Boolean(fieldErrors.name)}
              aria-invalid={Boolean(fieldErrors.name)}
              onChange={(event) => update('name', event.target.value)}
              disabled={sending}
              className="rounded-xl border border-line bg-base px-4 py-3 text-sm text-white placeholder:text-ink-muted focus:border-cyan focus:ring-1 focus:ring-cyan"
            />
            <FieldError>{fieldErrors.name}</FieldError>
          </div>

          <div>
            <Label htmlFor="contact-email" required>
              Email address
            </Label>
            <Input
              id="contact-email"
              name="email"
              type="email"
              value={form.email}
              autoComplete="email"
              placeholder="you@organisation.com"
              maxLength={160}
              invalid={Boolean(fieldErrors.email)}
              aria-invalid={Boolean(fieldErrors.email)}
              onChange={(event) => update('email', event.target.value)}
              disabled={sending}
              className="rounded-xl border border-line bg-base px-4 py-3 text-sm text-white placeholder:text-ink-muted focus:border-cyan focus:ring-1 focus:ring-cyan"
            />
            <FieldError>{fieldErrors.email}</FieldError>
          </div>
        </div>

        <div>
          <Label htmlFor="contact-company" hint="Optional">
            Organisation or company
          </Label>
          <Input
            id="contact-company"
            name="company"
            value={form.company}
            autoComplete="organization"
            placeholder="Meridian Logistics Group"
            maxLength={100}
            invalid={Boolean(fieldErrors.company)}
            aria-invalid={Boolean(fieldErrors.company)}
            onChange={(event) => update('company', event.target.value)}
            disabled={sending}
            className="rounded-xl border border-line bg-base px-4 py-3 text-sm text-white placeholder:text-ink-muted focus:border-cyan focus:ring-1 focus:ring-cyan"
          />
          <FieldError>{fieldErrors.company}</FieldError>
        </div>

        <div>
          <Label htmlFor="contact-message" required hint="Include any relevant context">
            Message
          </Label>
          <Textarea
            id="contact-message"
            name="message"
            rows={6}
            value={form.message}
            maxLength={MESSAGE_MAX}
            placeholder={active?.prompt}
            invalid={Boolean(fieldErrors.message)}
            aria-invalid={Boolean(fieldErrors.message)}
            aria-describedby="contact-message-count"
            onChange={(event) => update('message', event.target.value)}
            disabled={sending}
            className="min-h-[160px] rounded-xl border border-line bg-base p-4 text-sm text-white placeholder:text-ink-muted focus:border-cyan focus:ring-1 focus:ring-cyan"
          />

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <FieldError>{fieldErrors.message}</FieldError>
            <p
              id="contact-message-count"
              className={cn(
                'ml-auto font-mono text-xs font-bold uppercase tracking-wider',
                form.message.length >= MESSAGE_WARN ? 'text-rose' : 'text-cyan/80',
              )}
            >
              {remaining} character{remaining === 1 ? '' : 's'} left
            </p>
          </div>
        </div>

        {/* Honeypot. Real people never see this; bots fill everything in. */}
        <div aria-hidden className="pointer-events-none absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
          <label htmlFor="website">Leave this field empty</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>

        {topError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-rose/40 bg-rose/15 p-4 text-sm leading-relaxed text-rose shadow-panel animate-shake font-semibold"
          >
            <span aria-hidden className="font-extrabold">
              ⚠️
            </span>
            <span>{topError}</span>
          </div>
        )}

        <div className="flex flex-col gap-4 border-t border-line/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-xs font-semibold text-ink-muted">
            🔒 Privacy protected · No newsletter opt-ins.
          </p>

          <Button type="submit" tone="lime" size="lg" disabled={sending} className="w-full sm:w-auto rounded-xl px-8 py-3 text-sm font-extrabold">
            {sending ? 'Sending Message…' : 'Send Message →'}
          </Button>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-ink-muted">
          We keep your message and email so we can reply, and nothing else happens to them. Read the honest version on{' '}
          <Link href="/membership" className="font-bold text-cyan hover:underline underline-offset-4">
            the membership page
          </Link>
          .
        </p>
      </div>
    </form>
  );

  return (
    <div>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {liveMessage}
      </div>

      {status === 'done' ? successPanel : formPanel}

      <ConfirmationModal
        isOpen={status === 'done'}
        onClose={() => setStatus('idle')}
        icon="📬"
        badgeTone="lime"
        badgeText="INQUIRY DELIVERED"
        title="Message Received!"
        subtitle="Thank you for contacting Business Security Alliance. An executive representative will review your message and reply promptly."
        details={[
          { label: 'Sender', value: form.name },
          { label: 'Email', value: form.email },
          { label: 'Inquiry Topic', value: active?.label ?? 'General Inquiry' },
        ]}
        primaryAction={{
          label: active?.next.label ?? 'Return to Home',
          href: active?.next.href ?? '/',
        }}
        secondaryAction={{
          label: 'Close Window',
          onClick: () => setStatus('idle'),
        }}
      />
    </div>
  );
}
