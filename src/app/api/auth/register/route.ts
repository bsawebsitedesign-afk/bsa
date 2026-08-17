import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { route, readBody, guard, jsonOk, ApiError } from '@/lib/api';
import { registerSchema } from '@/lib/validation';
import { LIMITS } from '@/lib/rate-limit';
import { sendEmail, welcomeEmail } from '@/lib/email';
import { slugify } from '@/lib/utils';

/** Derives a unique @handle from the requested one, or from the member's name. */
async function resolveHandle(requested: string | undefined, fullName: string): Promise<string> {
  const base = (requested || slugify(fullName).replace(/-/g, '_') || 'member').slice(0, 18);

  for (let attempt = 0; attempt < 30; attempt++) {
    const candidate = attempt === 0 ? base : `${base}${attempt + 1}`;
    const taken = await prisma.memberProfile.findUnique({ where: { handle: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }

  return `${base}${Date.now().toString(36).slice(-4)}`;
}

export const POST = route(async (req) => {
  guard(req, 'register', LIMITS.register);

  const data = await readBody(req, registerSchema);

  const existing = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (existing) {
    throw new ApiError('That email already has an account. Try signing in.', 409, { email: 'Already registered.' });
  }

  if (data.handle) {
    const handleTaken = await prisma.memberProfile.findUnique({ where: { handle: data.handle }, select: { id: true } });
    if (handleTaken) {
      throw new ApiError('That handle is taken.', 409, { handle: 'Already taken.' });
    }
  }

  const handle = await resolveHandle(data.handle, data.fullName);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash: await hashPassword(data.password),
      role: 'MEMBER',
      status: 'PENDING',
      profile: {
        create: {
          fullName: data.fullName,
          handle,
          headline: data.headline || data.jobTitle || 'Security professional',
          org: data.org,
          jobTitle: data.jobTitle || '',
          field: data.field || 'Security',
          memberType: data.memberType,
          location: data.location || '',
          bio: '',
          privacy: { create: {} },
        },
      },
    },
    select: { id: true, email: true, role: true, status: true },
  });

  // Send registration notice
  void sendEmail({
    to: user.email,
    subject: 'BSA Registration Received - Pending Activation',
    html: welcomeEmail(data.fullName, handle),
  }).catch(() => undefined);

  return jsonOk({
    pending: true,
    message: 'Your registration request has been submitted for executive review. An administrator will activate your account shortly.',
    handle,
  });
});
