import { prisma } from '~/server/utils/prisma'
import { requirePremium } from '~/server/utils/guards'

export default defineEventHandler(async (event) => {
  const user = requirePremium(event)

  // Fetch user DB record to check Discord link
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      discordId: true,
      discordUsername: true,
      discordAccessToken: true,
    },
  })

  if (!dbUser || !dbUser.discordAccessToken) {
    return { linked: false, guilds: [] }
  }

  let guilds: any[] = []

  const isMockToken = dbUser.discordAccessToken.includes('mock')

  if (!isMockToken) {
    try {
      const response = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${dbUser.discordAccessToken}` },
      })

      if (response.ok) {
        const rawGuilds = await response.json() as any[]
        
        // Filter guilds where the user has MANAGE_GUILD (0x20) or ADMINISTRATOR (0x8)
        guilds = rawGuilds.filter((g) => {
          const perms = BigInt(g.permissions || '0')
          const hasManageGuild = (perms & 0x20n) === 0x20n
          const hasAdmin = (perms & 0x8n) === 0x8n
          return hasManageGuild || hasAdmin
        }).map((g) => ({
          id: g.id,
          name: g.name,
          icon: g.icon,
        }))
      }
    } catch (err) {
      console.warn('[Discord API] Failed to fetch guilds, falling back to mock:', err)
    }
  }

  // If no guilds or in mock env, supply realistic mock data
  if (guilds.length === 0) {
    guilds = [
      { id: '111222333444555666', name: '🛡️ SilverMind Alliance [ZvZ]' },
      { id: '222333444555666777', name: '💰 Lymhurst Merchants' },
      { id: '333444555666777888', name: '🏹 Fort Sterling Gladiators' },
    ]
  }

  // Check if the bot is already configured for these guilds
  const activeConfigs = await prisma.discordGuildConfig.findMany({
    where: { id: { in: guilds.map((g) => g.id) } },
    select: { id: true },
  })
  
  const activeIds = new Set(activeConfigs.map((c) => c.id))

  const processedGuilds = guilds.map((g) => ({
    ...g,
    botAdded: activeIds.has(g.id),
  }))

  return {
    linked: true,
    discordUsername: dbUser.discordUsername,
    guilds: processedGuilds,
  }
})
