import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/guards'
import { islandEngine } from '@albion-tool/market-engine'

const TAX_RATE = 0.04

function getAverageAmount(amountStr: string | null | undefined): number {
  if (!amountStr) return 1
  if (amountStr.includes('-')) {
    const parts = amountStr.split('-')
    const min = parseFloat(parts[0]!)
    const max = parseFloat(parts[1]!)
    return (min + max) / 2
  }
  return parseFloat(amountStr) || 1
}

function getSeedReturnRate(itemId: string, tier: number, isFocusUsed: boolean, baseChance: number | null): number {
  const base = baseChance ?? 0.60
  if (!isFocusUsed) return base

  if (itemId.includes('MOUNT') || itemId.includes('FOAL') || itemId.includes('PUP') || base < 0.20) {
    return base * 2
  }

  switch (tier) {
    case 2: return 2.00
    case 3: return 1.20
    case 4: return 1.04
    case 5: return 0.96
    case 6: return 0.9111
    case 7: return 0.8689
    case 8: return 0.8444
    default: return base * 1.5
  }
}

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')
  
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID required' })

  const island = await prisma.island.findUnique({
    where: { id },
    include: {
      buildings: {
        include: {
          building: {
            include: {
              localizations: {
                where: { locale: 'FR-FR' },
                take: 1
              }
            }
          },
          resources: {
            include: {
              item: {
                include: {
                  harvestLootTable: {
                    include: {
                      items: {
                        include: {
                          item: {
                            include: {
                              localizations: { where: { locale: 'FR-FR' }, take: 1 }
                            }
                          }
                        }
                      }
                    }
                  },
                  productLootTable: {
                    include: {
                      items: {
                        include: {
                          item: {
                            include: {
                              localizations: { where: { locale: 'FR-FR' }, take: 1 }
                            }
                          }
                        }
                      }
                    }
                  },
                  localizations: { where: { locale: 'FR-FR' }, take: 1 }
                }
              }
            }
          },
          laborers: true
        }
      },
      location: true
    }
  })

  if (!island || island.userId !== user.id) {
    throw createError({ statusCode: 404, statusMessage: 'Island not found' })
  }

  // Load product loot tables for grown animals since grownItemUniqueName is just a string
  const grownItemNames = island.buildings
    .flatMap(b => b.resources)
    .map(r => r.item?.grownItemUniqueName)
    .filter((name): name is string => typeof name === 'string')

  const grownItems = grownItemNames.length > 0
    ? await prisma.item.findMany({
        where: { uniqueName: { in: grownItemNames } },
        include: {
          productLootTable: {
            include: {
              items: {
                include: {
                  item: {
                    include: {
                      localizations: { where: { locale: 'FR-FR' }, take: 1 }
                    }
                  }
                }
              }
            }
          },
          localizations: { where: { locale: 'FR-FR' }, take: 1 }
        }
      })
    : []

  const grownItemsMap = new Map(grownItems.map(item => [item.uniqueName, item]))

  // 1. Pre-calculate raw expected harvests for all buildings to collect result item IDs
  const buildingsWithRawHarvests = island.buildings.map(b => {
    const harvestsMap = new Map<string, { itemId: string, itemName: string, expectedQty: number, isSeed: boolean }>()
    const isPremium = island.isPremium

    for (const res of b.resources) {
      if (!res.item) continue

      // A. Primary Harvest Yields
      if (res.item.harvestLootTable) {
        for (const drop of res.item.harvestLootTable.items) {
          if (!drop.itemUniqueName) continue
          const dropItemName = drop.item?.localizations[0]?.name ?? drop.itemUniqueName
          const avgAmt = getAverageAmount(drop.amount)
          const qty = avgAmt * drop.chance * res.count * (isPremium ? 2.0 : 1.0)

          const existing = harvestsMap.get(drop.itemUniqueName)
          if (existing) {
            existing.expectedQty += qty
          } else {
            harvestsMap.set(drop.itemUniqueName, {
              itemId: drop.itemUniqueName,
              itemName: dropItemName,
              expectedQty: qty,
              isSeed: false
            })
          }
        }
      } else if (res.item.grownItemUniqueName) {
        const grownAnimalName = res.item.grownItemUniqueName
        const grownAnimal = grownItemsMap.get(grownAnimalName)
        const grownAnimalNameFr = grownAnimal?.localizations[0]?.name ?? grownAnimalName

        const existingGrown = harvestsMap.get(grownAnimalName)
        if (existingGrown) {
          existingGrown.expectedQty += 1 * res.count
        } else {
          harvestsMap.set(grownAnimalName, {
            itemId: grownAnimalName,
            itemName: grownAnimalNameFr,
            expectedQty: 1 * res.count,
            isSeed: false
          })
        }
      } else if (res.item.productLootTable) {
        for (const drop of res.item.productLootTable.items) {
          if (!drop.itemUniqueName) continue
          const dropItemName = drop.item?.localizations[0]?.name ?? drop.itemUniqueName
          const avgAmt = getAverageAmount(drop.amount)
          const qty = avgAmt * drop.chance * res.count * (isPremium ? 2.0 : 1.0)

          const existingProduct = harvestsMap.get(drop.itemUniqueName)
          if (existingProduct) {
            existingProduct.expectedQty += qty
          } else {
            harvestsMap.set(drop.itemUniqueName, {
              itemId: drop.itemUniqueName,
              itemName: dropItemName,
              expectedQty: qty,
              isSeed: false
            })
          }
        }
      }

      // B. Offspring/Seed Return Yields
      const seedItemId = res.itemId
      const seedName = res.item.localizations[0]?.name ?? seedItemId
      const baseChance = res.item.harvestSeedChance ?? res.item.offspringChance ?? 0.60
      const returnRate = getSeedReturnRate(seedItemId, res.item.tier, res.isFocusUsed, baseChance)
      const seedQty = returnRate * res.count

      const existingSeed = harvestsMap.get(seedItemId)
      if (existingSeed) {
        existingSeed.expectedQty += seedQty
      } else {
        harvestsMap.set(seedItemId, {
          itemId: seedItemId,
          itemName: seedName,
          expectedQty: seedQty,
          isSeed: true
        })
      }
    }

    const expectedHarvestsRaw = Array.from(harvestsMap.values())

    return {
      buildingInstance: b,
      expectedHarvestsRaw
    }
  })

  // 2. Query city market prices for all expected harvest items
  const allHarvestItemIds = Array.from(
    new Set(buildingsWithRawHarvests.flatMap(b => b.expectedHarvestsRaw.map(h => h.itemId)))
  )

  const prices = allHarvestItemIds.length > 0
    ? await prisma.marketPrice.findMany({
        where: {
          itemId: { in: allHarvestItemIds },
          locationId: island.locationId,
          quality: 1
        }
      })
    : []

  const pricesMap = new Map(prices.map(p => [p.itemId, p.sellPriceMin ?? p.buyPriceMax ?? 0]))
  const profitability = await islandEngine.calculateIslandProfitability(id)

  // 3. Finalize buildings, expectedHarvests, and accurate financials
  const enrichedBuildings = await Promise.all(buildingsWithRawHarvests.map(async (b) => {
    let totalGrossRevenue = 0
    let totalSeedCost = 0
    let totalFoodCost = 0

    const expectedHarvests = b.expectedHarvestsRaw.map(h => {
      const price = pricesMap.get(h.itemId) ?? 0
      const estimatedValue = Math.round(h.expectedQty * price)
      
      // Seed returns are not counted in primary gross crop revenue (they are factored in net seed cost below)
      if (!h.isSeed) {
        totalGrossRevenue += h.expectedQty * price
      }
      
      return {
        ...h,
        price,
        estimatedValue,
        expectedQty: Math.round(h.expectedQty * 10) / 10
      }
    }).sort((a, b) => (a.isSeed === b.isSeed ? 0 : a.isSeed ? 1 : -1))

    // Calculate seed cost and food cost for resources of this building
    const inst = b.buildingInstance
    const isAnimal = ['PASTURE', 'KENNEL'].some(t => inst.building?.id?.includes(t))
    
    for (const res of inst.resources) {
      if (!res.item) continue
      
      // Seed return price
      const seedPrice = pricesMap.get(res.itemId) ?? 0
      const baseChance = res.item.harvestSeedChance ?? res.item.offspringChance ?? 0.60
      const returnRate = getSeedReturnRate(res.itemId, res.item.tier, res.isFocusUsed, baseChance)
      
      const netSeedFactor = 1.0 - returnRate
      totalSeedCost += (netSeedFactor * seedPrice) * res.count

      if (isAnimal) {
        const cheapestFood = await islandEngine.findCheapestFood(res.itemId)
        if (cheapestFood) {
          totalFoodCost += (cheapestFood.cheapestFoodPrice * 10) * res.count
        }
      }
    }

    const totalTax = totalGrossRevenue * TAX_RATE

    const financials = {
      grossRevenue: Math.round(totalGrossRevenue),
      tax: Math.round(totalTax),
      seedCost: Math.round(totalSeedCost),
      foodCost: Math.round(totalFoodCost),
      netProfit: Math.round(totalGrossRevenue - totalTax - totalSeedCost - totalFoodCost)
    }

    return {
      ...inst,
      buildingName: inst.building?.localizations[0]?.name ?? inst.building?.name, 
      buildingIcon: inst.building?.uiBuildMenuTexture 
        ? `/game_assets/${inst.building.uiBuildMenuTexture.toLowerCase()}.png` 
        : inst.building?.iconUrl, 
      tier: inst.building?.tier,
      expectedHarvests,
      financials,
      resources: inst.resources.map(r => ({
        ...r,
        itemName: r.item?.localizations[0]?.name ?? r.itemId
      }))
    }
  }))

  return { 
    data: { 
      ...island, 
      profitability,
      buildings: enrichedBuildings
    } 
  }
})
