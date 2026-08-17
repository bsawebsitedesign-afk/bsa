import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { route, readBody, guard, jsonOk } from '@/lib/api';
import { formSubmissionSchema } from '@/lib/validation';
import { LIMITS } from '@/lib/rate-limit';
import { sendLeadToHubSpot } from '@/lib/hubspot';

export const POST = route(async (req) => {
  guard(req, 'forms', LIMITS.form);

  const data = await readBody(req, formSubmissionSchema);

  // Honeypot field: only bots fill it in. Return success so they don't retry.
  if (data.website) {
    return jsonOk({ message: 'Thank you - your enquiry has been received.' });
  }

  const session = await getSession();
  let validUserId: string | null = null;
  if (session?.userId) {
    const userExists = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true },
    });
    if (userExists) validUserId = userExists.id;
  }

  let crm: { status: 'SYNCED' | 'FAILED' | 'SKIPPED'; contactId: string | null } = { status: 'SKIPPED', contactId: null };
  try {
    const crmResult = await sendLeadToHubSpot({
      email: data.email,
      name: data.name,
      company: data.company,
      formType: data.formType,
      message: data.message,
      source: data.source,
      campaign: data.campaign,
    });
    crm = {
      status: crmResult.status,
      contactId: crmResult.contactId ?? null,
    };
  } catch (err) {
    console.error('[forms] hubspot sync warning:', err);
  }

  const submission = await prisma.formSubmission.create({
    data: {
      userId: validUserId,
      name: data.name,
      email: data.email,
      company: data.company,
      message: data.message,
      formType: data.formType,
      source: data.source || 'website',
      campaign: data.campaign || 'organic',
      hubspotStatus: crm.status,
      hubspotContactId: crm.contactId ?? null,
    },
    select: { id: true },
  });

  return jsonOk({ submissionId: submission.id, message: 'Thank you - your enquiry has been received.' });
});
