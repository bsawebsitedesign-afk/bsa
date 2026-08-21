import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing Chat API database queries…');

  const users = await prisma.user.findMany({
    select: { id: true, email: true, profile: { select: { fullName: true, handle: true } } },
  });

  console.log(`Found ${users.length} users in database:`);
  users.forEach((u) => {
    console.log(`  - ${u.email} (id: ${u.id}, handle: @${u.profile?.handle})`);
  });

  const chatMessagesCount = await prisma.chatMessage.count();
  console.log(`Total Chat Messages in database: ${chatMessagesCount}`);

  const generalMessages = await prisma.chatMessage.findMany({
    where: { channel: 'general' },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log(`Found ${generalMessages.length} messages in #general channel:`);
  generalMessages.forEach((m) => {
    console.log(`  [${m.createdAt.toISOString()}] ${m.senderId}: "${m.content}"`);
  });

  const chatReadsCount = await prisma.chatRead.count();
  console.log(`Total ChatRead records: ${chatReadsCount}`);

  console.log('✅ Chat Database Check PASSED!');
}

main()
  .catch((e) => {
    console.error('❌ Error during chat DB test:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
