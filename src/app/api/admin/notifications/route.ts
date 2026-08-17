import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { route, readBody, guard, jsonOk, ApiError } from '@/lib/api';
import { LIMITS } from '@/lib/rate-limit';

const notificationSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(120),
  message: z.string().min(3, 'Message must be at least 3 characters').max(500),
  type: z.enum(['INFO', 'ALERT', 'SUMMIT', 'ADVISORY', 'UPDATE']).default('INFO'),
  linkUrl: z.string().max(200).optional().nullable(),
  linkText: z.string().max(60).optional().nullable(),
  targetRole: z.enum(['ALL', 'MEMBER', 'PUBLIC']).default('ALL'),
  isPinned: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const GET = route(async (req) => {
  guard(req, 'admin-notifications-read', LIMITS.adminApi);
  await requireAdmin();

  const notifications = await prisma.siteNotification.findMany({
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    include: {
      createdBy: {
        select: {
          email: true,
          profile: { select: { fullName: true } },
        },
      },
    },
  });

  return jsonOk({ data: notifications });
});

export const POST = route(async (req) => {
  guard(req, 'admin-notifications-create', LIMITS.write);
  const session = await requireAdmin();

  const data = await readBody(req, notificationSchema);

  const notification = await prisma.siteNotification.create({
    data: {
      title: data.title,
      message: data.message,
      type: data.type,
      linkUrl: data.linkUrl || null,
      linkText: data.linkText || null,
      targetRole: data.targetRole,
      isPinned: data.isPinned,
      isActive: data.isActive,
      createdById: session.userId,
    },
  });

  return jsonOk({ data: notification }, 201);
});

export const DELETE = route(async (req) => {
  guard(req, 'admin-notifications-delete', LIMITS.write);
  await requireAdmin();

  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  if (!id) {
    throw new ApiError('Notification ID is required', 400);
  }

  await prisma.siteNotification.delete({
    where: { id },
  });

  return jsonOk({ deleted: true, id });
});
