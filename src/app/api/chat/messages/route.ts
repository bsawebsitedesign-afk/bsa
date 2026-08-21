import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { route, readBody, guard, jsonOk, ApiError } from '@/lib/api';
import { chatSendSchema } from '@/lib/validation';
import { LIMITS } from '@/lib/rate-limit';
import { resolveChannel, channelKey, dmKey } from '@/lib/chat';
import { requireChatUser, touchPresence, markConversationRead } from '@/lib/chat-server';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

function parseDate(raw: string | null): Date | null {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Attaches sender profiles in one query instead of a join per message. */
async function withSenders<T extends { senderId: string }>(rows: T[]) {
  const senderIds = Array.from(new Set(rows.map((m) => m.senderId)));
  const profiles = await prisma.memberProfile.findMany({
    where: { userId: { in: senderIds } },
    select: { userId: true, fullName: true, handle: true, jobTitle: true, org: true, avatarUrl: true },
  });
  const byUser = new Map(profiles.map(({ userId, ...profile }) => [userId, profile]));

  return rows.map((msg) => ({
    ...msg,
    sender: {
      id: msg.senderId,
      email: '',
      role: 'MEMBER',
      profile: byUser.get(msg.senderId) ?? null,
    },
  }));
}

/**
 * Three read modes, all capped at one page:
 *   - default: the newest page of the conversation (plus `hasMore` for history)
 *   - `since`: only what has arrived since the client's newest message (polling)
 *   - `before`: the page immediately older than the client's oldest message
 *
 * `markRead=1` moves the caller's read receipt, which the client only sends when
 * the feed is actually visible and scrolled to the bottom.
 */
export const GET = route(async (req) => {
  const session = await requireSession();
  // Keyed by member, not IP: a whole office behind one NAT would otherwise share a budget.
  guard(req, `chat-read:${session.userId}`, LIMITS.chatRead);

  const userId = await requireChatUser(session);

  const url = new URL(req.url);
  const recipientId = url.searchParams.get('recipientId')?.trim() || null;
  const since = parseDate(url.searchParams.get('since'));
  const before = parseDate(url.searchParams.get('before'));
  const shouldMarkRead = url.searchParams.get('markRead') === '1';

  // A DM lives outside every channel, and is only ever readable by its two participants.
  const scope = recipientId
    ? {
        channel: null,
        OR: [
          { senderId: userId, recipientId },
          { senderId: recipientId, recipientId: userId },
        ],
      }
    : { channel: resolveChannel(url.searchParams.get('channel')), recipientId: null };

  // `gte` rather than `gt`: two messages can share a millisecond, and the client
  // dedupes by id anyway, so overlapping is safe where skipping is not.
  const window = since ? { createdAt: { gte: since } } : before ? { createdAt: { lt: before } } : {};

  const conversationId = recipientId ? dmKey(recipientId) : channelKey(scope.channel as string);

  const [rows, peer] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { ...scope, ...window },
      orderBy: since ? [{ createdAt: 'asc' }, { id: 'asc' }] : [{ createdAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE,
    }),
    // Delivery status and presence only exist for a 1-on-1 thread. The peer's
    // receipt is keyed by *our* id: it records how far they have read of us.
    recipientId
      ? Promise.all([
          prisma.chatRead.findUnique({
            where: { userId_conversationId: { userId: recipientId, conversationId: dmKey(userId) } },
            select: { lastReadAt: true },
          }),
          prisma.memberProfile.findUnique({ where: { userId: recipientId }, select: { lastActiveAt: true } }),
        ]).then(([read, profile]) => ({
          lastReadAt: read?.lastReadAt ?? null,
          lastActiveAt: profile?.lastActiveAt ?? null,
        }))
      : Promise.resolve(null),
    touchPresence(userId),
    shouldMarkRead ? markConversationRead(userId, conversationId) : Promise.resolve(),
  ]);

  // Newest-first pages are read backwards, so flip them into reading order.
  const ordered = since ? rows : rows.reverse();

  return jsonOk({
    messages: await withSenders(ordered),
    currentUserId: userId,
    peer,
    hasMore: !since && rows.length === PAGE_SIZE,
  });
});

export const POST = route(async (req) => {
  const session = await requireSession();
  guard(req, `chat-send:${session.userId}`, LIMITS.chatSend);

  const userId = await requireChatUser(session);
  const body = await readBody(req, chatSendSchema);

  let recipientId: string | null = null;
  if (body.recipientId) {
    if (body.recipientId === userId) throw new ApiError('You cannot send a direct message to yourself.', 400);
    const recipient = await prisma.user.findFirst({
      where: { id: body.recipientId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!recipient) throw new ApiError('That member is no longer available for messages.', 404);
    recipientId = recipient.id;
  }

  const channel = recipientId ? null : resolveChannel(body.channel);

  const created = await prisma.chatMessage.create({
    data: { senderId: userId, channel, recipientId, content: body.content, imageUrl: body.imageUrl },
  });

  await Promise.all([
    touchPresence(userId),
    // Sending is reading: nothing you just posted should come back as unread.
    markConversationRead(userId, recipientId ? dmKey(recipientId) : channelKey(channel as string)),
  ]);

  const [message] = await withSenders([created]);
  return jsonOk({ message });
});
