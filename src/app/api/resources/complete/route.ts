import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { route, readBody, guard, jsonOk, ApiError } from '@/lib/api';
import { moduleCompleteSchema } from '@/lib/validation';
import { LIMITS } from '@/lib/rate-limit';

/**
 * Marks a professional-development module as complete for the signed-in member.
 * Progress is a record of study, not a score - there are no points attached.
 */
export const POST = route(async (req) => {
  guard(req, 'module-complete', LIMITS.write);

  const session = await requireSession();
  const { moduleId } = await readBody(req, moduleCompleteSchema);

  const trackModule = await prisma.resourceModule.findUnique({
    where: { id: moduleId },
    select: { id: true, title: true, resourceId: true },
  });
  if (!trackModule) throw new ApiError('That module does not exist.', 404);

  const already = await prisma.resourceProgress.findUnique({
    where: { userId_moduleId: { userId: session.userId, moduleId } },
    select: { id: true },
  });
  if (already) {
    return jsonOk({ alreadyComplete: true, message: 'Already marked complete.' });
  }

  await prisma.resourceProgress.create({ data: { userId: session.userId, moduleId } });

  const [totalModules, doneModules] = await Promise.all([
    prisma.resourceModule.count({ where: { resourceId: trackModule.resourceId } }),
    prisma.resourceProgress.count({
      where: { userId: session.userId, module: { resourceId: trackModule.resourceId } },
    }),
  ]);

  await prisma.memberProfile.updateMany({
    where: { userId: session.userId },
    data: { lastActiveAt: new Date() },
  });

  return jsonOk({
    alreadyComplete: false,
    doneModules,
    totalModules,
    resourceComplete: totalModules > 0 && doneModules >= totalModules,
  });
});

export const DELETE = route(async (req) => {
  guard(req, 'module-complete', LIMITS.write);

  const session = await requireSession();
  const moduleId = new URL(req.url).searchParams.get('moduleId');
  if (!moduleId) throw new ApiError('Which module?', 400);

  await prisma.resourceProgress.deleteMany({ where: { userId: session.userId, moduleId } });

  return jsonOk({ message: 'Marked as not complete.' });
});
