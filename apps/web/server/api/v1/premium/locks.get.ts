import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async () => {
  const locks = await prisma.systemConfig.findMany({
    where: {
      key: {
        in: [
          'premium_lock_items_profit',
          'premium_lock_crafting',
          'premium_lock_items_flip',
          'premium_lock_market',
          'premium_lock_islands',
        ],
      },
    },
  })

  const results: Record<string, boolean> = {
    items_profit: false,
    crafting: false,
    items_flip: false,
    market: false,
    islands: false,
  }

  locks.forEach((l) => {
    const key = l.key.replace('premium_lock_', '')
    results[key] = !!l.value
  })

  return { data: results }
})
