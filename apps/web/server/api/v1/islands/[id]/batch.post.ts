import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/guards'
import { z } from 'zod'

const batchSchema = z.object({
  action: z.enum(['harvest-all', 'replant-all', 'plant-crop']),
  buildingId: z.string().optional(),
  itemId: z.string().optional(),
  isFocusUsed: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const islandId = getRouterParam(event, 'id')

  if (!islandId) throw createError({ statusCode: 400, statusMessage: 'Island ID required' })

  const island = await prisma.island.findUnique({
    where: { id: islandId },
    include: { buildings: true }
  })

  if (!island || island.userId !== user.id) {
    throw createError({ statusCode: 404, statusMessage: 'Island not found' })
  }

  const body = await readBody(event)
  const validation = batchSchema.safeParse(body)

  if (!validation.success) {
    throw createError({ statusCode: 400, statusMessage: validation.error.message })
  }

  const { action, buildingId, itemId, isFocusUsed } = validation.data
  const buildingIds = island.buildings.map(b => b.id)

  if (action === 'harvest-all') {
    // Delete all resources since the UI treats harvesting as deleting resource entries,
    // or we can just delete resources that are fully grown (>22 hours elapsed)
    await prisma.buildingResource.deleteMany({
      where: {
        buildingId: { in: buildingIds }
      }
    })
    return { success: true, message: 'All crops harvested.' }
  }

  if (action === 'replant-all') {
    // For replant-all, we find existing crops, reset their plantedAt to now, and apply focus
    await prisma.buildingResource.updateMany({
      where: {
        buildingId: { in: buildingIds }
      },
      data: {
        plantedAt: new Date(),
        isFocusUsed: isFocusUsed ?? false
      }
    })
    return { success: true, message: 'All crops replanted.' }
  }

  if (action === 'plant-crop') {
    if (!buildingId || !itemId) {
      throw createError({ statusCode: 400, statusMessage: 'buildingId and itemId required for plant-crop' })
    }

    if (!buildingIds.includes(buildingId)) {
      throw createError({ statusCode: 403, statusMessage: 'Building does not belong to this island' })
    }

    // First delete existing resources in this building to clear the slots
    await prisma.buildingResource.deleteMany({
      where: { buildingId }
    })

    // Plant 9 slots
    const resourcesData = Array.from({ length: 9 }).map(() => ({
      buildingId,
      itemId,
      count: 1, // 1 seed per slot, making 9 total seeds
      plantedAt: new Date(),
      isFocusUsed: isFocusUsed ?? false
    }))

    await prisma.buildingResource.createMany({
      data: resourcesData
    })

    return { success: true, message: 'Planted 9 slots successfully.' }
  }

  return { success: false }
})
