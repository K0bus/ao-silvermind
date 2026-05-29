import prismaClient from '@prisma/client'
import type { PrismaClient as PrismaClientInstance } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const {
  PrismaClient,
  Prisma: PrismaRuntime,
  PriceConfidence: PriceConfidenceValues,
} = prismaClient as any

function createPrismaClient() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

/** True when the client matches the generated schema. */
function prismaClientHasExpectedDelegates(client: PrismaClientInstance): boolean {
  const c = client as any
  return typeof c.build?.findUnique === 'function' && 
         typeof c.craftingStation?.findUnique === 'function' &&
         typeof c.item?.findUnique === 'function' &&
         typeof c.lootTable?.findUnique === 'function' &&
         typeof c.pvpKill?.findUnique === 'function' &&
         typeof c.guide?.findUnique === 'function' &&
         typeof c.guideCategory?.findUnique === 'function' &&
         typeof c.discordGuildConfig?.findUnique === 'function'
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClientInstance }

function getPrisma(): PrismaClientInstance {
  const cached = globalForPrisma.prisma
  // Dev HMR / prisma generate without restart can leave a stale singleton without newer delegates.
  if (process.env.NODE_ENV !== 'production' && cached && !prismaClientHasExpectedDelegates(cached)) {
    globalForPrisma.prisma = undefined
  }

  const client = globalForPrisma.prisma ?? createPrismaClient()

  if (!prismaClientHasExpectedDelegates(client)) {
    throw new Error(
      'Prisma Client is out of date (missing generated models). Run `pnpm db:generate` from the repo root, then restart the dev server.',
    )
  }

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client
  }

  return client
}

export const prisma = getPrisma()

export { PrismaRuntime, PriceConfidenceValues }
export type * from '@prisma/client'
export type { Prisma, PrismaClient, PriceConfidence } from '@prisma/client'
export {
  DEFAULT_LOCATIONS,
  DEFAULT_RETURN_RATES,
  DEFAULT_SYSTEM_CONFIGS,
  ensureBootstrapData,
} from './bootstrap-data'
export { saveKillEvents } from './pvp'
