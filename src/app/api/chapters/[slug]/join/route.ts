import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { route, guard, jsonOk, ApiError } from '@/lib/api';
import { LIMITS } from '@/lib/rate-limit';

export const POST = route(async (req, { params }: { params: { slug: string } }) => {
  guard(req, 'chapter-join', LIMITS.write);

  const session = await requireSession();

  const chapter = await prisma.chapter.findUnique({
    where: { slug: params.slug },
    select: { id: true, name: true, isActive: true },
  });
  if (!chapter || !chapter.isActive) throw new ApiError('That chapter is not active.', 404);

  const existing = await prisma.chapterMembership.findUnique({
    where: { chapterId_userId: { chapterId: chapter.id, userId: session.userId } },
    select: { id: true },
  });
  if (existing) {
    return jsonOk({ alreadyJoined: true, message: `You're already in ${chapter.name}.` });
  }

  await prisma.chapterMembership.create({
    data: { chapterId: chapter.id, userId: session.userId },
  });

  return jsonOk({
    alreadyJoined: false,
    message: `You have joined ${chapter.name}. The chapter chair will be in touch.`,
  });
});

export const DELETE = route(async (req, { params }: { params: { slug: string } }) => {
  guard(req, 'chapter-leave', LIMITS.write);

  const session = await requireSession();

  const chapter = await prisma.chapter.findUnique({
    where: { slug: params.slug },
    select: { id: true },
  });
  if (!chapter) throw new ApiError('That chapter does not exist.', 404);

  await prisma.chapterMembership.deleteMany({
    where: { chapterId: chapter.id, userId: session.userId },
  });

  return jsonOk({ message: 'You left the chapter.' });
});
