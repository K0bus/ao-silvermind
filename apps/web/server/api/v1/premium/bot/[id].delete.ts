import { prisma } from '~/server/utils/prisma'
import { requirePremium } from '~/server/utils/guards'

export default defineEventHandler(async (event) => {
  const user = requirePremium(event)
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

  if (existing.userId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Non autorisé' })
  }

  await prisma.discordGuildConfig.delete({
    where: { id },
  })

  return { success: true }
})
