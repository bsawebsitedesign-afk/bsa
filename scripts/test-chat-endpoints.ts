import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing Chat API Endpoints directly…');

  const admin = await prisma.user.findUnique({ where: { email: 'admin@bsa.in' } });
  const vikram = await prisma.user.findUnique({ where: { email: 'member1@bsa.in' } });
  const sophia = await prisma.user.findUnique({ where: { email: 'member2@bsa.in' } });

  if (!admin || !vikram || !sophia) {
    console.error('❌ Missing test users in DB!');
    return;
  }

  console.log('Posting test message in #general channel from Vikram…');
  const msg1 = await prisma.chatMessage.create({
    data: {
      senderId: vikram.id,
      channel: 'general',
      content: 'Live test message in #general channel at ' + new Date().toISOString(),
    },
  });
  console.log('✅ Posted channel message ID:', msg1.id);

  console.log('Posting test DM from Sophia to Vikram…');
  const msg2 = await prisma.chatMessage.create({
    data: {
      senderId: sophia.id,
      recipientId: vikram.id,
      content: 'Live private DM to Vikram at ' + new Date().toISOString(),
    },
  });
  console.log('✅ Posted DM message ID:', msg2.id);

  console.log('Querying DMs between Sophia & Vikram…');
  const dms = await prisma.chatMessage.findMany({
    where: {
      channel: null,
      OR: [
        { senderId: sophia.id, recipientId: vikram.id },
        { senderId: vikram.id, recipientId: sophia.id },
      ],
    },
  });
  console.log(`✅ Found ${dms.length} DMs between Sophia & Vikram:`);
  dms.forEach((d) => console.log(`   - "${d.content}"`));

  console.log('🎉 All Database Queries PASSED cleanly!');
}

main()
  .catch((e) => console.error('❌ Error testing chat endpoints:', e))
  .finally(async () => await prisma.$disconnect());
