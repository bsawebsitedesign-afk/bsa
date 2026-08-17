import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { route, readBody, guard, jsonOk, ApiError } from '@/lib/api';
import { adminSponsorSchema } from '@/lib/validation';
import { LIMITS } from '@/lib/rate-limit';

export const POST = route(async (req) => {
  guard(req, 'admin-sponsors', LIMITS.write);
  await requireAdmin();

  const data = await readBody(req, adminSponsorSchema);
  const sponsor = await prisma.sponsor.create({ data });
  return jsonOk({ sponsor }, 201);
});

export const PATCH = route(async (req) => {
  guard(req, 'admin-sponsors', LIMITS.write);
  await requireAdmin();

  const { id, ...fields } = await readBody(req, adminSponsorSchema.partial().extend({ id: z.string().uuid() }));
  const sponsor = await prisma.sponsor.update({ where: { id }, data: fields });
  return jsonOk({ sponsor });
});

export const DELETE = route(async (req) => {
  guard(req, 'admin-sponsors', LIMITS.write);
  await requireAdmin();

  const id = new URL(req.url).searchParams.get('id');
  if (!id) throw new ApiError('Which sponsor?', 400);

  await prisma.sponsor.delete({ where: { id } });
  return jsonOk({ deleted: id });
});
