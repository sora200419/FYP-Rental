import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    log: ['query'],
  });
}

// In development, avoid keeping a schema-stale PrismaClient instance alive in
// globalThis across hot reloads after `prisma generate` or migrations.
export const prisma =
  process.env.NODE_ENV === 'production'
    ? globalForPrisma.prisma ?? createPrismaClient()
    : createPrismaClient();

if (process.env.NODE_ENV === 'production') globalForPrisma.prisma = prisma;
