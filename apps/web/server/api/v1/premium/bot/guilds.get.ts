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
  const isProd = process.env.NODE_ENV === 'production'

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
      } else {
        if (response.status === 401) {
          throw createError({ statusCode: 401, statusMessage: 'Session Discord expirée. Veuillez vous reconnecter.' })
        }
        console.warn(`[Discord API] Guilds fetch returned status ${response.status}.`)
      }
    } catch (err: any) {
      if (err.statusCode === 401) throw err
      console.warn('[Discord API] Failed to fetch guilds:', err)
    }
  }

  // If no guilds or in mock env, supply realistic mock data ONLY if in dev and using a mock token
  if (guilds.length === 0 && isMockToken && !isProd) {
    guilds = [
      { id: '111222333444555666', name: '🛡️ SilverMind Alliance [ZvZ]' },
      { id: '222333444555666777', name: '💰 Lymhurst Merchants' },
      { id: '333444555666777888', name: '🏹 Fort Sterling Gladiators' },
    ]
  }

  // Determine if the Bot is physically installed/joined on these guilds
  const botToken = process.env.DISCORD_BOT_TOKEN
  const isMockBotToken = !botToken || botToken.includes('mock') || botToken === 'your_bot_token_here'

  const botGuildIds = new Set<string>()

  if (!isMockBotToken) {
    try {
      const botResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: { Authorization: `Bot ${botToken}` },
      })
      if (botResponse.ok) {
        const botRawGuilds = await botResponse.json() as any[]
        botRawGuilds.forEach((bg) => botGuildIds.add(bg.id))
      } else {
        console.warn(`[Discord API] Bot guilds fetch returned status ${botResponse.status}.`)
      }
    } catch (err) {
      console.error('[Discord API] Failed to fetch bot guilds membership list:', err)
    }
  }

  // In mock environment or as a fallback, assume bot is joined in these specific mock servers ONLY if in dev and using a mock token
  if (botGuildIds.size === 0 && isMockBotToken && !isProd) {
    botGuildIds.add('111222333444555666')
    botGuildIds.add('222333444555666777')
  }

  const processedGuilds = guilds.map((g) => ({
    ...g,
    botAdded: botGuildIds.has(g.id),
  }))

  return {
    linked: true,
    discordUsername: dbUser.discordUsername,
    guilds: processedGuilds,
  }
})
