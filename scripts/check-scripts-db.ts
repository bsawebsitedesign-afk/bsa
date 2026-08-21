import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Querying live CustomScript database table in Supabase…');

  const script = await prisma.customScript.findUnique({
    where: { id: 'default' },
  });

  if (!script) {
    console.log('⚠️ No CustomScript entry found in database yet.');
  } else {
    console.log('✅ Found CustomScript Entry:');
    console.log('--- HEADER CODE ---');
    console.log(script.headerCode || '(empty)');
    console.log('--- FOOTER CODE ---');
    console.log(script.footerCode || '(empty)');
    console.log('--- PAGE BODY CODES ---');
    console.log(JSON.stringify(script.pageBodyCodes, null, 2));
    console.log(`Last Updated At: ${script.updatedAt.toISOString()}`);
  }
}

main()
  .catch((e) => console.error('❌ Error checking script DB:', e))
  .finally(async () => await prisma.$disconnect());
