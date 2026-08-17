import { prisma } from '@/lib/prisma';
import { hashPassword, hashToken } from '@/lib/auth';
import { route, readBody, guard, jsonOk, ApiError } from '@/lib/api';
import { resetPasswordSchema } from '@/lib/validation';
import { LIMITS } from '@/lib/rate-limit';

/**
 * Completes a password reset.
 *
 * The previous implementation accepted `{ email, newPassword }` and rewrote the
 * password for any account - an unauthenticated full-takeover of every user.
 * A reset now requires possession of a single-use, one-hour token that was
 * emailed to the address on file, and only the sha256 of that token is stored.
 */
export const POST = route(async (req) => {
  guard(req, 'reset-password', LIMITS.passwordReset);

  const { token, password } = await readBody(req, resetPasswordSchema);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new ApiError('That reset link is invalid or has expired. Request a new one.', 400);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(password) },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Retire every other outstanding token for this account.
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return jsonOk({ message: 'Password updated. You can sign in now.' });
});
