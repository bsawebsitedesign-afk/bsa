import { prisma } from '@/lib/prisma';
import { requireSession, verifyPassword, hashPassword } from '@/lib/auth';
import { route, readBody, guard, jsonOk, ApiError } from '@/lib/api';
import { changePasswordSchema } from '@/lib/validation';
import { LIMITS } from '@/lib/rate-limit';

export const POST = route(async (req) => {
  guard(req, 'change-password', LIMITS.auth);

  const session = await requireSession();
  const { currentPassword, newPassword } = await readBody(req, changePasswordSchema);

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, passwordHash: true },
  });
  if (!user) throw new ApiError('Account not found.', 404);

  // Proving knowledge of the current password stops a hijacked session from
  // locking the real owner out.
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new ApiError('That is not your current password.', 403, { currentPassword: 'Incorrect.' });
  }

  if (await verifyPassword(newPassword, user.passwordHash)) {
    throw new ApiError('Pick a password you have not used here before.', 422, {
      newPassword: 'Same as your current one.',
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  return jsonOk({ message: 'Password changed.' });
});
