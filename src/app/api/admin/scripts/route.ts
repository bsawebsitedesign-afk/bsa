import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { route, jsonOk, ApiError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  const session = await requireSession();
  if (session.role !== 'ADMIN') throw new ApiError('Forbidden', 403);

  const script = await prisma.customScript.findUnique({
    where: { id: 'default' },
  });

  return jsonOk({
    script: script ?? {
      id: 'default',
      headerCode: '',
      footerCode: '',
      pageBodyCodes: {},
    },
  });
});

export const PUT = route(async (req) => {
  const session = await requireSession();
  if (session.role !== 'ADMIN') throw new ApiError('Forbidden', 403);

  const body = await req.json();
  const headerCode = typeof body.headerCode === 'string' ? body.headerCode : '';
  const footerCode = typeof body.footerCode === 'string' ? body.footerCode : '';
  const pageBodyCodes = typeof body.pageBodyCodes === 'object' && body.pageBodyCodes !== null ? body.pageBodyCodes : {};

  const updated = await prisma.customScript.upsert({
    where: { id: 'default' },
    update: {
      headerCode,
      footerCode,
      pageBodyCodes,
    },
    create: {
      id: 'default',
      headerCode,
      footerCode,
      pageBodyCodes,
    },
  });

  return jsonOk({ script: updated });
});
