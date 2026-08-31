import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { route, readBody, guard, jsonOk, ApiError } from '@/lib/api';
import { adminLeadHandledSchema } from '@/lib/validation';
import { LIMITS } from '@/lib/rate-limit';

import { sendLeadToHubSpot } from '@/lib/hubspot';

export const PATCH = route(async (req) => {
  guard(req, 'admin-leads', LIMITS.write);
  await requireAdmin();

  const body = await readBody(req, adminLeadHandledSchema.partial().extend({ id: z.string().uuid(), retryHubSpot: z.boolean().optional() }));
  const { id, isHandled, retryHubSpot } = body;

  const existing = await prisma.formSubmission.findUnique({ where: { id } });
  if (!existing) throw new ApiError('Lead not found.', 404);

  let crmData: Record<string, unknown> = {};
  if (retryHubSpot) {
    const crmResult = await sendLeadToHubSpot({
      email: existing.email,
      name: existing.name,
      company: existing.company || undefined,
      formType: existing.formType,
      message: existing.message || undefined,
      source: existing.source || undefined,
      campaign: existing.campaign || undefined,
    });
    crmData = {
      hubspotStatus: crmResult.status,
      hubspotContactId: crmResult.contactId ?? null,
    };
  }

  const lead = await prisma.formSubmission.update({
    where: { id },
    data: {
      ...(isHandled !== undefined ? { isHandled } : {}),
      ...crmData,
    },
  });

  return jsonOk({ lead });
});

export const DELETE = route(async (req) => {
  guard(req, 'admin-leads', LIMITS.write);
  await requireAdmin();

  const id = new URL(req.url).searchParams.get('id');
  if (!id) throw new ApiError('Which lead?', 400);

  await prisma.formSubmission.delete({ where: { id } });
  return jsonOk({ deleted: id });
});
