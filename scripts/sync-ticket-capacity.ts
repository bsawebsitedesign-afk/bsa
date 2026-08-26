/**
 * One-time backfill: realign every event ticket's quantityAvailable with its
 * event's maxCapacity. Capacity edits made before the PATCH route synced the
 * two left the public "seats remaining" count and the registration gate stale.
 *
 * Run: npx tsx scripts/sync-ticket-capacity.ts
 */
import { prisma } from '../src/lib/prisma';

async function main() {
  const events = await prisma.event.findMany({
    select: { id: true, title: true, maxCapacity: true, tickets: { select: { id: true, quantityAvailable: true, quantitySold: true } } },
  });

  let fixed = 0;
  for (const event of events) {
    if (event.tickets.length !== 1) continue; // multi-tier: capacity can't map onto tiers
    const ticket = event.tickets[0];
    if (ticket.quantityAvailable === event.maxCapacity) continue;

    await prisma.eventTicket.update({ where: { id: ticket.id }, data: { quantityAvailable: event.maxCapacity } });
    fixed++;
    const oversold = ticket.quantitySold > event.maxCapacity ? `  ⚠ ${ticket.quantitySold} already sold` : '';
    console.log(`${event.title}: ${ticket.quantityAvailable} → ${event.maxCapacity}${oversold}`);
  }

  console.log(`\n${fixed} of ${events.length} events realigned.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
