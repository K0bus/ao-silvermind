import { prisma } from './index'

/**
 * Normalizes and saves a batch of PvP Kill Events from the Albion Online API.
 * Uses a single batch database query to resolve weapon families, and filters
 * out already saved events to optimize performance.
 */
export async function saveKillEvents(events: any[]) {
  if (!events || events.length === 0) return

  // 1. Gather Event IDs and filter out already saved kills
  const eventIds = events.map(e => e.EventId)
  const existingKills = await prisma.pvpKill.findMany({
    where: { eventId: { in: eventIds } },
    select: { eventId: true }
  })
  const existingIds = new Set(existingKills.map(k => k.eventId))
  const newEvents = events.filter(e => !existingIds.has(e.EventId))

  if (newEvents.length === 0) return

  // 2. Collect unique weapon IDs from the killer's MainHand
  const weaponIds = new Set<string>()
  for (const event of newEvents) {
    const mainHand = event.Killer?.Equipment?.MainHand?.Type
    if (mainHand) {
      weaponIds.add(mainHand)
      // Also add the base version without enchantment (e.g. T8_2H_POLEHAMMER from T8_2H_POLEHAMMER@1)
      weaponIds.add(mainHand.split('@')[0])
    }
  }

  // 3. Query the weapon families (shopSubcategory) in one batch query
  const items = await prisma.item.findMany({
    where: { uniqueName: { in: Array.from(weaponIds) } },
    select: { uniqueName: true, shopSubcategory: true }
  })

  // Map from uniqueName (and base uniqueName) to its family
  const weaponFamilyMap = new Map<string, string>()
  for (const item of items) {
    if (item.shopSubcategory) {
      weaponFamilyMap.set(item.uniqueName, item.shopSubcategory)
    }
  }

  // 4. Save each event to the database
  for (const event of newEvents) {
    try {
      const killerWeapon = event.Killer?.Equipment?.MainHand?.Type ?? null
      let killerWeaponFamily: string | null = null
      if (killerWeapon) {
        killerWeaponFamily = weaponFamilyMap.get(killerWeapon) ?? weaponFamilyMap.get(killerWeapon.split('@')[0]) ?? null
      }

      // Classify the gameplay size/type based on assists
      const assistsCount = event.Assists?.length ?? 0
      let gameplayType = 'SOLO'
      if (assistsCount === 1) gameplayType = 'DUO'
      else if (assistsCount === 2) gameplayType = 'TRIO'
      else if (assistsCount >= 3 && assistsCount <= 9) gameplayType = 'SMALL_SCALE'
      else if (assistsCount >= 10) gameplayType = 'ZERG'

      await prisma.pvpKill.create({
        data: {
          eventId: event.EventId,
          timestamp: new Date(event.TimeStamp),
          location: event.Location ?? null,
          totalVictimKillFame: event.TotalVictimKillFame,
          groupMemberCount: event.groupMemberCount ?? 1,
          numberOfParticipants: event.numberOfParticipants ?? 1,
          gameplayType,
          killerId: event.Killer.Id,
          killerName: event.Killer.Name,
          killerGuildName: event.Killer.GuildName ?? null,
          killerAllianceName: event.Killer.AllianceName ?? null,
          killerIp: event.Killer.AverageItemPower ?? 0,
          killerWeapon,
          killerWeaponFamily,
          killerEquipment: event.Killer.Equipment as any,
          victimId: event.Victim.Id,
          victimName: event.Victim.Name,
          victimGuildName: event.Victim.GuildName ?? null,
          victimAllianceName: event.Victim.AllianceName ?? null,
          victimIp: event.Victim.AverageItemPower ?? 0,
          victimWeapon: event.Victim.Equipment?.MainHand?.Type ?? null,
          victimEquipment: event.Victim.Equipment as any,
        }
      })
    } catch (err) {
      console.error(`Error saving PvP event ${event.EventId}:`, err)
    }
  }
}
