import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'

const querySchema = z.object({
  weaponFamily: z.string().optional(),
  weaponId: z.string().optional(),
  gameplayType: z.enum(['SOLO', 'DUO', 'TRIO', 'SMALL_SCALE', 'ZERG', 'ALL']).default('ALL'),
})

export default defineEventHandler(async (event) => {
  const result = await getValidatedQuery(event, (q) => querySchema.safeParse(q))
  if (!result.success) {
    throw createError({ statusCode: 422, statusMessage: 'Invalid query parameters' })
  }

  const { weaponFamily, weaponId, gameplayType } = result.data

  // Defensive normalization: Map old/cached taxonomy keys to their correct database strings
  let resolvedFamily = weaponFamily ?? null
  if (resolvedFamily === 'cursedstaff') {
    resolvedFamily = 'cursestaff'
  } else if (resolvedFamily === 'arcane') {
    resolvedFamily = 'arcanestaff'
  }

  if (!resolvedFamily && !weaponId) {
    return {
      totalKills: 0,
      isFallbackToFamily: false,
      resolvedFamily: null,
      slots: {
        Head: [], Armor: [], Shoes: [], OffHand: [], Cape: [], Potion: [], Food: [], Mount: []
      }
    }
  }

  // 1. Build the database query filters
  const where: any = {}
  let baseWeaponId: string | null = null

  if (weaponId) {
    baseWeaponId = weaponId.split('@')[0]
    where.killerWeapon = { startsWith: baseWeaponId }
  } else if (resolvedFamily) {
    where.killerWeaponFamily = resolvedFamily
  }

  if (gameplayType && gameplayType !== 'ALL') {
    where.gameplayType = gameplayType
  }

  // 2. Fetch kills from DB
  let kills = await prisma.pvpKill.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: 2000,
    select: {
      killerEquipment: true,
    },
  })

  // 3. Dynamic On-the-fly Ingestion if DB has no matching kills
  if (kills.length === 0) {
    console.log('[pvp-stats-api] No kills in DB. Fetching on-the-fly from Albion API...')
    try {
      const response = await fetch('https://gameinfo-ams.albiononline.com/api/gameinfo/events?limit=50&offset=0')
      if (response.ok) {
        const events = await response.json() as any[]
        const { saveKillEvents } = await import('@albion-tool/database')
        await saveKillEvents(events)

        // Query again after saving
        kills = await prisma.pvpKill.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: 2000,
          select: {
            killerEquipment: true,
          },
        })
      }
    } catch (err) {
      console.error('[pvp-stats-api] On-the-fly sync failed:', err)
    }
  }

  // 4. Intelligent Fallback: if weaponId has 0 kills, fallback to weapon family
  let isFallbackToFamily = false

  if (kills.length === 0 && weaponId) {
    const item = await prisma.item.findUnique({
      where: { id: baseWeaponId! },
      select: { shopSubcategory: true }
    })

    if (item?.shopSubcategory) {
      resolvedFamily = item.shopSubcategory
      isFallbackToFamily = true

      const fallbackWhere: any = {
        killerWeaponFamily: resolvedFamily
      }
      if (gameplayType && gameplayType !== 'ALL') {
        fallbackWhere.gameplayType = gameplayType
      }

      kills = await prisma.pvpKill.findMany({
        where: fallbackWhere,
        orderBy: { timestamp: 'desc' },
        take: 2000,
        select: {
          killerEquipment: true,
        },
      })
    }
  }

  const totalKills = kills.length

  // 5. Define the slots we want to aggregate
  const slots = ['Head', 'Armor', 'Shoes', 'OffHand', 'Cape', 'Potion', 'Food', 'Mount']
  const slotCounts: Record<string, Record<string, number>> = {}
  for (const slot of slots) {
    slotCounts[slot] = {}
  }

  // 6. Group and count in memory
  for (const kill of kills) {
    const eq = kill.killerEquipment as any
    if (!eq) continue

    for (const slot of slots) {
      const item = eq[slot]
      if (!item || !item.Type) continue

      let cleanId = item.Type.split('@')[0]

      if (['Head', 'Armor', 'Shoes', 'Cape'].includes(slot)) {
        cleanId = cleanId.replace(/^T\d_/, 'T4_')
      }

      slotCounts[slot][cleanId] = (slotCounts[slot][cleanId] || 0) + 1
    }
  }

  // 7. Gather all unique top item IDs to fetch localized names in one query
  const topItemIds: string[] = []
  const topBySlot: Record<string, { uniqueName: string; count: number }[]> = {}

  for (const slot of slots) {
    const sorted = Object.entries(slotCounts[slot])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([uniqueName, count]) => ({ uniqueName, count }))

    topBySlot[slot] = sorted
    for (const item of sorted) {
      topItemIds.push(item.uniqueName)
    }
  }

  // 8. Query localized names in French
  const items = await prisma.item.findMany({
    where: { uniqueName: { in: topItemIds } },
    select: {
      uniqueName: true,
      localizations: {
        where: { locale: 'FR-FR' },
        select: { name: true },
        take: 1,
      },
    },
  })

  const nameMap: Record<string, string> = {}
  for (const item of items) {
    nameMap[item.uniqueName] = item.localizations[0]?.name ?? item.uniqueName
  }

  // 9. Format final output
  const resultSlots: Record<string, any[]> = {}
  for (const slot of slots) {
    resultSlots[slot] = topBySlot[slot].map((item) => ({
      uniqueName: item.uniqueName,
      displayName: nameMap[item.uniqueName] ?? item.uniqueName,
      count: item.count,
      percentage: totalKills > 0 ? Math.round((item.count / totalKills) * 100) : 0,
    }))
  }

  return {
    totalKills,
    isFallbackToFamily,
    resolvedFamily,
    slots: resultSlots,
  }
})
