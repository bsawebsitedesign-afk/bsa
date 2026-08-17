import { prisma } from '@/lib/prisma';
import { createResetToken } from '@/lib/auth';
import { route, readBody, guard, jsonOk } from '@/lib/api';
import { forgotPasswordSchema } from '@/lib/validation';
import { LIMITS } from '@/lib/rate-limit';
import { sendEmail, passwordResetEmail } from '@/lib/email';
import { env } from '@/lib/env';

export const POST = route(async (req) => {
  guard(req, 'forgot-password', LIMITS.passwordReset);

  const { email } = await readBody(req, forgotPasswordSchema);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, profile: { select: { fullName: true } } },
  });

  if (user) {
    // One live token at a time - issuing a new one retires the old ones.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const { token, tokenHash, expiresAt } = createResetToken();

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    await sendEmail({
      to: user.email,
      subject: 'Reset your BSA password',
      html: passwordResetEmail(user.profile?.fullName ?? 'there', `${env.appUrl}/reset-password?token=${token}`),
    });
  }

  // The response is identical whether or not the account exists, so this
  // endpoint cannot be used to discover which emails are registered.
  return jsonOk({ message: 'If that email has an account, a reset link is on its way.' });
});
