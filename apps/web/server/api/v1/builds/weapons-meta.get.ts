import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  // Fetch up to the last 5000 combats for a large and accurate meta statistical dataset
  const kills = await prisma.pvpKill.findMany({
    orderBy: { timestamp: 'desc' },
    take: 5000,
    select: {
      killerWeapon: true,
      victimWeapon: true,
    }
  })

  const statsMap: Record<string, { wins: number; losses: number }> = {}

  for (const kill of kills) {
    // Wins (killer weapon)
    if (kill.killerWeapon) {
      const cleanKiller = kill.killerWeapon.split('@')[0] // Group different enchantments
      if (!statsMap[cleanKiller]) {
        statsMap[cleanKiller] = { wins: 0, losses: 0 }
      }
      statsMap[cleanKiller].wins++
    }

    // Losses (victim weapon)
    if (kill.victimWeapon) {
      const cleanVictim = kill.victimWeapon.split('@')[0]
      if (!statsMap[cleanVictim]) {
        statsMap[cleanVictim] = { wins: 0, losses: 0 }
      }
      statsMap[cleanVictim].losses++
    }
  }

  // Calculate winrates and total fights
  const weaponsMeta = Object.entries(statsMap)
    .map(([uniqueName, stats]) => {
      const total = stats.wins + stats.losses
      const winrate = total > 0 ? Math.round((stats.wins / total) * 100) : 0
      return {
        uniqueName,
        wins: stats.wins,
        losses: stats.losses,
        total,
        winrate,
      }
    })
    .filter((w) => w.total >= 1) // Only list weapons with at least 1 recorded combat
    .sort((a, b) => b.total - a.total) // Sort by popularity (top used weapons)
    .slice(0, 10) // Limit to top 10

  // Resolve display names and subcategories
  const uniqueNames = weaponsMeta.map((w) => w.uniqueName)
  const items = await prisma.item.findMany({
    where: { uniqueName: { in: uniqueNames } },
    select: {
      uniqueName: true,
      shopSubcategory: true,
      localizations: {
        where: { locale: 'FR-FR' },
        select: { name: true },
        take: 1,
      },
    },
  })

  const itemMap = new Map<string, typeof items[number]>()
  for (const item of items) {
    itemMap.set(item.uniqueName, item)
  }

  const result = weaponsMeta.map((w) => {
    const item = itemMap.get(w.uniqueName)
    return {
      ...w,
      displayName: item?.localizations[0]?.name ?? w.uniqueName,
      family: item?.shopSubcategory ?? null,
    }
  })

  return { data: result }
})
