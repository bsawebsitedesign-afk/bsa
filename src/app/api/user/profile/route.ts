import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { route, readBody, guard, jsonOk, ApiError } from '@/lib/api';
import { profileSchema } from '@/lib/validation';
import { LIMITS } from '@/lib/rate-limit';

export const PUT = route(async (req) => {
  guard(req, 'profile', LIMITS.write);

  const session = await requireSession();
  const data = await readBody(req, profileSchema);

  const profile = await prisma.memberProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true, handle: true },
  });
  if (!profile) throw new ApiError('Profile not found.', 404);

  // Handles are public identifiers - check for collisions before writing.
  if (data.handle !== profile.handle) {
    const taken = await prisma.memberProfile.findUnique({
      where: { handle: data.handle },
      select: { id: true },
    });
    if (taken) throw new ApiError('That handle is taken.', 409, { handle: 'Already taken.' });
  }

  const updated = await prisma.memberProfile.update({
    where: { id: profile.id },
    data: {
      fullName: data.fullName,
      handle: data.handle,
      headline: data.headline,
      org: data.org,
      jobTitle: data.jobTitle,
      field: data.field,
      memberType: data.memberType,
      location: data.location,
      bio: data.bio,
      yearsExperience: data.yearsExperience ?? null,
      phone: data.phone || null,
      contactEmail: data.contactEmail || null,
      avatarUrl: data.avatarUrl,
      linkedinUrl: data.linkedinUrl,
      websiteUrl: data.websiteUrl,
      specialties: JSON.stringify(data.specialties),
      skills: JSON.stringify(data.skills),
      openToOpportunities: data.openToOpportunities,
      openToMentoring: data.openToMentoring,
      openToSpeaking: data.openToSpeaking,
      lastActiveAt: new Date(),
    },
  });

  return jsonOk({ profile: updated });
});
