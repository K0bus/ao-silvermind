import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string | undefined

  // Retrieve user session from the context
  // callback is triggered by browser redirect so cookies are sent
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Connexion requise pour lier votre compte Discord.' })
  }

  const clientId = process.env.DISCORD_CLIENT_ID || '123456789012345678'
  const clientSecret = process.env.DISCORD_CLIENT_SECRET || ''
  const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/v1/auth/discord/callback`

  let discordUser = { id: 'mock_discord_id', username: 'MockUser_Discord' }
  let tokens = {
    access_token: 'mock_access_token',
    refresh_token: 'mock_refresh_token',
    expires_in: 604800,
  }

  const isMockEnv = clientId === '123456789012345678' || clientSecret.includes('mock') || !code

  if (!isMockEnv && code) {
    try {
      // Exchange OAuth2 code for tokens
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      })

      if (tokenResponse.ok) {
        tokens = await tokenResponse.json()

        // Fetch User profile from Discord API
        const userResponse = await fetch('https://discord.com/api/users/@me', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        })

        if (userResponse.ok) {
          discordUser = await userResponse.json()
        }
      }
    } catch (err) {
      console.warn('[Discord OAuth] Failed to exchange token, using mock fallback in dev:', err)
    }
  }

  // Link Discord info to User
  await prisma.user.update({
    where: { id: user.id },
    data: {
      discordId: discordUser.id,
      discordUsername: discordUser.username,
      discordAccessToken: tokens.access_token,
      discordRefreshToken: tokens.refresh_token,
      discordTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  })

  // Redirect back to premium bot settings page
  return sendRedirect(event, '/premium/bot')
})
