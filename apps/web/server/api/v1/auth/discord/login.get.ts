import { requirePremium } from '~/server/utils/guards'

export default defineEventHandler(async (event) => {
  // Only authenticated premium users can link their Discord
  const user = requirePremium(event)

  const clientId = process.env.DISCORD_CLIENT_ID || '123456789012345678'
  const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/v1/auth/discord/callback`
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20guilds`

  return sendRedirect(event, discordAuthUrl)
})
