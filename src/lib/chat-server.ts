import { prisma } from './prisma';
import { ApiError } from './api';
import type { TokenPayload } from './auth';

/** Presence is refreshed at most this often per member, so a 3s poll is not a 3s write. */
const PRESENCE_REFRESH_MS = 45_000;

/**
 * Resolves the signed-in member to a live DB row. Session ids can outlive a DB
 * re-seed, so fall back to the email before giving up, and refuse anyone whose
 * membership is no longer active - a revoked account keeps a valid JWT for days.
 */
export async function requireChatUser(session: TokenPayload): Promise<string> {
  const user =
    (await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, status: true } })) ??
    (await prisma.user.findUnique({ where: { email: session.email }, select: { id: true, status: true } }));

  if (!user) throw new ApiError('Your account session has expired. Please sign in again.', 401);
  if (user.status !== 'ACTIVE') {
    throw new ApiError('Your membership is not active, so community chat is unavailable.', 403);
  }
  return user.id;
}

/**
 * Every chat request is a heartbeat. The `lastActiveAt` guard makes this a
 * conditional single-statement write rather than a read-then-write per poll.
 */
export async function touchPresence(userId: string): Promise<void> {
  await prisma.memberProfile.updateMany({
    where: { userId, lastActiveAt: { lt: new Date(Date.now() - PRESENCE_REFRESH_MS) } },
    data: { lastActiveAt: new Date() },
  });
}

/** Moves a member's read high-water mark for one conversation up to now. */
export async function markConversationRead(userId: string, conversationId: string): Promise<void> {
  const lastReadAt = new Date();
  await prisma.chatRead.upsert({
    where: { userId_conversationId: { userId, conversationId } },
    update: { lastReadAt },
    create: { userId, conversationId, lastReadAt },
  });
}
