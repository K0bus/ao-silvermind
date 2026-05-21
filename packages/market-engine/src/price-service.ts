import { randomUUID } from 'node:crypto'
import {
  prisma,
  DEFAULT_LOCATIONS,
  PrismaRuntime,
  PriceConfidenceValues,
} from '@albion-tool/database'
import type {
  Prisma as PrismaType,
  PriceConfidence as PriceConfidenceType,
} from '@albion-tool/database'
import { marketApiClient, type RawHistoryPrice, type RawMarketPrice } from './api-client'

export interface MarketSyncItem {
  id: string
  uniqueName: string
  enchantmentLevel?: number
}

export interface MarketSyncProgress {
  processed: number
  updated: number
  failed: number
  total: number
}

interface MarketPriceRow {
  itemId: string
  locationId: string
  quality: number
  sellPriceMin: number
  sellPriceMinDate: Date | null
  sellPriceMax: number
  sellPriceMaxDate: Date | null
  buyPriceMin: number
  buyPriceMinDate: Date | null
  buyPriceMax: number
  buyPriceMaxDate: Date | null
  dataUpdatedAt: Date
}

interface ResolvedPriceRow {
  itemId: string
  locationId: string
  quality: number
  sellPrice: number
  buyPrice: number
  confidence: PriceConfidenceType
  source: string
  updatedAt: Date
}

export class MarketPriceService {
  private readonly cityNameMap: Record<string, string> = {
    'Fort Sterling': 'FortSterling',
    'Black Market': 'BlackMarket',
  }

  private readonly INCOHERENT_PRICES = [999999, 99999999]
  private readonly MAX_SPREAD_RATIO = 20.0 // 2000% spread max
  private readonly MAX_QUALITY_MULTIPLIER = 5.0 // High quality shouldn't be 5x more than Q1
  private readonly BULK_WRITE_SIZE = 1000
  private validLocationIds?: Set<string>

  private readonly FRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24h
  private readonly RECENT_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000 // 72h
  private readonly STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

  /**
   * Syncs market prices for a given list of items.
   * Receives items with both DB id (for FK) and uniqueName (for API calls).
   */
  async syncMarketPrices(params: {
    items: MarketSyncItem[]
    locations?: string[]
    qualities?: number[]
    jobId?: string
    skipHistory?: boolean
    onProgress?: (progress: MarketSyncProgress) => void | Promise<void>
  }): Promise<{ itemsUpdated: number; itemsFailed: number }> {
    const { items, locations, qualities, jobId, skipHistory, onProgress } = params

    const apiItems = items.map(item => ({
      id: item.id,
      apiItemId: this.toMarketApiItemId(item.uniqueName, item.enchantmentLevel),
    }))

    const apiItemIds = apiItems.map(item => item.apiItemId)

    // Call API endpoints concurrently to fetch live prices, and optionally daily history (24h), and hourly history (1h)
    const promises: [
      Promise<RawMarketPrice[]>,
      Promise<RawHistoryPrice[]>,
      Promise<RawHistoryPrice[]>,
    ] = [
      marketApiClient.getPrices(apiItemIds, locations, qualities),
      skipHistory
        ? Promise.resolve([])
        : marketApiClient.getHistory(apiItemIds, locations, qualities, 24),
      skipHistory
        ? Promise.resolve([])
        : marketApiClient.getHistory(apiItemIds, locations, qualities, 1),
    ]

    const [pricesResult, history24Result, history1Result] = await Promise.allSettled(promises)

    const rawPrices = pricesResult.status === 'fulfilled' ? pricesResult.value : []
    const rawHistory24 = history24Result.status === 'fulfilled' ? history24Result.value : []
    const rawHistory1 = history1Result.status === 'fulfilled' ? history1Result.value : []

    if (pricesResult.status === 'rejected') {
      console.error('[MarketPriceService] Failed to fetch prices from API:', pricesResult.reason)
    }
    if (history24Result.status === 'rejected') {
      console.error('[MarketPriceService] Failed to fetch 24h history from API:', history24Result.reason)
    }
    if (history1Result.status === 'rejected') {
      console.error('[MarketPriceService] Failed to fetch 1h history from API:', history1Result.reason)
    }

    const itemIdResolver = this.buildItemIdResolver(items)

    const validLocationIds = await this.getValidLocationIds()

    let itemsUpdated = 0
    let itemsFailed = 0

    const rows: MarketPriceRow[] = []
    for (const raw of rawPrices) {
      const locationId = this.normalizeLocationId(raw.city)
      const itemId = itemIdResolver(raw.item_id)

      if (!itemId || !validLocationIds.has(locationId)) {
        continue
      }

      const sellPriceMinDate = this.parseSafeDate(raw.sell_price_min_date)
      const sellPriceMaxDate = this.parseSafeDate(raw.sell_price_max_date)
      const buyPriceMinDate = this.parseSafeDate(raw.buy_price_min_date)
      const buyPriceMaxDate = this.parseSafeDate(raw.buy_price_max_date)

      rows.push({
        itemId,
        locationId,
        quality: raw.quality,
        sellPriceMin: raw.sell_price_min,
        sellPriceMinDate,
        sellPriceMax: raw.sell_price_max,
        sellPriceMaxDate,
        buyPriceMin: raw.buy_price_min,
        buyPriceMinDate,
        buyPriceMax: raw.buy_price_max,
        buyPriceMaxDate,
        dataUpdatedAt: this.latestApiDate([
          sellPriceMinDate,
          sellPriceMaxDate,
          buyPriceMinDate,
          buyPriceMaxDate,
        ]),
      })
    }

    try {
      if (rows.length > 0 || rawHistory24.length > 0 || rawHistory1.length > 0) {
        // Pass historical data and itemIdResolver to bulk persistence
        await this.bulkPersistPrices(rows, rawHistory24, rawHistory1, itemIdResolver)
        itemsUpdated = rows.length
      }
    } catch (error) {
      console.error('[MarketPriceService] Failed to persist market price batch:', error)
      itemsFailed = rows.length
    }

    // Mark items from our batch as processed
    const itemsProcessed = items.length

    if (jobId) {
      await prisma.marketSyncJob.update({
        where: { id: jobId },
        data: {
          itemsUpdated: { increment: itemsUpdated },
          itemsFailed: { increment: itemsFailed },
          itemsProcessed: { increment: itemsProcessed },
        },
      })
    }

    if (onProgress) {
      await onProgress({
        processed: itemsProcessed,
        updated: itemsUpdated,
        failed: itemsFailed,
        total: items.length
      })
    }

    return { itemsUpdated, itemsFailed }
  }

