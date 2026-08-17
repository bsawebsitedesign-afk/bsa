import { env } from './env';

/**
 * Transactional email adapter.
 *
 * With RESEND_API_KEY set it posts to Resend. Without it, mail is written to
 * the server log so local flows (password reset, ticket confirmation) remain
 * fully testable - the reset link is printed verbatim.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  sent: boolean;
  provider: 'resend' | 'console';
  id?: string;
}

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  if (!env.resendApiKey) {
    console.info(
      [
        '',
        '────────────   EMAIL (console transport) ────────────',
        `To:      ${message.to}`,
        `Subject: ${message.subject}`,
        '',
        message.text ?? stripHtml(message.html),
        '──────────────────────────────────────────────────────',
        '',
      ].join('\n'),
    );
    return { sent: true, provider: 'console' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text ?? stripHtml(message.html),
      }),
    });

    if (!res.ok) {
      console.error('[email] provider rejected message', await res.text());
      return { sent: false, provider: 'resend' };
    }

    const data = (await res.json()) as { id?: string };
    return { sent: true, provider: 'resend', id: data.id };
  } catch (err) {
    console.error('[email] transport failure', err);
    return { sent: false, provider: 'resend' };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* -------------------------------------------------------------------------- */
/* Templates                                                                   */
/* -------------------------------------------------------------------------- */

function shell(body: string): string {
  return `<div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#F4F1EA;color:#0B0B0B;padding:32px">
  <div style="max-width:520px;margin:0 auto;border:2px solid #0B0B0B;background:#FBF9F4;box-shadow:6px 6px 0 #0B0B0B">
    <div style="background:#C6F432;border-bottom:2px solid #0B0B0B;padding:16px 24px;font-weight:800;letter-spacing:-0.02em;font-size:20px">BSA // BUSINESS SECURITY ALLIANCE</div>
    <div style="padding:24px;line-height:1.6;font-size:14px">${body}</div>
    <div style="border-top:2px solid #0B0B0B;padding:12px 24px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#4A4740">Business Security Alliance</div>
  </div>
</div>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#FF3D8B;color:#FBF9F4;border:2px solid #0B0B0B;box-shadow:4px 4px 0 #0B0B0B;padding:12px 20px;text-decoration:none;font-weight:700;text-transform:uppercase;letter-spacing:0.06em">${label}</a>`;
}

export function passwordResetEmail(name: string, resetUrl: string): EmailMessage['html'] {
  return shell(
    `<p>Hey ${escapeHtml(name)},</p>
     <p>Someone asked to reset the password on your BSA account. This link works once and expires in <strong>1 hour</strong>.</p>
     <p style="margin:24px 0">${button(resetUrl, 'Reset my password')}</p>
     <p style="font-size:12px;color:#4A4740">If that wasn't you, ignore this email - nothing changes until the link is used.</p>
     <p style="font-size:12px;color:#4A4740;word-break:break-all">${escapeHtml(resetUrl)}</p>`,
  );
}

export function ticketEmail(name: string, eventTitle: string, code: string, when: string, where: string): string {
  return shell(
    `<p>Your place is confirmed, ${escapeHtml(name)}.</p>
     <p><strong>${escapeHtml(eventTitle)}</strong><br/>${escapeHtml(when)}<br/>${escapeHtml(where)}</p>
     <p style="margin:24px 0;padding:16px;border:2px dashed #0B0B0B;background:#EEFBC4;text-align:center">
       <span style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#4A4740">Registration reference</span><br/>
       <strong style="font-size:22px;letter-spacing:0.08em">${escapeHtml(code)}</strong>
     </p>
     <p>Please bring this reference with you. We will send joining details closer to the date.</p>`,
  );
}

export function welcomeEmail(name: string, handle: string): string {
  return shell(
    `<p>Welcome to the Business Security Alliance, ${escapeHtml(name)}.</p>
     <p>Your member profile is live at <strong>@${escapeHtml(handle)}</strong>. Three things worth doing first:</p>
     <ul>
       <li>Complete your profile so other members can find you in the <strong>directory</strong>.</li>
       <li>Join your <strong>regional chapter</strong> and meet people near you.</li>
       <li>Check the <strong>events calendar</strong> for the next roundtable or conference.</li>
     </ul>
     <p style="margin:24px 0">${button(`${env.appUrl}/dashboard`, 'Open my dashboard')}</p>`,
  );
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
