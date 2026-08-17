'use client';

import React, { useState } from 'react';
import { Button, type ButtonSize, type ButtonTone } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FieldError, Input, Label, Textarea } from '@/components/ui/field';

type Status = 'idle' | 'sending' | 'sent' | 'error';

interface FormResponse {
  ok?: boolean;
  error?: string;
  message?: string;
  fields?: Record<string, string>;
  submissionId?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Opens the sponsor prospectus enquiry. Rendered more than once on the page
 * (hero and closing band); each instance owns its own dialog state.
 */
export function BecomeBackerButton({
  label = 'Become a backer',
  tone = 'magenta',
  size = 'lg',
  className,
}: {
  label?: string;
  tone?: ButtonTone;
  size?: ButtonSize;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  // Honeypot. Humans never see this, so anything in it is a bot.
  const [website, setWebsite] = useState('');

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'We need something to call you.';
    if (!EMAIL_PATTERN.test(email.trim())) next.email = 'That email does not look right.';
    if (company.trim().length < 2) next.company = 'Who are you asking on behalf of?';
    if (message.trim().length < 12) next.message = 'A sentence or two about what you want to fund.';
    return next;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'sending') return;

    const localErrors = validate();
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      setError('Four fields, and two of them are your name and email.');
      setStatus('error');
      setAttempt((n) => n + 1);
      return;
    }

    setStatus('sending');
    setError(null);
    setFieldErrors({});

    try {
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          company: company.trim(),
          message: message.trim(),
          formType: 'SPONSOR_INQUIRY',
          source: 'sponsors',
          campaign: 'prospectus',
          website,
        }),
      });

      const data = (await res.json()) as FormResponse;

      if (!data.ok) {
        setError(data.error ?? 'That did not go through. Try again in a moment.');
        setFieldErrors(data.fields ?? {});
        setStatus('error');
        setAttempt((n) => n + 1);
        return;
      }

      setStatus('sent');
    } catch {
      setError('Your connection dropped somewhere between here and us. Try again.');
      setStatus('error');
      setAttempt((n) => n + 1);
    }
  }

  function startOver() {
    setStatus('idle');
    setError(null);
    setFieldErrors({});
    setName('');
    setEmail('');
    setCompany('');
    setMessage('');
    setWebsite('');
  }

  const sending = status === 'sending';

  return (
    <>
      <Button tone={tone} size={size} className={className} onClick={() => setOpen(true)}>
        {label}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        kicker="Sponsor prospectus"
        title={status === 'sent' ? 'That is with us' : 'Tell us what you want to fund'}
        tone={status === 'sent' ? 'lime' : 'magenta'}
        size="lg"
      >
        {status === 'sent' ? (
          <div className="animate-fade-up space-y-5">
            <div className="border border-line bg-cyan/10 p-5">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">Received</p>
              <p className="mt-2 text-lg leading-relaxed text-ink-soft">
                Thanks, {name.trim().split(' ')[0] || 'friend'}. A human reads these - usually the same day, always
                within two working days.
              </p>
            </div>

            <ol className="space-y-3">
              {[
                [
                  'We reply with the prospectus',
                  'Tier breakdown, what each one funds, and what it costs. One PDF, no deck.',
                ],
                ['A twenty-minute call', 'Only if you want one. Plenty of backers skip straight to signing.'],
                ['Your logo goes up', 'And the funding goes to the events programme, chapters and research.'],
              ].map(([title, detail], i) => (
                <li key={title} className="flex gap-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center border border-line bg-cyan/12 font-display text-xs shadow-panel">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.1em]">{title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">{detail}</span>
                  </span>
                </li>
              ))}
            </ol>

            <div className="flex flex-col gap-3 border-t border-dashed border-line pt-4 sm:flex-row">
              <Button tone="ink" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button tone="paper" onClick={startOver}>
                Send another
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <p className="border border-dashed border-line bg-base p-3 text-xs leading-relaxed text-ink-soft">
              Partnership funds the events programme, chapter activity and industry research. It does not buy
              interviews, member data, or a post on the feed. Tell us which of those you are after and we will send the
              numbers.
            </p>

            <div>
              <Label htmlFor="backer-name" required>
                Your name
              </Label>
              <Input
                id="backer-name"
                name="name"
                autoComplete="name"
                value={name}
                invalid={Boolean(fieldErrors.name)}
                onChange={(event) => setName(event.target.value)}
                placeholder="Amara Diallo"
                disabled={sending}
              />
              <FieldError>{fieldErrors.name}</FieldError>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="backer-email" required>
                  Work email
                </Label>
                <Input
                  id="backer-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  invalid={Boolean(fieldErrors.email)}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  disabled={sending}
                />
                <FieldError>{fieldErrors.email}</FieldError>
              </div>

              <div>
                <Label htmlFor="backer-company" required>
                  Company
                </Label>
                <Input
                  id="backer-company"
                  name="company"
                  autoComplete="organization"
                  value={company}
                  invalid={Boolean(fieldErrors.company)}
                  onChange={(event) => setCompany(event.target.value)}
                  placeholder="Hexforge Labs"
                  disabled={sending}
                />
                <FieldError>{fieldErrors.company}</FieldError>
              </div>
            </div>

            <div>
              <Label htmlFor="backer-message" hint="A few lines is plenty" required>
                What are you hoping to fund?
              </Label>
              <Textarea
                id="backer-message"
                name="message"
                value={message}
                invalid={Boolean(fieldErrors.message)}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="We would like to support the annual conference and post two senior openings on the board."
                disabled={sending}
              />
              <FieldError>{fieldErrors.message}</FieldError>
            </div>

            {/* Honeypot - real people never see it, bots fill everything. */}
            <div className="hidden" aria-hidden>
              <label htmlFor="backer-website">Website</label>
              <input
                id="backer-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
              />
            </div>

            <div aria-live="polite">
              {status === 'error' && error && (
                <p
                  key={attempt}
                  role="alert"
                  className="animate-shake border border-line bg-grad-brand-soft px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink"
                >
                  {error}
                </p>
              )}
              {sending && (
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                  Sending
                  <span
                    aria-hidden
                    className="ml-1 inline-block h-3 w-1.5 animate-caret-blink bg-grad-brand-soft align-middle"
                  />
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-dashed border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                No sales sequence. One reply, from a person.
              </p>
              <Button type="submit" tone="magenta" disabled={sending} className="flex-shrink-0">
                {sending ? 'Sending…' : 'Send the enquiry'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