  private async bulkPersistPrices(
    rows: MarketPriceRow[],
    rawHistory24: RawHistoryPrice[] = [],
    rawHistory1: RawHistoryPrice[] = [],
    itemIdResolver?: (apiItemId: string) => string | undefined,
  ) {
    if (rows.length === 0 && rawHistory24.length === 0 && rawHistory1.length === 0) return

    // If rows is empty but we have history data, let's load all item IDs from the raw history arrays
    let itemIds: string[] = []
    if (rows.length > 0) {
      itemIds = [...new Set(rows.map((r) => r.itemId))]
    } else if (itemIdResolver) {
      const ids = new Set<string>()
      for (const h of [...rawHistory24, ...rawHistory1]) {
        const id = itemIdResolver(h.item_id)
        if (id) ids.add(id)
      }
      itemIds = [...ids]
    }

    if (itemIds.length === 0) return

    const items = await prisma.item.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, maxQuality: true },
    })
    const maxQualityMap = new Map(items.map((i) => [i.id, i.maxQuality]))

    const filteredRows = rows.filter((row) => {
      const maxQ = maxQualityMap.get(row.itemId) ?? 1
      return row.quality <= maxQ
    })

    rows = filteredRows

    const existingPrices = await this.getExistingPriceMap(rows)
    const historyRows = rows
      .filter(row => this.shouldWriteHistory(row, existingPrices.get(this.priceKey(row))))
      .map(row => ({
        itemId: row.itemId,
        locationId: row.locationId,
        quality: row.quality,
        sellPriceMin: row.sellPriceMin,
        buyPriceMax: row.buyPriceMax,
        timestamp: row.dataUpdatedAt,
      }))

    // Parse actual transaction MarketHistory rows
    const marketHistoryRows: Array<{
      itemId: string
      locationId: string
      quality: number
      timeScale: number
      timestamp: Date
      itemCount: number
      avgPrice: number
    }> = []

    const validLocationIds = await this.getValidLocationIds()

    if (itemIdResolver) {
      const processRawHistory = (rawList: RawHistoryPrice[], scale: number) => {
        for (const raw of rawList) {
          const locationId = this.normalizeLocationId(raw.location)
          const itemId = itemIdResolver(raw.item_id)

          if (!itemId || !validLocationIds.has(locationId)) {
            continue
          }

          const maxQ = maxQualityMap.get(itemId) ?? 1
          if (raw.quality > maxQ) {
            continue
          }

          if (!raw.data || !Array.isArray(raw.data)) {
            continue
          }

          for (const dataPoint of raw.data) {
            const timestamp = this.parseSafeDate(dataPoint.timestamp)
            if (!timestamp) {
              continue
            }

            marketHistoryRows.push({
              itemId,
              locationId,
              quality: raw.quality,
              timeScale: scale,
              timestamp,
              itemCount: dataPoint.item_count || 0,
              avgPrice: dataPoint.avg_price || 0,
            })
          }
        }
      }

      processRawHistory(rawHistory24, 24)
      processRawHistory(rawHistory1, 1)
    }

    const [sellFallbacks, buyFallbacks, globalFallbacks, q1Prices] = await Promise.all([
      this.getLatestHistoryFallbacks(rows, 'sell'),
      this.getLatestHistoryFallbacks(rows, 'buy'),
      this.getGlobalMedianFallbacks(rows),
      this.getQuality1Prices(rows),
    ])

    const resolvedRows = rows.map(row => this.toResolvedPriceRow(row, sellFallbacks, buyFallbacks, globalFallbacks, q1Prices))

    // Chunk both sets of data
    const rowBatches = this.chunkArray(rows, this.BULK_WRITE_SIZE)
    const resolvedBatches = this.chunkArray(resolvedRows, this.BULK_WRITE_SIZE)

    // Even if rowBatches is empty, we might have marketHistoryRows to persist.
    // Let's ensure we process them.
    if (rowBatches.length > 0) {
      for (let i = 0; i < rowBatches.length; i++) {
        const batchRows = rowBatches[i]!
        const batchResolvedRows = resolvedBatches[i] || []
        const batchKeys = new Set(batchRows.map(r => this.priceKey(r)))
        const batchHistoryRows = historyRows.filter(r => batchKeys.has(this.priceKey(r)))

        // Get the market history rows belonging to items in this batch
        const batchItemIds = new Set(batchRows.map(r => r.itemId))
        const batchMarketHistoryRows = marketHistoryRows.filter(r => batchItemIds.has(r.itemId))

        await prisma.$transaction(
          async (tx) => {
            await this.bulkUpsertMarketPrices(tx, batchRows)
            await this.bulkInsertHistory(tx, batchHistoryRows)
            await this.bulkUpsertResolvedPrices(tx, batchResolvedRows)
            if (batchMarketHistoryRows.length > 0) {
              await this.bulkUpsertMarketHistory(tx, batchMarketHistoryRows)
            }
          },
          { timeout: 30000 },
        )
      }
    } else if (marketHistoryRows.length > 0) {
      // If we only have market history data but no live price rows (unusual but possible)
      const historyBatches = this.chunkArray(marketHistoryRows, this.BULK_WRITE_SIZE)
      for (const batch of historyBatches) {
        await prisma.$transaction(
          async (tx) => {
            await this.bulkUpsertMarketHistory(tx, batch)
          },
          { timeout: 30000 },
        )
      }
    }
  }

  private async getExistingPriceMap(rows: MarketPriceRow[]) {
    const itemIds = [...new Set(rows.map(row => row.itemId))]
    const locationIds = [...new Set(rows.map(row => row.locationId))]
    const qualities = [...new Set(rows.map(row => row.quality))]

    const existing = await prisma.marketPrice.findMany({
      where: {
        itemId: { in: itemIds },
        locationId: { in: locationIds },
        quality: { in: qualities },
      },
      select: {
        itemId: true,
        locationId: true,
        quality: true,
        sellPriceMin: true,
        buyPriceMax: true,
      },
    })

    return new Map(existing.map(row => [this.priceKey(row), row]))
  }

  private shouldWriteHistory(
    row: MarketPriceRow,
    existing?: { sellPriceMin: number; buyPriceMax: number },
  ) {
    if (row.sellPriceMin <= 0 && row.buyPriceMax <= 0) {
      return false
    }

    return (
      !existing ||
      existing.sellPriceMin !== row.sellPriceMin ||
      existing.buyPriceMax !== row.buyPriceMax
    )
  }

  private async getLatestHistoryFallbacks(rows: MarketPriceRow[], side: 'sell' | 'buy') {
    const needsFallback = rows.filter(row =>
      side === 'sell' ? !this.isPriceValid(row.sellPriceMin) : !this.isPriceValid(row.buyPriceMax)
    )

    if (needsFallback.length === 0) {
      return new Map<string, { price: number; timestamp: Date }>()
    }

    const keys = this.uniquePriceKeys(needsFallback)
    const valueRows = PrismaRuntime.join(
      keys.map(key => PrismaRuntime.sql`(${key.itemId}::text, ${key.locationId}::text, ${key.quality}::integer)`),
    )
    const invalidPrices = PrismaRuntime.join(this.INCOHERENT_PRICES)
    const priceColumn = side === 'sell' ? PrismaRuntime.sql`h."sellPriceMin"` : PrismaRuntime.sql`h."buyPriceMax"`

    const history = await prisma.$queryRaw<Array<{
      itemId: string
      locationId: string
      quality: number
      price: number
      timestamp: Date
    }>>(PrismaRuntime.sql`
      WITH requested("itemId", "locationId", "quality") AS (VALUES ${valueRows})
      SELECT DISTINCT ON (h."itemId", h."locationId", h."quality")
        h."itemId",
        h."locationId",
        h."quality",
        ${priceColumn} AS price,
        h."timestamp"
      FROM "MarketPriceHistory" h
      JOIN requested r
        ON r."itemId" = h."itemId"
        AND r."locationId" = h."locationId"
        AND r."quality" = h."quality"
      WHERE ${priceColumn} > 0
        AND ${priceColumn} NOT IN (${invalidPrices})
      ORDER BY h."itemId", h."locationId", h."quality", h."timestamp" DESC
    `)

    return new Map(history.map(row => [this.priceKey(row), {
      price: row.price,
      timestamp: row.timestamp,
    }]))
  }

  private toResolvedPriceRow(
    row: MarketPriceRow,
    sellFallbacks: Map<string, { price: number; timestamp: Date }>,
    buyFallbacks: Map<string, { price: number; timestamp: Date }>,
    globalFallbacks: Map<string, { sellPrice: number; buyPrice: number }>,
    q1Prices: Map<string, { sellPrice: number; buyPrice: number }>,
  ): ResolvedPriceRow {
    const key = this.priceKey(row)
    const now = new Date()

    // 1. Resolve Sell Price
    let sellPrice = row.sellPriceMin
    let sellSource = 'live'
    let sellConfidence: PriceConfidenceType = PriceConfidenceValues.HIGH
    let sellUpdatedAt = row.sellPriceMinDate ?? row.dataUpdatedAt

    // Validation: Freshness & Outliers
    let isSellLiveValid = this.isPriceValid(sellPrice)
    
    // Spread Outlier check
    if (isSellLiveValid && row.buyPriceMax > 0 && sellPrice / row.buyPriceMax > this.MAX_SPREAD_RATIO) {
      isSellLiveValid = false
    }

    // Quality Outlier check
    if (isSellLiveValid && row.quality > 1) {
      const q1 = q1Prices.get(`${row.itemId}:${row.locationId}`)
      if (q1 && q1.sellPrice > 0 && sellPrice / q1.sellPrice > this.MAX_QUALITY_MULTIPLIER) {
        isSellLiveValid = false
      }
    }

    const sellAge = now.getTime() - sellUpdatedAt.getTime()

    if (!isSellLiveValid || sellAge > this.FRESH_THRESHOLD_MS) {
      // Try History fallback
      const fallback = sellFallbacks.get(key)
      if (fallback && this.isPriceValid(fallback.price)) {
        sellPrice = fallback.price
        sellSource = 'history'
        sellConfidence = PriceConfidenceValues.MEDIUM
        sellUpdatedAt = fallback.timestamp
      } else {
        // Try Global fallback
        const global = globalFallbacks.get(row.itemId)
        if (global && this.isPriceValid(global.sellPrice)) {
          sellPrice = global.sellPrice
          sellSource = 'global'
          sellConfidence = PriceConfidenceValues.ESTIMATED
          sellUpdatedAt = now // Using current time as it's an estimation
        } else if (row.quality > 1) {
          // Try Quality 1 fallback
          const q1 = q1Prices.get(`${row.itemId}:${row.locationId}`)
          if (q1 && this.isPriceValid(q1.sellPrice)) {
            sellPrice = Math.round(q1.sellPrice * 1.05) // 5% markup for higher quality
            sellSource = 'q1_fallback'
            sellConfidence = PriceConfidenceValues.ESTIMATED
            sellUpdatedAt = now
          } else {
            sellPrice = 0
            sellSource = 'none'
            sellConfidence = PriceConfidenceValues.LOW
          }
        } else {
          sellPrice = 0
          sellSource = 'none'
          sellConfidence = PriceConfidenceValues.LOW
        }
      }
    } else if (sellAge > this.RECENT_THRESHOLD_MS) {
      sellConfidence = PriceConfidenceValues.MEDIUM
    }

    // 2. Resolve Buy Price
    let buyPrice = row.buyPriceMax
    let buySource = 'live'
    let buyConfidence: PriceConfidenceType = PriceConfidenceValues.HIGH
    let buyUpdatedAt = row.buyPriceMaxDate ?? row.dataUpdatedAt

    let isBuyLiveValid = this.isPriceValid(buyPrice)

    // Spread Outlier check (buy price shouldn't be 1/20th of sell price if we want to trust the spread, 
    // but usually we care more about sell price being too high. 
    // Let's just check if buyPrice is too far from Q1)
    if (isBuyLiveValid && row.quality > 1) {
      const q1 = q1Prices.get(`${row.itemId}:${row.locationId}`)
      if (q1 && q1.buyPrice > 0 && buyPrice / q1.buyPrice > this.MAX_QUALITY_MULTIPLIER) {
        isBuyLiveValid = false
      }
    }

    const buyAge = now.getTime() - buyUpdatedAt.getTime()

    if (!isBuyLiveValid || buyAge > this.FRESH_THRESHOLD_MS) {
      const fallback = buyFallbacks.get(key)
      if (fallback && this.isPriceValid(fallback.price)) {
        buyPrice = fallback.price
        buySource = 'history'
        buyConfidence = PriceConfidenceValues.MEDIUM
        buyUpdatedAt = fallback.timestamp
      } else {
        const global = globalFallbacks.get(row.itemId)
        if (global && this.isPriceValid(global.buyPrice)) {
          buyPrice = global.buyPrice
          buySource = 'global'
          buyConfidence = PriceConfidenceValues.ESTIMATED
          buyUpdatedAt = now
        } else if (row.quality > 1) {
          const q1 = q1Prices.get(`${row.itemId}:${row.locationId}`)
          if (q1 && this.isPriceValid(q1.buyPrice)) {
            buyPrice = q1.buyPrice // Buy price usually doesn't have much markup for quality
            buySource = 'q1_fallback'
            buyConfidence = PriceConfidenceValues.ESTIMATED
            buyUpdatedAt = now
          } else {
            buyPrice = 0
            buySource = 'none'
            buyConfidence = PriceConfidenceValues.LOW
          }
        } else {
          buyPrice = 0
          buySource = 'none'
          buyConfidence = PriceConfidenceValues.LOW
        }
      }
    } else if (buyAge > this.RECENT_THRESHOLD_MS) {
      buyConfidence = PriceConfidenceValues.MEDIUM
    }

    // 3. Final Coherence Check: If buy > sell (stale data), prefer sell but lower confidence
    if (sellPrice > 0 && buyPrice > sellPrice) {
      // This often happens with Black Market or very stale data
      // For crafting tool, we usually want to be conservative
      buyConfidence = this.getLowerConfidence(buyConfidence, PriceConfidenceValues.MEDIUM)
      sellConfidence = this.getLowerConfidence(sellConfidence, PriceConfidenceValues.MEDIUM)
    }

    return {
      itemId: row.itemId,
      locationId: row.locationId,
      quality: row.quality,
      sellPrice,
      buyPrice,
      confidence: this.getLowerConfidence(sellConfidence, buyConfidence),
      source: sellSource === buySource ? sellSource : `S:${sellSource}/B:${buySource}`,
      updatedAt: this.latestApiDate([sellUpdatedAt, buyUpdatedAt]),
    }
  }

  private async getGlobalMedianFallbacks(rows: MarketPriceRow[]) {
    const itemIds = [...new Set(rows.map(row => row.itemId))]
    if (itemIds.length === 0) return new Map<string, { sellPrice: number; buyPrice: number }>()

    const valueRows = PrismaRuntime.join(itemIds.map(id => PrismaRuntime.sql`(${id}::text)`))
    const staleThreshold = new Date(Date.now() - this.STALE_THRESHOLD_MS)

    // Using average as a proxy for median for batch performance, 
    // or we could use PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ...) in PG
    const globalPrices = await prisma.$queryRaw<Array<{
      itemId: string
      sellPrice: number
      buyPrice: number
    }>>(PrismaRuntime.sql`
      WITH requested("itemId") AS (VALUES ${valueRows})
      SELECT 
        h."itemId",
        CAST(AVG(h."sellPriceMin") AS INTEGER) as "sellPrice",
        CAST(AVG(h."buyPriceMax") AS INTEGER) as "buyPrice"
      FROM "MarketPriceHistory" h
      JOIN requested r ON r."itemId" = h."itemId"
      WHERE h."timestamp" >= ${staleThreshold}
        AND h."sellPriceMin" > 0
        AND h."buyPriceMax" > 0
        AND h."sellPriceMin" NOT IN (${PrismaRuntime.join(this.INCOHERENT_PRICES)})
      GROUP BY h."itemId"
    `)

    return new Map(globalPrices.map(row => [row.itemId, {
      sellPrice: row.sellPrice,
      buyPrice: row.buyPrice,
    }]))
  }

  private async getQuality1Prices(rows: MarketPriceRow[]) {
    const needed = rows.filter(r => r.quality > 1)
    if (needed.length === 0) return new Map<string, { sellPrice: number; buyPrice: number }>()

    const itemIds = [...new Set(needed.map(r => r.itemId))]
    const locationIds = [...new Set(needed.map(r => r.locationId))]

    const q1Prices = await prisma.marketPrice.findMany({
      where: {
        itemId: { in: itemIds },
        locationId: { in: locationIds },
        quality: 1,
      },
      select: {
        itemId: true,
        locationId: true,
        sellPriceMin: true,
        buyPriceMax: true,
      },
    })

    return new Map(q1Prices.map(p => [`${p.itemId}:${p.locationId}`, {
      sellPrice: p.sellPriceMin,
      buyPrice: p.buyPriceMax,
    }]))
  }

  private async bulkUpsertMarketPrices(tx: PrismaType.TransactionClient, rows: MarketPriceRow[]) {
    if (rows.length === 0) return

    const values = PrismaRuntime.join(rows.map(row => PrismaRuntime.sql`(
      ${randomUUID()},
      ${row.itemId},
      ${row.locationId},
      ${row.quality},
      ${row.sellPriceMin},
      ${row.sellPriceMinDate},
      ${row.sellPriceMax},
      ${row.sellPriceMaxDate},
      ${row.buyPriceMin},
      ${row.buyPriceMinDate},
      ${row.buyPriceMax},
      ${row.buyPriceMaxDate},
      ${row.dataUpdatedAt}
    )`))

    await tx.$executeRaw(PrismaRuntime.sql`
      INSERT INTO "MarketPrice" (
        "id",
        "itemId",
        "locationId",
        "quality",
        "sellPriceMin",
        "sellPriceMinDate",
        "sellPriceMax",
        "sellPriceMaxDate",
        "buyPriceMin",
        "buyPriceMinDate",
        "buyPriceMax",
        "buyPriceMaxDate",
        "updatedAt"
      )
      VALUES ${values}
      ON CONFLICT ("itemId", "locationId", "quality")
      DO UPDATE SET
        "sellPriceMin" = EXCLUDED."sellPriceMin",
        "sellPriceMinDate" = EXCLUDED."sellPriceMinDate",
        "sellPriceMax" = EXCLUDED."sellPriceMax",
        "sellPriceMaxDate" = EXCLUDED."sellPriceMaxDate",
        "buyPriceMin" = EXCLUDED."buyPriceMin",
        "buyPriceMinDate" = EXCLUDED."buyPriceMinDate",
        "buyPriceMax" = EXCLUDED."buyPriceMax",
        "buyPriceMaxDate" = EXCLUDED."buyPriceMaxDate",
        "updatedAt" = EXCLUDED."updatedAt"
    `)
  }

  private async bulkInsertHistory(
    tx: PrismaType.TransactionClient,
    rows: Array<{
      itemId: string
      locationId: string
      quality: number
      sellPriceMin: number
      buyPriceMax: number
      timestamp: Date
    }>,
  ) {
    if (rows.length === 0) return

    const values = PrismaRuntime.join(rows.map(row => PrismaRuntime.sql`(
      ${randomUUID()},
      ${row.itemId},
      ${row.locationId},
      ${row.quality},
      ${row.sellPriceMin},
      ${row.buyPriceMax},
      ${row.timestamp}
    )`))

    await tx.$executeRaw(PrismaRuntime.sql`
      INSERT INTO "MarketPriceHistory" (
        "id",
        "itemId",
        "locationId",
        "quality",
        "sellPriceMin",
        "buyPriceMax",
        "timestamp"
      )
      VALUES ${values}
    `)
  }

  private async bulkUpsertResolvedPrices(tx: PrismaType.TransactionClient, rows: ResolvedPriceRow[]) {
    if (rows.length === 0) return

    const values = PrismaRuntime.join(rows.map(row => PrismaRuntime.sql`(
      ${randomUUID()},
      ${row.itemId},
      ${row.locationId},
      ${row.quality},
      ${row.sellPrice},
      ${row.buyPrice},
      ${row.confidence}::"PriceConfidence",
      ${row.source},
      ${row.updatedAt}
    )`))

    await tx.$executeRaw(PrismaRuntime.sql`
      INSERT INTO "ResolvedPrice" (
        "id",
        "itemId",
        "locationId",
        "quality",
        "sellPrice",
        "buyPrice",
        "confidence",
        "source",
        "updatedAt"
      )
      VALUES ${values}
      ON CONFLICT ("itemId", "locationId", "quality")
      DO UPDATE SET
        "sellPrice" = EXCLUDED."sellPrice",
        "buyPrice" = EXCLUDED."buyPrice",
        "confidence" = EXCLUDED."confidence",
        "source" = EXCLUDED."source",
        "updatedAt" = EXCLUDED."updatedAt"
    `)
  }

  private async bulkUpsertMarketHistory(
    tx: PrismaType.TransactionClient,
    rows: Array<{
      itemId: string
      locationId: string
      quality: number
      timeScale: number
      timestamp: Date
      itemCount: number
      avgPrice: number
    }>,
  ) {
    if (rows.length === 0) return

    const BATCH_SIZE = 100
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const chunk = rows.slice(i, i + BATCH_SIZE)

      const values = PrismaRuntime.join(chunk.map(row => PrismaRuntime.sql`(
        ${randomUUID()},
        ${row.itemId},
        ${row.locationId},
        ${row.quality},
        ${row.timeScale},
        ${row.timestamp},
        ${row.itemCount},
        ${row.avgPrice}
      )`))

      await tx.$executeRaw(PrismaRuntime.sql`
        INSERT INTO "MarketHistory" (
          "id",
          "itemId",
          "locationId",
          "quality",
          "timeScale",
          "timestamp",
          "itemCount",
          "avgPrice"
        )
        VALUES ${values}
        ON CONFLICT ("itemId", "locationId", "quality", "timeScale", "timestamp")
        DO UPDATE SET
          "itemCount" = EXCLUDED."itemCount",
          "avgPrice" = EXCLUDED."avgPrice"
      `)
    }
  }

  /**
   * Backfill: Resolves all existing MarketPrice records.
   */
  async resolveAllExistingPrices() {
    const totalCount = await prisma.marketPrice.count()
    console.log(`[MarketPriceService] Resolving ${totalCount} existing records in batches...`)

    const batchSize = 500
    for (let skip = 0; skip < totalCount; skip += batchSize) {
      const marketPrices = await prisma.marketPrice.findMany({
        skip,
        take: batchSize,
      })

      const rows: MarketPriceRow[] = marketPrices.map(mp => ({
        itemId: mp.itemId,
        locationId: mp.locationId,
        quality: mp.quality,
        sellPriceMin: mp.sellPriceMin,
        sellPriceMinDate: mp.sellPriceMinDate,
        sellPriceMax: mp.sellPriceMax,
        sellPriceMaxDate: mp.sellPriceMaxDate,
        buyPriceMin: mp.buyPriceMin,
        buyPriceMinDate: mp.buyPriceMinDate,
        buyPriceMax: mp.buyPriceMax,
        buyPriceMaxDate: mp.buyPriceMaxDate,
        dataUpdatedAt: mp.updatedAt,
      }))

      await this.bulkPersistPrices(rows)
      console.log(`[MarketPriceService] Resolved ${skip + marketPrices.length}/${totalCount}`)
    }
  }


  private isPriceValid(price: number): boolean {
    return price > 0 && !this.INCOHERENT_PRICES.includes(price)
  }

  private getLowerConfidence(c1: PriceConfidenceType, c2: PriceConfidenceType): PriceConfidenceType {
    const order: PriceConfidenceType[] = [
      PriceConfidenceValues.LOW,
      PriceConfidenceValues.ESTIMATED,
      PriceConfidenceValues.MEDIUM,
      PriceConfidenceValues.HIGH,
    ]
    const i1 = order.indexOf(c1)
    const i2 = order.indexOf(c2)
    return order[Math.min(i1, i2)] as PriceConfidenceType
  }

  private parseSafeDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr || dateStr.startsWith('0001') || dateStr.startsWith('0000')) {
      return null
    }
    const d = new Date(dateStr)
    if (isNaN(d.getTime()) || d.getFullYear() < 1970) {
      return null
    }
    return d
  }

  private latestApiDate(dates: Array<Date | null>): Date {
    const timestamps = dates
      .map(date => date?.getTime() ?? 0)
      .filter(timestamp => timestamp > 0)

    return timestamps.length > 0 ? new Date(Math.max(...timestamps)) : new Date()
  }

  private normalizeLocationId(city: string): string {
    return this.cityNameMap[city] ?? city
  }

  private baseUniqueName(uniqueName: string): string {
    return uniqueName.replace(/@\d+$/, '')
  }

  private toMarketApiItemId(uniqueName: string, enchantmentLevel?: number): string {
    const baseUniqueName = this.baseUniqueName(uniqueName)
    const suffixMatch = uniqueName.match(/@(\d+)$/)
    const suffixEnchant = suffixMatch ? Number.parseInt(suffixMatch[1]!, 10) : 0

    if (enchantmentLevel && enchantmentLevel > 0) {
      return `${baseUniqueName}@${enchantmentLevel}`
    }

    if (suffixEnchant > 0) {
      return uniqueName
    }

    return baseUniqueName
  }

  private buildItemIdResolver(items: MarketSyncItem[]) {
    const byExactUniqueName = new Map<string, string>()
    const byBaseAndEnchant = new Map<string, string>()

    for (const item of items) {
      byExactUniqueName.set(item.uniqueName, item.id)
      const enchant = item.enchantmentLevel ?? 0
      byBaseAndEnchant.set(`${this.baseUniqueName(item.uniqueName)}@${enchant}`, item.id)
    }

    return (apiItemId: string): string | undefined => {
      // 1) Strict DB match first (handles rows that are really stored with @N)
      const exact = byExactUniqueName.get(apiItemId)
      if (exact) return exact

      // 2) Fallback by parsed base+enchant to support mixed naming in DB
      const match = apiItemId.match(/^(.*?)(?:@(\d+))?$/)
      if (!match) return undefined
      const base = match[1] ?? apiItemId
      const enchant = Number.parseInt(match[2] ?? '0', 10)
      return byBaseAndEnchant.get(`${base}@${Number.isNaN(enchant) ? 0 : enchant}`)
    }
  }

  private async getValidLocationIds(): Promise<Set<string>> {
    if (!this.validLocationIds) {
      let locations = await prisma.location.findMany({ select: { id: true } })

      if (locations.length === 0) {
        console.warn('[MarketPriceService] No locations found in database; bootstrapping default market locations.')
        for (const loc of DEFAULT_LOCATIONS) {
          await prisma.location.upsert({
            where: { id: loc.id },
            update: {},
            create: loc,
          })
        }
        locations = await prisma.location.findMany({ select: { id: true } })
      }

      this.validLocationIds = new Set(locations.map(location => location.id))
    }

    return this.validLocationIds
  }

  private priceKey(row: { itemId: string; locationId: string; quality: number }): string {
    return `${row.itemId}:${row.locationId}:${row.quality}`
  }

  private uniquePriceKeys(rows: MarketPriceRow[]) {
    const map = new Map<string, { itemId: string; locationId: string; quality: number }>()

    for (const row of rows) {
      map.set(this.priceKey(row), {
        itemId: row.itemId,
        locationId: row.locationId,
        quality: row.quality,
      })
    }

    return [...map.values()]
  }

  /**
   * Plans synchronization for all items.
   * Returns chunks of {id, uniqueName, enchantmentLevel} for correct API + DB usage.
   */
  async planFullSync(options: { triggeredById?: string; skipHistory?: boolean } = {}) {
    const job = await prisma.marketSyncJob.create({
      data: {
        type: 'FULL',
        status: 'PENDING',
        triggeredById: options.triggeredById,
      },
    })

    // Fetch id (FK writes) + uniqueName/enchantmentLevel (API id generation)
    const items = await prisma.item.findMany({
      select: { id: true, uniqueName: true, enchantmentLevel: true },
    })

    const chunks = marketApiClient.chunkPriceItems(items)

    return { jobId: job.id, chunks, totalItems: items.length }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}

export const marketPriceService = new MarketPriceService()
