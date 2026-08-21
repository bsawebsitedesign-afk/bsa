import { prisma } from '@/lib/prisma';
import { verifyPassword, generateToken, setSessionCookie } from '@/lib/auth';
import { route, readBody, guard, jsonOk, ApiError } from '@/lib/api';
import { loginSchema } from '@/lib/validation';
import { LIMITS } from '@/lib/rate-limit';
import { checkLockout, recordFailedAttempt, resetFailedAttempts } from '@/lib/brute-force';
import { detectAndNotifyNewDevice } from '@/lib/device-detection';

export const POST = route(async (req) => {
  guard(req, 'login', LIMITS.auth);

  const { email, password } = await readBody(req, loginSchema);
  const cleanEmail = email.trim().toLowerCase();

  // 1. Brute-force Lockout Defense Check
  const lockout = checkLockout(cleanEmail);
  if (lockout.locked) {
    throw new ApiError(
      `Account login temporarily locked due to multiple failed password attempts. Please try again in ${lockout.retryAfterMinutes} minutes.`,
      429,
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: cleanEmail },
    select: { id: true, email: true, role: true, status: true, passwordHash: true },
  });

  const hash = user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const valid = await verifyPassword(password, hash);

  if (!user || !valid) {
    // Record failed password attempt
    const result = recordFailedAttempt(cleanEmail);
    if (result.lockedNow) {
      throw new ApiError(
        'Account login temporarily locked for 15 minutes due to 5 consecutive failed password attempts.',
        429,
      );
    }
    throw new ApiError('That email and password combination did not work.', 401);
  }

  // 2. Clear failed attempt record on successful login
  resetFailedAttempts(cleanEmail);

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

  // 3. New Device / Unfamiliar Sign-In Detection & Security Alert
  await detectAndNotifyNewDevice(user.id, req);

  setSessionCookie(await generateToken({ userId: user.id, email: user.email, role: user.role }));

  return jsonOk({ role: user.role });
});
