import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { route, readBody, guard, jsonOk, ApiError } from '@/lib/api';
import { adminPostSchema } from '@/lib/validation';
import { LIMITS } from '@/lib/rate-limit';
import { uniqueSlug } from '@/lib/slug';

export const POST = route(async (req) => {
  guard(req, 'admin-posts', LIMITS.write);
  await requireAdmin();

  const { tags, ...data } = await readBody(req, adminPostSchema);
  const slug = await uniqueSlug('blogPost', data.title);

  const post = await prisma.blogPost.create({
    data: { ...data, slug, tags: JSON.stringify(tags) },
  });

  return jsonOk({ post }, 201);
});

export const PATCH = route(async (req) => {
  guard(req, 'admin-posts', LIMITS.write);
  await requireAdmin();

  const { id, tags, ...fields } = await readBody(req, adminPostSchema.partial().extend({ id: z.string().uuid() }));

  const existing = await prisma.blogPost.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!existing) throw new ApiError('Post not found.', 404);

  const post = await prisma.blogPost.update({
    where: { id },
    data: {
      ...fields,
      ...(tags ? { tags: JSON.stringify(tags) } : {}),
      ...(fields.title && fields.title !== existing.title
        ? { slug: await uniqueSlug('blogPost', fields.title, id) }
        : {}),
    },
  });

  return jsonOk({ post });
});

export const DELETE = route(async (req) => {
  guard(req, 'admin-posts', LIMITS.write);
  await requireAdmin();

  const id = new URL(req.url).searchParams.get('id');
  if (!id) throw new ApiError('Which post?', 400);

  await prisma.blogPost.delete({ where: { id } });
  return jsonOk({ deleted: id });
});
