/**
 * Empties the database of demo content, ready for launch.
 *
 *   npm run db:clean            remove everything the seed created
 *   npm run db:clean -- --keep-admin   leave the admin account in place
 *
 * The schema is left intact - this deletes rows, not tables. Run it once the
 * real membership, events and articles are ready to go in through the admin
 * console, so nothing invented is ever served to the public.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const keepAdmin = process.argv.includes('--keep-admin');

async function main() {
  console.info('\nClearing demo content…\n');

  // Ordered so that a row is never deleted before the rows referencing it.
  // Cascades would handle most of this, but being explicit means the counts
  // printed below are honest.
  const steps: Array<[string, () => Promise<{ count: number }>]> = [
    ['payments', () => db.payment.deleteMany()],
    ['event registrations', () => db.eventRegistration.deleteMany()],
    ['event tickets', () => db.eventTicket.deleteMany()],
    ['event speakers', () => db.eventSpeaker.deleteMany()],
    ['event sponsors', () => db.eventSponsor.deleteMany()],
    ['events', () => db.event.deleteMany()],
    ['applications', () => db.application.deleteMany()],
    ['opportunities', () => db.opportunity.deleteMany()],
    ['resource progress', () => db.resourceProgress.deleteMany()],
    ['resource modules', () => db.resourceModule.deleteMany()],
    ['resources', () => db.resource.deleteMany()],
    ['chapter memberships', () => db.chapterMembership.deleteMany()],
    ['chapters', () => db.chapter.deleteMany()],
    ['sponsors', () => db.sponsor.deleteMany()],
    ['blog posts', () => db.blogPost.deleteMany()],
    ['form submissions', () => db.formSubmission.deleteMany()],
    ['password reset tokens', () => db.passwordResetToken.deleteMany()],
    ['member privacy', () => db.memberPrivacy.deleteMany()],
    ['member profiles', () => db.memberProfile.deleteMany()],
    [
      keepAdmin ? 'users (except admins)' : 'users',
      () => db.user.deleteMany(keepAdmin ? { where: { role: { not: 'ADMIN' } } } : undefined),
    ],
  ];

  for (const [label, run] of steps) {
    const { count } = await run();
    console.info(`  ${String(count).padStart(5)}  ${label}`);
  }

  if (keepAdmin) {
    const admins = await db.user.count({ where: { role: 'ADMIN' } });
    console.info(`\n  ${admins} admin account(s) kept. Their profiles were removed - sign in and rebuild them.`);
  }

  console.info('\nDone. Every page will now render its empty state until real content is added.\n');
}

main()
  .catch((error) => {
    console.error('\nClean failed:', error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
