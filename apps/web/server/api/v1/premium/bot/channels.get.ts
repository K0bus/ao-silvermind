import { prisma } from '~/server/utils/prisma'
import { requirePremium } from '~/server/utils/guards'

export default defineEventHandler(async (event) => {
  const user = requirePremium(event)
  const query = getQuery(event)
  const guildId = query.guildId as string

  if (!guildId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Le paramètre guildId est requis.',
    })
  }

  // Verify ownership or access to this guild config (defense-in-depth)
  const existingConfig = await prisma.discordGuildConfig.findFirst({
    where: {
      id: guildId,
      userId: user.id,
    },
  })

  if (!existingConfig) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { discordAccessToken: true },
    })

    let userHasAccess = false
    if (dbUser?.discordAccessToken && !dbUser.discordAccessToken.includes('mock')) {
      try {
        const response = await fetch('https://discord.com/api/users/@me/guilds', {
          headers: { Authorization: `Bearer ${dbUser.discordAccessToken}` },
        })
        if (response.ok) {
          const rawGuilds = await response.json() as any[]
          userHasAccess = rawGuilds.some((g) => g.id === guildId)
        }
      } catch (err) {
        console.warn('[Discord API] Failed to verify user access to guild:', err)
      }
    } else {
      // Fallback for mock environment
      userHasAccess = true
    }

    if (!userHasAccess) {
      throw createError({
        statusCode: 403,
        statusMessage: "Vous n'avez pas accès à ce serveur Discord.",
      })
    }
  }

  const token = process.env.DISCORD_BOT_TOKEN
  const isMockToken = !token || token.includes('mock') || token === 'your_bot_token_here'

  const mockChannels = [
    { id: '123456789012345601', name: 'general' },
    { id: '123456789012345602', name: 'annonces' },
    { id: '123456789012345603', name: 'killboard-zvz' },
    { id: '123456789012345604', name: 'stats-guilde' },
    { id: '123456789012345605', name: 'statut-serveurs' },
    { id: '123456789012345606', name: 'alertes-marche' },
  ]

  if (isMockToken) {
    return { data: mockChannels }
  }

  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: {
        Authorization: `Bot ${token}`,
      },
    })

    if (!response.ok) {
      console.warn(`[Discord API] Fetch channels for ${guildId} returned status ${response.status}. Falling back to mock.`);
      return { data: mockChannels }
    }

    const channels = await response.json() as any[]
    // Filter for text (0) or announcement (5) channels
    const textChannels = channels
      .filter((c) => c.type === 0 || c.type === 5)
      .map((c) => ({
        id: c.id,
        name: c.name,
      }))

    return { data: textChannels }
  } catch (err) {
    console.error(`[Discord API] Failed to fetch channels for guild ${guildId}:`, err)
    return { data: mockChannels }
  }
})
