import { z } from 'zod';
import {
  adminEventSchema,
  adminPostSchema,
  adminSponsorSchema,
  adminOpportunitySchema,
  patchable,
} from './validation';

/** A PATCH body must carry ONLY the keys the client sent — no default backfill. */
const patchEvent = patchable(adminEventSchema).extend({ id: z.string().uuid() });
const id = '00000000-0000-4000-8000-000000000000';

// Editing capacity alone must not touch price, status, cpdHours, ticketName...
const capOnly = patchEvent.parse({ id, maxCapacity: 500 });
if (Object.keys(capOnly).sort().join() !== 'id,maxCapacity') {
  throw new Error(`capacity edit leaked fields: ${JSON.stringify(capOnly)}`);
}

// ...and editing price alone must not touch capacity.
const priceOnly = patchEvent.parse({ id, ticketPrice: 99 });
if (Object.keys(priceOnly).sort().join() !== 'id,ticketPrice') {
  throw new Error(`price edit leaked fields: ${JSON.stringify(priceOnly)}`);
}

// Defaults must still apply on create.
const created = adminEventSchema.parse({
  title: 'T', description: 'D', fullDetails: 'F', eventDate: '2026-01-01T09:00',
});
if (created.maxCapacity !== 120 || created.ticketPrice !== 0) {
  throw new Error('create schema lost its defaults');
}

// Validation still runs on the keys that ARE sent.
if (patchEvent.safeParse({ id, maxCapacity: 0 }).success) {
  throw new Error('patchable dropped the min(1) rule on maxCapacity');
}

// Same guarantee for every other admin schema that grew a .default().
const schemas: Array<[string, z.ZodObject<z.ZodRawShape>]> = [
  ['event', adminEventSchema as unknown as z.ZodObject<z.ZodRawShape>],
  ['post', adminPostSchema as unknown as z.ZodObject<z.ZodRawShape>],
  ['sponsor', adminSponsorSchema as unknown as z.ZodObject<z.ZodRawShape>],
  ['opportunity', adminOpportunitySchema as unknown as z.ZodObject<z.ZodRawShape>],
];

for (const [name, schema] of schemas) {
  const patch = patchable(schema).extend({ id: z.string().uuid() });
  const key = Object.keys(schema.shape)[0];
  const sent: Record<string, unknown> = { id, [key]: (schema.shape[key] as z.ZodTypeAny).safeParse('Something').success ? 'Something' : 1 };
  const parsed = patch.parse(sent) as Record<string, unknown>;
  const extra = Object.keys(parsed).filter((k) => !(k in sent));
  if (extra.length) throw new Error(`${name} PATCH backfilled: ${extra.join(', ')}`);
}

console.log('patchable: ok');
