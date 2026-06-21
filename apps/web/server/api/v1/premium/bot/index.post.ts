import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requirePremium } from '~/server/utils/guards'

const configSchema = z.object({
  id: z.string().min(1), // Discord Guild ID
  name: z.string().min(1),
  icon: z.string().optional().nullable(),
  guildId: z.string().optional().nullable(),
  guildName: z.string().optional().nullable(),
  serverConnection: z.string().default('WEST'),
  
  killboardEnabled: z.boolean().default(false),
  killboardChannelId: z.string().optional().nullable(),
  
  statsEnabled: z.boolean().default(false),
  statsChannelId: z.string().optional().nullable(),
  statsMessageId: z.string().optional().nullable(),
  
  serverStatusEnabled: z.boolean().default(false),
  serverStatusChannelId: z.string().optional().nullable(),
  serverStatusRegion: z.string().default('ALL'),
  serverStatusMessageId: z.string().optional().nullable(),
  
  profitAlertsEnabled: z.boolean().default(false),
  profitAlertsChannelId: z.string().optional().nullable(),
  profitAlertsMinMargin: z.coerce.number().default(10),
  
  dailyEventEnabled: z.boolean().default(false),
  dailyEventChannelId: z.string().optional().nullable(),
  dailyEventText: z.string().optional().nullable(),
  
  profitEmbedEnabled: z.boolean().default(false),
  profitEmbedChannelId: z.string().optional().nullable(),
  profitEmbedMessageId: z.string().optional().nullable(),
  profitEmbedCityId: z.string().optional().nullable(),
  
  itemSearchEnabled: z.boolean().default(true),
  craftingTreeEnabled: z.boolean().default(true),
})

export default defineEventHandler(async (event) => {
  const user = requirePremium(event)
  const body = await readBody(event)
  
  const parsed = configSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Données invalides',
      data: parsed.error.format(),
    })
  }

  const data = parsed.data

  // Verify ownership if already exists
  const existing = await prisma.discordGuildConfig.findUnique({
    where: { id: data.id },
  })

  if (existing && existing.userId !== user.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Ce serveur Discord est déjà configuré par un autre utilisateur.',
    })
  }

  const result = await prisma.discordGuildConfig.upsert({
    where: { id: data.id },
    update: {
      name: data.name,
      icon: data.icon,
      guildId: data.guildId,
      guildName: data.guildName,
      serverConnection: data.serverConnection,
      killboardEnabled: data.killboardEnabled,
      killboardChannelId: data.killboardChannelId,
      statsEnabled: data.statsEnabled,
      statsChannelId: data.statsChannelId,
      statsMessageId: data.statsMessageId,
      serverStatusEnabled: data.serverStatusEnabled,
      serverStatusChannelId: data.serverStatusChannelId,
      serverStatusRegion: data.serverStatusRegion,
      serverStatusMessageId: data.serverStatusMessageId,
      profitAlertsEnabled: data.profitAlertsEnabled,
      profitAlertsChannelId: data.profitAlertsChannelId,
      profitAlertsMinMargin: data.profitAlertsMinMargin,
      dailyEventEnabled: data.dailyEventEnabled,
      dailyEventChannelId: data.dailyEventChannelId,
      dailyEventText: data.dailyEventText,
      profitEmbedEnabled: data.profitEmbedEnabled,
      profitEmbedChannelId: data.profitEmbedChannelId,
      profitEmbedMessageId: data.profitEmbedMessageId,
      profitEmbedCityId: data.profitEmbedCityId,
      itemSearchEnabled: data.itemSearchEnabled,
      craftingTreeEnabled: data.craftingTreeEnabled,
    },
    create: {
      id: data.id,
      userId: user.id,
      name: data.name,
      icon: data.icon,
      guildId: data.guildId,
      guildName: data.guildName,
      serverConnection: data.serverConnection,
      killboardEnabled: data.killboardEnabled,
      killboardChannelId: data.killboardChannelId,
      statsEnabled: data.statsEnabled,
      statsChannelId: data.statsChannelId,
      statsMessageId: data.statsMessageId,
      serverStatusEnabled: data.serverStatusEnabled,
      serverStatusChannelId: data.serverStatusChannelId,
      serverStatusRegion: data.serverStatusRegion,
      serverStatusMessageId: data.serverStatusMessageId,
      profitAlertsEnabled: data.profitAlertsEnabled,
      profitAlertsChannelId: data.profitAlertsChannelId,
      profitAlertsMinMargin: data.profitAlertsMinMargin,
      dailyEventEnabled: data.dailyEventEnabled,
      dailyEventChannelId: data.dailyEventChannelId,
      dailyEventText: data.dailyEventText,
      profitEmbedEnabled: data.profitEmbedEnabled,
      profitEmbedChannelId: data.profitEmbedChannelId,
      profitEmbedMessageId: data.profitEmbedMessageId,
      profitEmbedCityId: data.profitEmbedCityId,
      itemSearchEnabled: data.itemSearchEnabled,
      craftingTreeEnabled: data.craftingTreeEnabled,
    },
  })

  return { data: result }
})
