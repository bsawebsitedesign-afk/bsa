import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { route, guard, jsonOk } from '@/lib/api';
import { LIMITS } from '@/lib/rate-limit';
import { CHANNELS, channelKey, dmKey } from '@/lib/chat';
import { requireChatUser, touchPresence } from '@/lib/chat-server';

export const dynamic = 'force-dynamic';

/** How far back a DM unread count is exact. Beyond this the badge just reads "99+". */
const DM_SCAN_LIMIT = 200;

export const GET = route(async (req) => {
  const session = await requireSession();
  guard(req, `chat-threads:${session.userId}`, LIMITS.chatRead);

  const userId = await requireChatUser(session);

  const [members, recentDms, reads] = await Promise.all([
    prisma.memberProfile.findMany({
      where: { user: { status: 'ACTIVE' }, userId: { not: userId } },
      select: {
        userId: true,
        fullName: true,
        handle: true,
        jobTitle: true,
        org: true,
        avatarUrl: true,
        lastActiveAt: true,
      },
      orderBy: { fullName: 'asc' },
    }),
    prisma.chatMessage.findMany({
      where: { channel: null, OR: [{ senderId: userId }, { recipientId: userId }] },
      orderBy: { createdAt: 'desc' },
      take: DM_SCAN_LIMIT,
      select: { senderId: true, recipientId: true, content: true, imageUrl: true, createdAt: true },
    }),
    prisma.chatRead.findMany({ where: { userId }, select: { conversationId: true, lastReadAt: true } }),
    touchPresence(userId),
  ]);

  const readAt = new Map(reads.map((r) => [r.conversationId, r.lastReadAt]));

  // Collapse the DM history into one entry per peer. Unread is counted here in
  // memory rather than with a query per peer - the page is already loaded.
  const threads = new Map<
    string,
    { peerId: string; lastAt: Date; preview: string; lastFromPeer: boolean; unreadCount: number }
  >();
  for (const msg of recentDms) {
    const peerId = msg.senderId === userId ? msg.recipientId : msg.senderId;
    if (!peerId) continue;

    let thread = threads.get(peerId);
    if (!thread) {
      // recentDms is newest-first, so the first hit for a peer is that thread's latest.
      thread = {
        peerId,
        lastAt: msg.createdAt,
        preview: msg.content || (msg.imageUrl ? '📷 Image' : ''),
        lastFromPeer: msg.senderId !== userId,
        unreadCount: 0,
      };
      threads.set(peerId, thread);
    }

    const seenAt = readAt.get(dmKey(peerId));
    if (msg.senderId === peerId && (!seenAt || msg.createdAt > seenAt)) thread.unreadCount += 1;
  }

  // ponytail: one COUNT per channel (there are five). Swap for a per-member
  // counter table if the message table ever gets big enough for this to show up.
  const channels = await Promise.all(
    CHANNELS.map(async (ch) => {
      const seenAt = readAt.get(channelKey(ch.id));
      return {
        id: ch.id,
        unreadCount: await prisma.chatMessage.count({
          where: {
            channel: ch.id,
            recipientId: null,
            senderId: { not: userId },
            ...(seenAt ? { createdAt: { gt: seenAt } } : {}),
          },
        }),
      };
    }),
  );

  return jsonOk({ currentUserId: userId, members, threads: Array.from(threads.values()), channels });
});
