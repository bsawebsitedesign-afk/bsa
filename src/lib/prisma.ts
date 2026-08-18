import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function getDatabaseUrl() {
  let url = process.env.DATABASE_URL || '';
  if (url && (url.startsWith('postgres://') || url.startsWith('postgresql://'))) {
    if (!url.includes('sslmode=')) {
      const sep = url.includes('?') ? '&' : '?';
      url = `${url}${sep}sslmode=require`;
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
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
