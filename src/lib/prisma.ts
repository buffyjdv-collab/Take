import { PrismaClient } from '@prisma/client'

// Prisma doesn't support channel_binding param — strip it from DATABASE_URL
function sanitizeDatabaseUrl(url: string): string {
  try {
    const u = new URL(url)
    u.searchParams.delete('channel_binding')
    return u.toString()
  } catch {
    return url
  }
}

const databaseUrl = sanitizeDatabaseUrl(process.env.DATABASE_URL || '')

// Singleton Prisma client (avoids exhausting connections in dev)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
