import { prisma } from '@albion-tool/database'

const EXCLUDED = ["blackmarket", "caerleon", "brecilien"]
const SILVER_PER_100_NUTRITION = 999 // default public station rate
const TAX_RATE = 0.04
const LOCALE = "FR-FR"
const MIN_CITIES = 2 // item must be calculable in at least 2 cities

export interface TopProfitItem {
  uniqueName: string
  name: string
  tier: number
  enchantmentLevel: number
  iconUrl: string | null
  itemType: string | null
  shopCategory: string | null
  shopSubcategory: string | null
  categoryName: string | null
  avgMargin: number
  bestCity: string
  bestMargin: number
  bestProfit: number
  bestCost: number
  citiesCount: number
}

export async function computeTopProfitItems(): Promise<TopProfitItem[]> {
  const allLocations = await prisma.location.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  })

  const validLocations = allLocations.filter(
    (l) => !EXCLUDED.includes(l.name.toLowerCase())
  )
  if (validLocations.length === 0) return []

  const locationIds = validLocations.map((l) => l.id)

  const rawItems = await prisma.item.findMany({
    where: { isCraftable: true, craftingRecipe: { isNot: null }, shopCategory: { not: "artefacts" } },
    take: 1000,
    orderBy: [{ tier: "desc" }, { enchantmentLevel: "asc" }, { id: "asc" }],
    select: {
      uniqueName: true,
      tier: true,
      enchantmentLevel: true,
      iconUrl: true,
      itemType: true,
      shopCategory: true,
      shopSubcategory: true,
      category: {
        select: {
          nameEn: true,
          localizations: {
            where: { locale: LOCALE },
            select: { name: true },
            take: 1,
          },
        },
      },
      localizations: {
        where: { locale: LOCALE },
        select: { name: true },
        take: 1,
      },
      craftingRecipe: {
        select: {
          resultCount: true,
          silverCost: true,
          ingredients: {
            select: {
              quantity: true,
              maxReturnRate: true,
              item: {
                select: {
                  marketPrices: {
                    where: { locationId: { in: locationIds }, quality: 1 },
                    select: { locationId: true, sellPriceMin: true },
                  },
                },
              },
            },
          },
        },
      },
      marketPrices: {
        where: { locationId: { in: locationIds }, quality: 1 },
        select: { locationId: true, sellPriceMin: true },
      },
      cityBonuses: {
        where: { locationId: { in: locationIds } },
        select: { locationId: true, craftingBonus: true },
      },
    },
  })

  const pairs = [
    ...new Map(
      rawItems.map((i) => [
        `${i.tier}:${i.enchantmentLevel}`,
        { tier: i.tier, enchantmentLevel: i.enchantmentLevel },
      ])
    ).values(),
  ]
  const returnRates =
    pairs.length > 0
      ? await prisma.returnRate.findMany({ where: { OR: pairs } })
      : []
  const rrMap = new Map(
    returnRates.map((r) => [`${r.tier}:${r.enchantmentLevel}`, r])
  )

  const results: TopProfitItem[] = []

  for (const item of rawItems) {
    const rr = rrMap.get(`${item.tier}:${item.enchantmentLevel}`)
    const baseRR = rr?.baseReturnRate ?? 0
    const name = item.localizations[0]?.name ?? item.uniqueName

    const sellByLoc = new Map(
      item.marketPrices.map((p) => [p.locationId, p.sellPriceMin])
    )

    const margins: number[] = []
    let bestLocMargin = -Infinity
    let bestLocName = ""
    let bestLocProfit = 0
    let bestLocCost = 0

    for (const loc of validLocations) {
      let rawCost = 0
      let savings = 0
      let skip = false

      for (const ing of item.craftingRecipe!.ingredients) {
        const price = ing.item.marketPrices.find(
          (p) => p.locationId === loc.id
        )?.sellPriceMin
        if (!price || price === 0) {
          skip = true
          break
        }
        const capRR =
          ing.maxReturnRate !== null
            ? Math.min(baseRR, ing.maxReturnRate)
            : baseRR
        rawCost += ing.quantity * price
        savings += ing.quantity * price * capRR
      }
      if (skip) continue

      const nutritionRequired = item.craftingRecipe!.silverCost ?? 0
      const netMat = rawCost - savings
      const stationFee = (nutritionRequired / 100) * SILVER_PER_100_NUTRITION
      const netCost = netMat + stationFee
      const sellPrice = sellByLoc.get(loc.id)
      if (!sellPrice || sellPrice === 0) continue

      const cityBonus = item.cityBonuses.find(b => b.locationId === loc.id)?.craftingBonus ?? 0
      const effectiveOutput = (item.craftingRecipe!.resultCount ?? 1) * (1 + cityBonus / 100)
      const revenue = sellPrice * effectiveOutput
      const profit = revenue - revenue * TAX_RATE - netCost
      const margin = netCost > 0 ? (profit / netCost) * 100 : 0

      margins.push(margin)
      if (margin > bestLocMargin) {
        bestLocMargin = margin
        bestLocName = loc.name
        bestLocProfit = profit
        bestLocCost = netCost
      }
    }

    if (margins.length < MIN_CITIES) continue

    const avgMargin = margins.reduce((a, b) => a + b, 0) / margins.length
    const categoryName = (item as any).category?.localizations[0]?.name ?? (item as any).category?.nameEn ?? null
    
    results.push({
      uniqueName: item.uniqueName,
      name,
      tier: item.tier,
      enchantmentLevel: item.enchantmentLevel,
      iconUrl: item.iconUrl,
      itemType: item.itemType,
      shopCategory: item.shopCategory,
      shopSubcategory: item.shopSubcategory,
      categoryName,
      avgMargin: Math.round(avgMargin * 10) / 10,
      bestCity: bestLocName,
      bestMargin: Math.round(bestLocMargin * 10) / 10,
      bestProfit: Math.round(bestLocProfit),
      bestCost: Math.round(bestLocCost),
      citiesCount: margins.length,
    })
  }

  results.sort((a, b) => b.avgMargin - a.avgMargin)
  return results.slice(0, 5)
}

