import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/guards'
import { z } from 'zod'

const buildingSchema = z.object({
  buildingId: z.string(), // FK to CraftingStation
  level: z.number().int().min(1).max(8).optional(),
  slotIndex: z.number().int().optional()
})

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const islandId = getRouterParam(event, 'id')
  
  if (!islandId) throw createError({ statusCode: 400, statusMessage: 'Island ID required' })

  const island = await prisma.island.findUnique({
    where: { id: islandId }
  })

  if (!island || island.userId !== user.id) {
    throw createError({ statusCode: 404, statusMessage: 'Island not found' })
  }

  const body = await readBody(event)
  const result = buildingSchema.safeParse(body)

  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: result.error.message })
  }

  const building = await prisma.islandBuilding.create({
    data: {
      islandId,
      buildingId: result.data.buildingId,
      level: result.data.level ?? 1,
      slotIndex: result.data.slotIndex
    }
  })

  return { data: building }
})
