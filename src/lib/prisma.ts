import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function getDatabaseUrl() {
  let url = process.env.DATABASE_URL || '';
  if (url && (url.startsWith('postgres://') || url.startsWith('postgresql://'))) {
    const sep = url.includes('?') ? '&' : '?';
    if (url.includes(':6543') && !url.includes('pgbouncer=')) {
      url = `${url}${sep}pgbouncer=true`;
    }
    if (!url.includes('connection_limit=')) {
      const currentSep = url.includes('?') ? '&' : '?';
      url = `${url}${currentSep}connection_limit=1`;
    }
    if (!url.includes('sslmode=')) {
      const currentSep = url.includes('?') ? '&' : '?';
      url = `${url}${currentSep}sslmode=require`;
    }
  }
  return url;
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
