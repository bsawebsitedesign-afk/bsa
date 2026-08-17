import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { route, readBody, guard, jsonOk, ApiError } from '@/lib/api';
import { privacySchema } from '@/lib/validation';
import { LIMITS } from '@/lib/rate-limit';

export const PUT = route(async (req) => {
  guard(req, 'privacy', LIMITS.write);

  const session = await requireSession();
  const data = await readBody(req, privacySchema);

  const profile = await prisma.memberProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!profile) throw new ApiError('Profile not found.', 404);

  const privacy = await prisma.memberPrivacy.upsert({
    where: { profileId: profile.id },
    update: data,
    create: { profileId: profile.id, ...data },
  });

  return jsonOk({ privacy });
});
