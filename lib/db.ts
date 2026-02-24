import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL?.replace(
        /connection_limit=\d+/,
        'connection_limit=5'
      ).replace(
        /pool_timeout=\d+/,
        'pool_timeout=30'
      ).replace(
        /connect_timeout=\d+/,
        'connect_timeout=10'
      ),
    },
  },
})

// Cache in ALL environments to prevent connection pool exhaustion
globalForPrisma.prisma = prisma
