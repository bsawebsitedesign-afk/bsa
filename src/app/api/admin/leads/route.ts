import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { route, readBody, guard, jsonOk, ApiError } from '@/lib/api';
import { adminLeadHandledSchema } from '@/lib/validation';
import { LIMITS } from '@/lib/rate-limit';

export const PATCH = route(async (req) => {
  guard(req, 'admin-leads', LIMITS.write);
  await requireAdmin();

  const { id, isHandled } = await readBody(req, adminLeadHandledSchema);

  const lead = await prisma.formSubmission.update({
    where: { id },
    data: { isHandled },
    select: { id: true, isHandled: true },
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
