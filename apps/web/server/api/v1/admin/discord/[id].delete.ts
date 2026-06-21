import { requireAdmin } from '~/server/utils/guards'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID requis' })
  }

  const existing = await prisma.discordGuildConfig.findUnique({
    where: { id },
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Configuration introuvable' })
  }

  await prisma.discordGuildConfig.delete({
    where: { id },
  })

  return { success: true }
})
