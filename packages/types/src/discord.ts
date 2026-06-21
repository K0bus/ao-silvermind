export interface DiscordGuildConfig {
  id: string
  name: string
  icon?: string | null
  userId: string
  guildId?: string | null
  guildName?: string | null
  serverConnection: string
  killboardEnabled: boolean
  killboardChannelId?: string | null
  statsEnabled: boolean
  statsChannelId?: string | null
  statsMessageId?: string | null
  serverStatusEnabled: boolean
  serverStatusChannelId?: string | null
  serverStatusMessageId?: string | null
  serverStatusRegion: string
  profitAlertsEnabled: boolean
  profitAlertsChannelId?: string | null
  profitAlertsMinMargin: number
  dailyEventEnabled: boolean
  dailyEventChannelId?: string | null
  dailyEventText?: string | null
  profitEmbedEnabled: boolean
  profitEmbedChannelId?: string | null
  profitEmbedMessageId?: string | null
  profitEmbedCityId?: string | null
  itemSearchEnabled: boolean
  craftingTreeEnabled: boolean
  createdAt: string | Date
  updatedAt: string | Date
}

export interface DiscordGuildInfo {
  id: string
  name: string
  icon?: string | null
  permissions?: string
  features?: string[]
  botAdded?: boolean
}
