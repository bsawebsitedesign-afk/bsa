import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning up database chat messages for strict separation…');

  // Fix any chat messages that have both channel AND recipientId set
  const invalidDms = await prisma.chatMessage.updateMany({
    where: {
      recipientId: { not: null },
      channel: { not: null },
    },
    data: {
      channel: null,
    },
  });

  console.log(`✅ Cleaned ${invalidDms.count} DM messages with leftover channel fields.`);

  // Fix any channel messages that have recipientId set
  const invalidChannels = await prisma.chatMessage.updateMany({
    where: {
      channel: { not: null },
      recipientId: { not: null },
    },
    data: {
      recipientId: null,
    },
  });

  console.log(`✅ Cleaned ${invalidChannels.count} Channel messages with leftover recipientId fields.`);

  console.log('🎉 Chat message database cleanup complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during chat message cleanup:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
