import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { route, readBody, guard, jsonOk, ApiError } from '@/lib/api';
import { adminMemberStatusSchema } from '@/lib/validation';
import { LIMITS } from '@/lib/rate-limit';

export const PATCH = route(async (req) => {
  guard(req, 'admin-members', LIMITS.write);
  const admin = await requireAdmin();

  const { userId, status } = await readBody(req, adminMemberStatusSchema);

  if (userId === admin.userId && status !== 'ACTIVE') {
    throw new ApiError('The primary admin account cannot be deactivated or revoked.', 409);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status },
    select: { id: true, email: true, role: true, status: true },
  });

  return jsonOk({ user });
});

export const DELETE = route(async (req) => {
  guard(req, 'admin-members', LIMITS.write);
  const admin = await requireAdmin();

  const id = new URL(req.url).searchParams.get('id');
  if (!id) throw new ApiError('Which member?', 400);
  if (id === admin.userId) throw new ApiError('You cannot delete your own account here.', 409);

  await prisma.user.delete({ where: { id } });
  return jsonOk({ deleted: id });
});
