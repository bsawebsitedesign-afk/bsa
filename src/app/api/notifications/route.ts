import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const notifications = await prisma.siteNotification.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        linkUrl: true,
        linkText: true,
        isPinned: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, data: notifications });
  } catch (error) {
    console.error('Error fetching public notifications:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch notifications' }, { status: 500 });
  }
}
