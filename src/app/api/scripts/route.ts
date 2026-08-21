import { prisma } from '@/lib/prisma';
import { jsonOk } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const script = await prisma.customScript.findUnique({
      where: { id: 'default' },
    });

    return jsonOk({
      headerCode: script?.headerCode ?? '',
      footerCode: script?.footerCode ?? '',
      pageBodyCodes: (script?.pageBodyCodes as Record<string, string>) ?? {},
    });
  } catch {
    return jsonOk({
      headerCode: '',
      footerCode: '',
      pageBodyCodes: {},
    });
  }
}
