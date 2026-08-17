import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { route, jsonOk, ApiError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  const session = await requireSession();

  // Find user by ID or email to handle DB re-seeds gracefully
  let user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true } });
  if (!user) {
    user = await prisma.user.findUnique({ where: { email: session.email }, select: { id: true } });
  }
  if (!user) {
    throw new ApiError('Your account session has expired. Please sign in again.', 401);
  }
  const realUserId = user.id;

  // Fetch all active members in directory for direct messaging selection
  const members = await prisma.memberProfile.findMany({
    where: {
      user: { status: 'ACTIVE' },
    },
    select: {
      userId: true,
      fullName: true,
      handle: true,
      jobTitle: true,
      org: true,
      avatarUrl: true,
    },
    orderBy: { fullName: 'asc' },
  });

  const recentDms = await prisma.chatMessage.findMany({
    where: {
      channel: null,
      OR: [{ senderId: realUserId }, { recipientId: realUserId }],
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return jsonOk({
    currentUserId: realUserId,
    members,
    recentDms,
  });
});
