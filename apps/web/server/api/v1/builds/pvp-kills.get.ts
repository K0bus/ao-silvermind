import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'

const querySchema = z.object({
  weaponFamily: z.string().optional(),
  weaponId: z.string().optional(),
  gameplayType: z.enum(['SOLO', 'DUO', 'TRIO', 'SMALL_SCALE', 'ZERG', 'ALL']).default('ALL'),
  limit: z.coerce.number().min(1).max(100).default(50),
})

export default defineEventHandler(async (event) => {
  const result = await getValidatedQuery(event, (q) => querySchema.safeParse(q))
  if (!result.success) {
    throw createError({ statusCode: 422, statusMessage: 'Invalid query parameters' })
  }

  const { weaponFamily, weaponId, gameplayType, limit } = result.data

  let resolvedFamily = weaponFamily ?? null
  if (resolvedFamily === 'cursedstaff') resolvedFamily = 'cursestaff'
  if (resolvedFamily === 'arcane') resolvedFamily = 'arcanestaff'

  const where: any = {}
  if (weaponId) {
    where.killerWeapon = { startsWith: weaponId.split('@')[0] }
  } else if (resolvedFamily) {
    where.killerWeaponFamily = resolvedFamily
  }

  if (gameplayType && gameplayType !== 'ALL') {
    where.gameplayType = gameplayType
  }

  // Fetch from our local PostgreSQL PvpKill database table
  const kills = await prisma.pvpKill.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit,
  })

  // Format local db records into the standard KillEvent structure for frontend component reusability
  const formattedKills = kills.map((k) => ({
    EventId: k.eventId,
    TimeStamp: k.timestamp.toISOString(),
    Location: k.location,
    TotalVictimKillFame: k.totalVictimKillFame,
    groupMemberCount: k.groupMemberCount,
    numberOfParticipants: k.numberOfParticipants,
    Killer: {
      Id: k.killerId,
      Name: k.killerName,
      GuildName: k.killerGuildName,
      AllianceName: k.killerAllianceName,
      AverageItemPower: k.killerIp,
      Equipment: k.killerEquipment || {},
    },
    Victim: {
      Id: k.victimId,
      Name: k.victimName,
      GuildName: k.victimGuildName,
      AllianceName: k.victimAllianceName,
      AverageItemPower: k.victimIp,
      Equipment: k.victimEquipment || {},
    },
  }))

  return { data: formattedKills }
})
