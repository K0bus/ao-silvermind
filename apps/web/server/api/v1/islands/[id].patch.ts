import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/guards'
import { z } from 'zod'

const updateIslandSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  level: z.number().int().min(1).max(6).optional(),
  type: z.enum(['PERSONAL', 'GUILD']).optional(),
  isPremium: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')

  if (!id) throw createError({ statusCode: 400, statusMessage: 'Island ID required' })

  const island = await prisma.island.findUnique({
    where: { id }
  })

  if (!island || island.userId !== user.id) {
    throw createError({ statusCode: 404, statusMessage: 'Island not found' })
  }

  const body = await readBody(event)
  const validation = updateIslandSchema.safeParse(body)

  if (!validation.success) {
    throw createError({ statusCode: 400, statusMessage: validation.error.message })
  }

  const updatedIsland = await prisma.island.update({
    where: { id },
    data: validation.data
  })

  return { data: updatedIsland }
})
