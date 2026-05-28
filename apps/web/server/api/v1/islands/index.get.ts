import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/guards'
import { islandEngine } from '@albion-tool/market-engine'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  
  const islands = await prisma.island.findMany({
    where: { userId: user.id },
    include: {
      location: true,
      _count: { select: { buildings: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
  
  const enrichedIslands = await Promise.all(islands.map(async (island) => {
    const profitability = await islandEngine.calculateIslandProfitability(island.id)
    return {
      ...island,
      profitability
    }
  }))
  
  return { data: enrichedIslands }
})
