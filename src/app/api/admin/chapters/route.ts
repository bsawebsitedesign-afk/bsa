import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { route, readBody, guard, jsonOk, ApiError } from '@/lib/api';
import { LIMITS } from '@/lib/rate-limit';
import { uniqueSlug } from '@/lib/slug';
import { lookupCityGeo } from '@/lib/geo';
import { patchable } from '@/lib/validation';

const chapterSchema = z.object({
  name: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  country: z.string().min(2).max(100).default('United States'),
  region: z.string().min(2).max(100),
  description: z.string().min(5).max(1000),
  imageUrl: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  emoji: z.string().default('⬡'),
  accent: z.string().default('violet'),
  meetingCadence: z.string().default('Quarterly'),
  linkedinUrl: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const POST = route(async (req) => {
  guard(req, 'admin-chapters', LIMITS.write);
  await requireAdmin();

  const data = await readBody(req, chapterSchema);
  const slug = await uniqueSlug('chapter', data.name);

  // Auto-geocode city if coordinates are not explicitly passed
  let lat = data.latitude;
  let lng = data.longitude;
  let country = data.country;

  if (lat === undefined || lat === null || lng === undefined || lng === null) {
    const geo = lookupCityGeo(data.city);
    lat = geo.lat;
    lng = geo.lng;
    if (!data.country || data.country === 'United States') {
      country = geo.country;
    }
  }

  const chapter = await prisma.chapter.create({
    data: {
      name: data.name,
      slug,
      city: data.city,
      country,
      region: data.region,
      description: data.description,
      imageUrl: data.imageUrl ?? null,
      latitude: lat,
      longitude: lng,
      emoji: data.emoji || '⬡',
      accent: data.accent || 'violet',
      meetingCadence: data.meetingCadence || 'Quarterly',
      linkedinUrl: data.linkedinUrl ?? null,
      contactEmail: data.contactEmail ?? null,
      isActive: data.isActive,
    },
  });

  revalidatePath('/chapters');
  revalidatePath('/chapters/[slug]', 'page');
  revalidatePath('/admin');
  revalidatePath('/');

  return jsonOk({ chapter }, 201);
});

export const PATCH = route(async (req) => {
  guard(req, 'admin-chapters', LIMITS.write);
  await requireAdmin();

  const patchSchema = patchable(chapterSchema).extend({ id: z.string().uuid() });
  const data = await readBody(req, patchSchema);
  const { id, ...fields } = data;

  const existing = await prisma.chapter.findUnique({ where: { id }, select: { id: true, name: true, city: true } });
  if (!existing) throw new ApiError('Chapter not found.', 404);

  let lat = fields.latitude;
  let lng = fields.longitude;

  if (fields.city && (lat === undefined || lng === undefined)) {
    const geo = lookupCityGeo(fields.city);
    lat = geo.lat;
    lng = geo.lng;
  }

  const chapter = await prisma.chapter.update({
    where: { id },
    data: {
      ...fields,
      ...(fields.name && fields.name !== existing.name ? { slug: await uniqueSlug('chapter', fields.name, id) } : {}),
      ...(lat !== undefined ? { latitude: lat } : {}),
      ...(lng !== undefined ? { longitude: lng } : {}),
    },
  });

  revalidatePath('/chapters');
  revalidatePath('/chapters/[slug]', 'page');
  revalidatePath('/admin');
  revalidatePath('/');

  return jsonOk({ chapter });
});

export const DELETE = route(async (req) => {
  guard(req, 'admin-chapters', LIMITS.write);
  await requireAdmin();

  const id = new URL(req.url).searchParams.get('id');
  if (!id) throw new ApiError('Which chapter?', 400);

  await prisma.chapter.delete({ where: { id } });

  revalidatePath('/chapters');
  revalidatePath('/chapters/[slug]', 'page');
  revalidatePath('/admin');
  revalidatePath('/');

  return jsonOk({ deleted: id });
});
