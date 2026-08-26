import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { route, readBody, guard, jsonOk, ApiError } from '@/lib/api';
import { adminEventSchema } from '@/lib/validation';
import { LIMITS } from '@/lib/rate-limit';
import { uniqueSlug } from '@/lib/slug';

export const POST = route(async (req) => {
  guard(req, 'admin-events', LIMITS.write);
  await requireAdmin();

  const data = await readBody(req, adminEventSchema);
  const slug = await uniqueSlug('event', data.title);

  const event = await prisma.event.create({
    data: {
      title: data.title,
      slug,
      category: data.category,
      description: data.description,
      fullDetails: data.fullDetails || data.description,
      location: data.location,
      locationType: data.locationType,
      venueName: data.venueName,
      eventDate: data.eventDate,
      startTime: data.startTime,
      endTime: data.endTime,
      maxCapacity: data.maxCapacity,
      heroImageUrl: data.heroImageUrl,
      cpdHours: data.cpdHours,
      status: data.status,
      isPaid: data.ticketPrice > 0,
      tickets: {
        create: [
          {
            name: data.ticketName || 'Standard Entry',
            price: data.ticketPrice,
            currency: 'USD',
            quantityAvailable: data.maxCapacity,
          },
        ],
      },
    },
    include: { tickets: true },
  });

  revalidatePath('/events');
  revalidatePath('/events/[slug]', 'page');
  revalidatePath('/admin');
  revalidatePath('/');

  return jsonOk({ event }, 201);
});

export const PATCH = route(async (req) => {
  guard(req, 'admin-events', LIMITS.write);
  await requireAdmin();

  const data = await readBody(req, adminEventSchema.partial().extend({ id: z.string().uuid() }));
  const { id, ticketName, ticketPrice, ...fields } = data;

  const existing = await prisma.event.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!existing) throw new ApiError('Event not found.', 404);

  // Ensure ticket record exists and update price/name if provided
  let existingTicket = await prisma.eventTicket.findFirst({ where: { eventId: id } });
  if (!existingTicket) {
    await prisma.eventTicket.create({
      data: {
        eventId: id,
        name: ticketName || 'Standard Entry',
        price: ticketPrice !== undefined ? ticketPrice : 0,
        currency: 'USD',
        quantityAvailable: fields.maxCapacity ?? 100,
      },
    });
  } else if (ticketPrice !== undefined || ticketName !== undefined) {
    await prisma.eventTicket.update({
      where: { id: existingTicket.id },
      data: {
        ...(ticketPrice !== undefined ? { price: ticketPrice } : {}),
        ...(ticketName !== undefined ? { name: ticketName } : {}),
      },
    });
  }

  const event = await prisma.event.update({
    where: { id },
    data: {
      ...fields,
      ...(fields.title && fields.title !== existing.title ? { slug: await uniqueSlug('event', fields.title, id) } : {}),
      ...(ticketPrice !== undefined ? { isPaid: ticketPrice > 0 } : {}),
    },
    include: {
      tickets: { orderBy: { price: 'asc' } },
      _count: { select: { registrations: true } },
    },
  });

  revalidatePath('/events');
  revalidatePath('/events/[slug]', 'page');
  revalidatePath('/admin');
  revalidatePath('/');

  return jsonOk({ event });
});

export const DELETE = route(async (req) => {
  guard(req, 'admin-events', LIMITS.write);
  await requireAdmin();

  const id = new URL(req.url).searchParams.get('id');
  if (!id) throw new ApiError('Which event?', 400);

  await prisma.event.delete({ where: { id } });

  revalidatePath('/events');
  revalidatePath('/events/[slug]', 'page');
  revalidatePath('/admin');
  revalidatePath('/');

  return jsonOk({ deleted: id });
});
