import { prisma } from '~/server/utils/prisma'
import { requirePremium } from '~/server/utils/guards'

export default defineEventHandler(async (event) => {
  const user = requirePremium(event)

  const configs = await prisma.discordGuildConfig.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  return {
    data: configs,
    clientId: process.env.DISCORD_CLIENT_ID || '123456789012345678',
  }
})