export async function getTopProfitHighlight() {
  const topItems = await computeTopProfitItems()
  if (!topItems || topItems.length === 0) return null
  const top = topItems[0]
  return {
    name: top.name,
    uniqueName: top.uniqueName,
    iconUrl: top.iconUrl,
    margin: top.bestMargin,
    profit: top.bestProfit,
    city: top.bestCity,
    cost: top.bestCost
  }
}

export interface CityProfitItem {
  uniqueName: string
  name: string
  tier: number
  enchantmentLevel: number
  iconUrl: string | null
  netCost: number
  sellRevenue: number
  profit: number
  margin: number
}

export async function computeTopProfitItemsForCity(locationId: string): Promise<CityProfitItem[]> {
  const location = await prisma.location.findFirst({
    where: {
      OR: [
        { id: locationId },
        { name: { equals: locationId, mode: "insensitive" } }
      ],
      isActive: true
    },
    select: { id: true, name: true },
  })

  if (!location) return []

  const rawItems = await prisma.item.findMany({
    where: {
      isCraftable: true,
      craftingRecipe: { isNot: null },
      shopCategory: { not: "artefacts" }
    },
    take: 1000,
    orderBy: [{ tier: "desc" }, { enchantmentLevel: "asc" }, { id: "asc" }],
    select: {
      uniqueName: true,
      tier: true,
      enchantmentLevel: true,
      iconUrl: true,
      localizations: {
        where: { locale: LOCALE },
        select: { name: true },
        take: 1,
      },
      craftingRecipe: {
        select: {
          resultCount: true,
          silverCost: true,
          ingredients: {
            select: {
              quantity: true,
              maxReturnRate: true,
              item: {
                select: {
                  resolvedPrices: {
                    where: { locationId: location.id, quality: 1 },
                    select: { sellPrice: true },
                  },
                },
              },
            },
          },
        },
      },
      resolvedPrices: {
        where: { locationId: location.id, quality: 1 },
        select: { sellPrice: true },
      },
      cityBonuses: {
        where: { locationId: location.id },
        select: { craftingBonus: true },
      },
    },
  })

  const pairs = [
    ...new Map(
      rawItems.map((i) => [
        `${i.tier}:${i.enchantmentLevel}`,
        { tier: i.tier, enchantmentLevel: i.enchantmentLevel },
      ])
    ).values(),
  ]
  const returnRates =
    pairs.length > 0
      ? await prisma.returnRate.findMany({ where: { OR: pairs } })
      : []
  const rrMap = new Map(
    returnRates.map((r) => [`${r.tier}:${r.enchantmentLevel}`, r])
  )

  const results: CityProfitItem[] = []

  for (const item of rawItems) {
    const rr = rrMap.get(`${item.tier}:${item.enchantmentLevel}`)
    const baseRR = rr?.baseReturnRate ?? 0
    const name = item.localizations[0]?.name ?? item.uniqueName

    let rawCost = 0
    let savings = 0
    let skip = false

    if (!item.craftingRecipe || !item.craftingRecipe.ingredients) continue

    for (const ing of item.craftingRecipe.ingredients) {
      const price = ing.item.resolvedPrices[0]?.sellPrice
      if (!price || price === 0) {
        skip = true
        break
      }
      const capRR =
        ing.maxReturnRate !== null
          ? Math.min(baseRR, ing.maxReturnRate)
          : baseRR
      rawCost += ing.quantity * price
      savings += ing.quantity * price * capRR
    }
    if (skip) continue

    const nutritionRequired = item.craftingRecipe.silverCost ?? 0
    const netMat = rawCost - savings
    const stationFee = (nutritionRequired / 100) * SILVER_PER_100_NUTRITION
    const netCost = netMat + stationFee

    const sellPrice = item.resolvedPrices[0]?.sellPrice
    if (!sellPrice || sellPrice === 0) continue

    const cityBonus = item.cityBonuses[0]?.craftingBonus ?? 0
    const effectiveOutput = (item.craftingRecipe.resultCount ?? 1) * (1 + cityBonus / 100)
    const revenue = sellPrice * effectiveOutput
    const profit = revenue - revenue * TAX_RATE - netCost
    const margin = netCost > 0 ? (profit / netCost) * 100 : 0

    results.push({
      uniqueName: item.uniqueName,
      name,
      tier: item.tier,
      enchantmentLevel: item.enchantmentLevel,
      iconUrl: item.iconUrl,
      netCost: Math.round(netCost),
      sellRevenue: Math.round(revenue),
      profit: Math.round(profit),
      margin: Math.round(margin * 10) / 10,
    })
  }

  // Sort by profit descending
  results.sort((a, b) => b.profit - a.profit)
  return results.slice(0, 5)
}
