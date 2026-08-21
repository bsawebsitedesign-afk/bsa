import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('⚡ Creating 2 Dedicated Test Member Accounts…');

  const passwordHash = await bcrypt.hash('Member@1011', 12);

  // 1. Vikram Malhotra (Cybersecurity CISO)
  const user1 = await prisma.user.upsert({
    where: { email: 'member1@bsa.in' },
    update: {
      passwordHash,
      role: 'MEMBER',
      status: 'ACTIVE',
      emailVerified: true,
    },
    create: {
      email: 'member1@bsa.in',
      passwordHash,
      role: 'MEMBER',
      status: 'ACTIVE',
      emailVerified: true,
      profile: {
        create: {
          fullName: 'Vikram Malhotra',
          handle: 'vikram',
          jobTitle: 'CISO & VP Cyber Defense',
          headline: 'Leading Global Threat Operations & Zero Trust Security Architecture',
          bio: 'Executive CISO with 15+ years of experience building enterprise SOC teams, cloud security controls, and incident response frameworks.',
          org: 'Apex Cyber Systems',
          field: 'Cybersecurity',
          memberType: 'PRACTITIONER',
          location: 'New York, NY, USA',
          linkedinUrl: 'https://linkedin.com/in/vikram-malhotra-ciso',
          privacy: {
            create: {
              showEmail: true,
              showPhone: false,
              showOrg: true,
              isPublic: true,
              searchableInDirectory: true,
            },
          },
        },
      },
    },
  });

  console.log('✅ Account 1 Ready:', user1.email);

  // 2. Sophia Chen (Physical Security Director)
  const user2 = await prisma.user.upsert({
    where: { email: 'member2@bsa.in' },
    update: {
      passwordHash,
      role: 'MEMBER',
      status: 'ACTIVE',
      emailVerified: true,
    },
    create: {
      email: 'member2@bsa.in',
      passwordHash,
      role: 'MEMBER',
      status: 'ACTIVE',
      emailVerified: true,
      profile: {
        create: {
          fullName: 'Sophia Chen',
          handle: 'sophia',
          jobTitle: 'Global Director of Physical Security',
          headline: 'Specializing in Converged Infrastructure, Facility Access & Executive Protection',
          bio: 'Physical security director overseeing multi-region data center compliance, biometric access control, and executive protection teams.',
          org: 'Vanguard Security Global',
          field: 'Physical Security',
          memberType: 'PRACTITIONER',
          location: 'London, United Kingdom',
          linkedinUrl: 'https://linkedin.com/in/sophia-chen-security',
          privacy: {
            create: {
              showEmail: true,
              showPhone: false,
              showOrg: true,
              isPublic: true,
              searchableInDirectory: true,
            },
          },
        },
      },
    },
  });

  console.log('✅ Account 2 Ready:', user2.email);

  // Seed sample chat messages between them for community testing
  await prisma.chatMessage.createMany({
    data: [
      {
        content: "Hello everyone! Excited to join the BSA Executive Alliance community network.",
        senderId: user1.id,
        channel: "general",
      },
      {
        content: "Welcome Vikram! Looking forward to collaborating on converged physical and cyber defense strategies.",
        senderId: user2.id,
        channel: "general",
      },
    ],
  });

  console.log('💬 Sample Live Chat Messages Populated!');
  console.log('🎉 SUCCESS! Both test member profiles are active and ready for testing.');
}

main()
  .catch((e) => {
    console.error('❌ Error creating test members:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
