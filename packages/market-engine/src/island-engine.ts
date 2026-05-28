import { prisma } from '@albion-tool/database'
import type { IslandProfitability, FoodOptimization } from '@albion-tool/types'

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

  // If focus/watering is used
  if (itemId.includes('MOUNT') || itemId.includes('FOAL') || itemId.includes('PUP') || base < 0.20) {
    // Rare mounts/animals have low base offspring rate, focus doubles it
    return base * 2
  }

  // Standard crops, herbs, and farm animals
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

export class IslandEngine {
  async calculateIslandProfitability(islandId: string): Promise<IslandProfitability | null> {
    const island = await prisma.island.findUnique({
      where: { id: islandId },
      include: {
        buildings: {
          include: {
            resources: {
              include: {
                item: {
                  include: {
                    harvestLootTable: {
                      include: {
                        items: true
                      }
                    },
                    productLootTable: {
                      include: {
                        items: true
                      }
                    }
                  }
                }
              }
            },
            building: true
          }
        },
        location: true
      }
    })

    if (!island) return null

    const parentCityId = island.locationId
    const isPremium = island.isPremium

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
                items: true
              }
            }
          }
        })
      : []

    const grownItemsMap = new Map(grownItems.map(item => [item.uniqueName, item]))

    const buildingProfits = await Promise.all(island.buildings.map(async (buildingInstance) => {
      const resourceProfits = await Promise.all(buildingInstance.resources.map(async (resource) => {
        if (!resource.item) return null

        let totalRevenue = 0

        // Helper to query sell min price for an item and accumulate revenue
        const addRevenueForDrop = async (itemId: string, qty: number) => {
          const priceData = await prisma.marketPrice.findFirst({
            where: { itemId, locationId: parentCityId, quality: 1 }
          })
          const sellPrice = priceData?.sellPriceMin ?? 0
          totalRevenue += sellPrice * qty
        }

        // A. Primary Harvest Yields
        if (resource.item.harvestLootTable) {
          for (const drop of resource.item.harvestLootTable.items) {
            if (!drop.itemUniqueName) continue
            const avgAmt = getAverageAmount(drop.amount)
            const qty = avgAmt * drop.chance * resource.count * (isPremium ? 2.0 : 1.0)
            await addRevenueForDrop(drop.itemUniqueName, qty)
          }
        } else if (resource.item.grownItemUniqueName) {
          const grownAnimalName = resource.item.grownItemUniqueName
          const grownAnimal = grownItemsMap.get(grownAnimalName)
          // Grown animal itself has 100% yield chance, count 1, no Premium doubling!
          await addRevenueForDrop(grownAnimalName, 1 * resource.count)
        } else if (resource.item.productLootTable) {
          for (const drop of resource.item.productLootTable.items) {
            if (!drop.itemUniqueName) continue
            const avgAmt = getAverageAmount(drop.amount)
            const qty = avgAmt * drop.chance * resource.count * (isPremium ? 2.0 : 1.0)
            await addRevenueForDrop(drop.itemUniqueName, qty)
          }
        }

        // Fallback to hardcoded average yield logic if no loot tables are found
        if (totalRevenue === 0) {
          const resultItemId = resource.item.harvestResultItemId || 
                             resource.item.productResultItemId || 
                             resource.item.grownItemUniqueName || 
                             resource.itemId.replace('_SEED', '')

          const resultPriceData = await prisma.marketPrice.findFirst({
            where: { itemId: resultItemId, locationId: parentCityId, quality: 1 }
          })
          const resultSellPrice = resultPriceData?.sellPriceMin ?? 0
          const yieldPerSlot = isPremium ? 9 : 4.5
          totalRevenue = resultSellPrice * yieldPerSlot * resource.count
        }

        const tax = totalRevenue * TAX_RATE

        // Net Seed Cost: you buy seeds for slots that didn't return one.
        const [resourcePriceData] = await Promise.all([
          prisma.marketPrice.findFirst({
            where: { itemId: resource.itemId, locationId: parentCityId, quality: 1 }
          })
        ])
        const resourceBuyPrice = resourcePriceData?.sellPriceMin ?? resourcePriceData?.buyPriceMax ?? 0

        const baseChance = resource.item.harvestSeedChance ?? resource.item.offspringChance
        const seedReturnRate = getSeedReturnRate(resource.itemId, resource.item.tier, resource.isFocusUsed, baseChance)

        const netSeedFactor = 1.0 - seedReturnRate
        const seedCost = (netSeedFactor * resourceBuyPrice) * resource.count

        // Animal food cost estimation if animal building
        let foodCost = 0
        const isAnimal = ['PASTURE', 'KENNEL'].some(t => buildingInstance.building?.id?.includes(t))
        if (isAnimal) {
          const cheapestFood = await this.findCheapestFood(resource.itemId)
          if (cheapestFood) {
            // Assume 10 units of food required per growth cycle
            foodCost = (cheapestFood.cheapestFoodPrice * 10) * resource.count
          }
        }

        const netProfit = totalRevenue - tax - seedCost - foodCost

        return {
          itemId: resource.itemId,
          itemName: resource.itemId,
          netProfit,
          roi: seedCost > 0 ? (netProfit / seedCost) * 100 : 0,
          taxAmount: tax,
          count: resource.count
        }
      }))

      const activeResources = resourceProfits.filter((r): r is NonNullable<typeof r> => r !== null)

      return {
        buildingId: buildingInstance.id,
        buildingName: buildingInstance.building?.name ?? 'Unknown',
        totalNetProfit: activeResources.reduce((sum, r) => sum + r.netProfit, 0),
        resources: activeResources
      }
    }))

    return {
      islandId: island.id,
      name: island.name,
      totalNetProfit: buildingProfits.reduce((sum, b) => sum + b.totalNetProfit, 0),
      buildings: buildingProfits as any
    }
  }

  async findCheapestFood(animalItemId: string): Promise<FoodOptimization | null> {
    const foodItems = await prisma.item.findMany({
      where: {
        itemType: 'FARMABLE',
        marketPrices: { some: {} }
      },
      include: {
        marketPrices: {
          orderBy: { sellPriceMin: 'asc' },
          take: 1
        }
      }
    })

    const optimizedFoods = foodItems
      .map(item => {
        const price = item.marketPrices[0]?.sellPriceMin ?? 0
        const nutrition = 100 
        return {
          itemId: item.uniqueName,
          price,
          nutritionPerItem: nutrition,
          costPerNutrition: price / nutrition
        }
      })
      .filter(f => f.price > 0)
      .sort((a, b) => a.costPerNutrition - b.costPerNutrition)

    if (optimizedFoods.length === 0) return null

    return {
      animalItemId,
      cheapestFoodId: optimizedFoods[0]!.itemId,
      cheapestFoodPrice: optimizedFoods[0]!.price,
      foodItems: optimizedFoods
    }
  }
}

export const islandEngine = new IslandEngine()
