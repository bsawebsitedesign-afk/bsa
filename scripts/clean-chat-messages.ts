import { PrismaClient } from '@prisma/client';
import { CHANNELS, DEFAULT_CHANNEL } from '../src/lib/chat';

const prisma = new PrismaClient();

/**
 * Repairs chat rows written before the API enforced its invariants:
 * a message is either a channel post or a DM, never both, and a channel
 * post always names a channel that still exists.
 */
async function main() {
  console.log('🧹 Cleaning up database chat messages for strict separation…');

  const invalidDms = await prisma.chatMessage.updateMany({
    where: { recipientId: { not: null }, channel: { not: null } },
    data: { channel: null },
  });
  console.log(`✅ Cleaned ${invalidDms.count} DM messages with leftover channel fields.`);

  // Messages parked in a channel the UI no longer lists are invisible forever.
  const orphaned = await prisma.chatMessage.updateMany({
    where: { recipientId: null, channel: { not: null, notIn: CHANNELS.map((c) => c.id) } },
    data: { channel: DEFAULT_CHANNEL },
  });
  console.log(`✅ Moved ${orphaned.count} messages from retired channels into #${DEFAULT_CHANNEL}.`);

  // Receipts for conversations that no longer exist just waste rows.
  const liveKeys = CHANNELS.map((c) => `ch:${c.id}`);
  const staleReads = await prisma.chatRead.deleteMany({
    where: { conversationId: { startsWith: 'ch:', notIn: liveKeys } },
  });
  console.log(`✅ Removed ${staleReads.count} read receipts for retired channels.`);

  console.log('🎉 Chat message database cleanup complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during chat message cleanup:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
