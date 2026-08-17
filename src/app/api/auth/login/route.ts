import { prisma } from '@/lib/prisma';
import { verifyPassword, generateToken, setSessionCookie } from '@/lib/auth';
import { route, readBody, guard, jsonOk, ApiError } from '@/lib/api';
import { loginSchema } from '@/lib/validation';
import { LIMITS } from '@/lib/rate-limit';

export const POST = route(async (req) => {
  guard(req, 'login', LIMITS.auth);

  const { email, password } = await readBody(req, loginSchema);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, status: true, passwordHash: true },
  });

  const hash = user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const valid = await verifyPassword(password, hash);

  if (!user || !valid) {
    throw new ApiError('That email and password combination did not work.', 401);
  }

  // Check account activation status
  if (user.status === 'PENDING') {
    throw new ApiError('Your registration request is currently pending administrator activation.', 403);
  }
  if (user.status === 'REVOKED') {
    throw new ApiError('Your account access has been revoked by an administrator.', 403);
  }

  await prisma.memberProfile.updateMany({
    where: { userId: user.id },
    data: { lastActiveAt: new Date() },
  });

  setSessionCookie(await generateToken({ userId: user.id, email: user.email, role: user.role }));

  return jsonOk({ role: user.role });
});
