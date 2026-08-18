import { PrismaClient } from '@prisma/client';
import path from 'path';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function getDatabaseUrl() {
  let envUrl = process.env.DATABASE_URL;
  if (envUrl && (envUrl.startsWith('postgres://') || envUrl.startsWith('postgresql://'))) {
    if (!envUrl.includes('sslmode=')) {
      const separator = envUrl.includes('?') ? '&' : '?';
      envUrl = `${envUrl}${separator}sslmode=require`;
    }
    return envUrl;
  }
  if (!envUrl || envUrl === 'file:./dev.db' || envUrl === 'file:./prisma/dev.db' || envUrl.startsWith('file:.')) {
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    return `file:${dbPath}`;
  }
  return envUrl;
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
