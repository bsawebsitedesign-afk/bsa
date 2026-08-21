import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { route, jsonOk, ApiError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const GET = route(async (req) => {
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

  const url = new URL(req.url);
  const channel = url.searchParams.get('channel');
  const recipientId = url.searchParams.get('recipientId');

  let whereClause: any = {};

  if (recipientId && recipientId.trim()) {
    const cleanRecipientId = recipientId.trim();
    whereClause = {
      channel: null,
      OR: [
        { senderId: realUserId, recipientId: cleanRecipientId },
        { senderId: cleanRecipientId, recipientId: realUserId },
      ],
    };
  } else {
    const activeChannel = channel?.trim() || 'general';
    whereClause = {
      channel: activeChannel,
      recipientId: null,
    };
  }

  const rawMessages = await prisma.chatMessage.findMany({
    where: whereClause,
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  // Extract all unique sender IDs to fetch profiles
  const senderIds = Array.from(new Set(rawMessages.map((m) => m.senderId)));
  const profiles = await prisma.memberProfile.findMany({
    where: { userId: { in: senderIds } },
    select: {
      userId: true,
      fullName: true,
      handle: true,
      jobTitle: true,
      org: true,
      avatarUrl: true,
    },
  });

  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  const messages = rawMessages.map((msg) => {
    const senderProf = profileMap.get(msg.senderId);
    return {
      ...msg,
      sender: {
        id: msg.senderId,
        email: '',
        role: 'MEMBER',
        profile: senderProf
          ? {
              fullName: senderProf.fullName,
              handle: senderProf.handle,
              jobTitle: senderProf.jobTitle,
              org: senderProf.org,
              avatarUrl: senderProf.avatarUrl,
            }
          : null,
      },
    };
  });

  return jsonOk({ messages, currentUserId: realUserId });
});

export const POST = route(async (req) => {
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

  const body = (await req.json()) as {
    channel?: string;
    recipientId?: string;
    content: string;
    imageUrl?: string;
  };

  const content = body.content?.trim();
  if (!content && !body.imageUrl) {
    throw new ApiError('Message content or image is required.', 400);
  }

  const rawRecipientId =
    typeof body.recipientId === 'string' && body.recipientId.trim().length > 0 ? body.recipientId.trim() : null;

  let validRecipientId: string | null = null;
  if (rawRecipientId) {
    const recipientUser = await prisma.user.findUnique({ where: { id: rawRecipientId }, select: { id: true } });
    if (recipientUser) {
      validRecipientId = recipientUser.id;
    }
  }

  const activeChannel = validRecipientId ? null : body.channel?.trim() || 'general';

  const createdMsg = await prisma.chatMessage.create({
    data: {
      senderId: realUserId,
      channel: activeChannel,
      recipientId: validRecipientId,
      content: content || '',
      imageUrl: body.imageUrl || null,
    },
  });

  const senderProf = await prisma.memberProfile.findUnique({
    where: { userId: realUserId },
    select: {
      fullName: true,
      handle: true,
      jobTitle: true,
      org: true,
      avatarUrl: true,
    },
  });

  const message = {
    ...createdMsg,
    sender: {
      id: realUserId,
      email: session.email,
      role: session.role,
      profile: senderProf
        ? {
            fullName: senderProf.fullName,
            handle: senderProf.handle,
            jobTitle: senderProf.jobTitle,
            org: senderProf.org,
            avatarUrl: senderProf.avatarUrl,
          }
        : null,
    },
  };

  return jsonOk({ message });
});
