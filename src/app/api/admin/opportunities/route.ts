import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { route, readBody, guard, jsonOk, ApiError } from '@/lib/api';
import { adminOpportunitySchema, patchable } from '@/lib/validation';
import { LIMITS } from '@/lib/rate-limit';
import { uniqueSlug } from '@/lib/slug';

export const POST = route(async (req) => {
  guard(req, 'admin-opportunities', LIMITS.write);
  await requireAdmin();

  const { requirements, ...data } = await readBody(req, adminOpportunitySchema);
  const slug = await uniqueSlug('opportunity', `${data.title}-${data.org}`);

  const opportunity = await prisma.opportunity.create({
    data: { ...data, slug, requirements: JSON.stringify(requirements) },
  });

  return jsonOk({ opportunity }, 201);
});

export const PATCH = route(async (req) => {
  guard(req, 'admin-opportunities', LIMITS.write);
  await requireAdmin();

  const { id, requirements, ...fields } = await readBody(
    req,
    patchable(adminOpportunitySchema).extend({ id: z.string().uuid() }),
  );

  const opportunity = await prisma.opportunity.update({
    where: { id },
    data: {
      ...fields,
      ...(requirements ? { requirements: JSON.stringify(requirements) } : {}),
    },
  });

  return jsonOk({ opportunity });
});

export const DELETE = route(async (req) => {
  guard(req, 'admin-opportunities', LIMITS.write);
  await requireAdmin();

  const id = new URL(req.url).searchParams.get('id');
  if (!id) throw new ApiError('Which opening?', 400);

  await prisma.opportunity.delete({ where: { id } });
  return jsonOk({ deleted: id });
});
