import axios, { type AxiosRequestConfig } from 'axios'

export interface RawMarketPrice {
  item_id: string
  city: string
  quality: number
  sell_price_min: number
  sell_price_min_date: string
  sell_price_max: number
  sell_price_max_date: string
  buy_price_min: number
  buy_price_min_date: string
  buy_price_max: number
  buy_price_max_date: string
}

export interface RawHistoryPrice {
  item_id: string
  location: string
  quality: number
  data: Array<{
    avg_price: number
    timestamp: string
    item_count: number
  }>
}

export interface MarketApiItemRef {
  uniqueName: string
  enchantmentLevel?: number
}

export class MarketApiClient {
  private readonly baseUrl = 'https://www.albion-online-data.com/api/v2/stats/prices'
  private readonly historyUrl = 'https://www.albion-online-data.com/api/v2/stats/history'
  private readonly maxBatchSize = 1000
  private readonly maxUrlLength = 3900
  private readonly maxRetries = 5
  private readonly baseRetryDelayMs = 5000
  private readonly maxRetryDelayMs = 65000
  
  /**
   * Fetches prices for a list of items.
   */
  async getPrices(
    itemIds: string[],
    locations: string[] = [],
    qualities: number[] = []
  ): Promise<RawMarketPrice[]> {
    const batches = this.chunkByUrlLength(itemIds, this.baseUrl, locations, qualities)
    const allPrices: RawMarketPrice[] = []

    for (const batch of batches) {
      const prices = await this.fetchBatch(batch, locations, qualities)
      allPrices.push(...prices)
    }

    return allPrices
  }

  chunkPriceItems<T extends MarketApiItemRef>(
    items: T[],
    locations: string[] = [],
    qualities: number[] = [],
  ): T[][] {
    const chunks: T[][] = []
    let current: T[] = []

    for (const item of items) {
      const next = [...current, item]
      const nextIds = next.map(({ uniqueName, enchantmentLevel }) =>
        this.toMarketApiItemId(uniqueName, enchantmentLevel),
      )
      if (
        current.length > 0 &&
        (next.length > this.maxBatchSize || this.buildUrlLength(this.baseUrl, nextIds, locations, qualities, {}) > this.maxUrlLength)
      ) {
        chunks.push(current)
        current = [item]
      } else {
        current = next
      }
    }

    if (current.length > 0) chunks.push(current)
    return chunks
  }

  /**
   * Fetches history for a list of items.
   */
  async getHistory(
    itemIds: string[],
    locations: string[] = [],
    qualities: number[] = [],
    timeScale: number = 24
  ): Promise<RawHistoryPrice[]> {
    const batches = this.chunkByUrlLength(itemIds, this.historyUrl, locations, qualities, {
      'time-scale': timeScale,
    })
    const allHistory: RawHistoryPrice[] = []

    for (const batch of batches) {
      const history = await this.fetchHistoryBatch(batch, locations, qualities, timeScale)
      allHistory.push(...history)
    }

    return allHistory
  }

  /**
   * Fetches history for DB-backed items with enchantment-aware API ids.
   */
  async getHistoryForItems(
    items: MarketApiItemRef[],
    locations: string[] = [],
    qualities: number[] = [],
    timeScale: number = 24,
  ): Promise<RawHistoryPrice[]> {
    const apiItemIds = items.map((item) => this.toMarketApiItemId(item.uniqueName, item.enchantmentLevel))
    return this.getHistory(apiItemIds, locations, qualities, timeScale)
  }

  private async fetchBatch(
    itemIds: string[],
    locations: string[],
    qualities: number[]
  ): Promise<RawMarketPrice[]> {
    const itemsParam = this.encodeItemPath(itemIds)
    const url = `${this.baseUrl}/${itemsParam}`
    
    try {
      const response = await this.getWithRetry<RawMarketPrice[]>(url, {
        params: {
          locations: locations.join(',') || undefined,
          qualities: qualities.join(',') || undefined,
        },
        timeout: 30000,
      })
      return response.data
    } catch (error) {
      console.error(`[MarketApiClient] Error fetching price batch:`, error)
      return []
    }
  }

  private async fetchHistoryBatch(
    itemIds: string[],
    locations: string[],
    qualities: number[],
    timeScale: number
  ): Promise<RawHistoryPrice[]> {
    const itemsParam = this.encodeItemPath(itemIds)
    const url = `${this.historyUrl}/${itemsParam}`
    
    try {
      const response = await this.getWithRetry<RawHistoryPrice[]>(url, {
        params: {
          locations: locations.join(',') || undefined,
          qualities: qualities.join(',') || undefined,
          'time-scale': timeScale,
        },
        timeout: 30000,
      })
      return response.data
    } catch (error) {
      console.error(`[MarketApiClient] Error fetching history batch:`, error)
      return []
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  private chunkByUrlLength(
    itemIds: string[],
    baseUrl: string,
    locations: string[],
    qualities: number[],
    extraParams: Record<string, string | number | undefined> = {},
  ): string[][] {
    const chunks: string[][] = []
    let current: string[] = []

    for (const itemId of itemIds) {
      const next = [...current, itemId]
      if (
        current.length > 0 &&
        (next.length > this.maxBatchSize || this.buildUrlLength(baseUrl, next, locations, qualities, extraParams) > this.maxUrlLength)
      ) {
        chunks.push(current)
        current = [itemId]
      } else {
        current = next
      }
    }

    if (current.length > 0) chunks.push(current)
    return chunks
  }

  private buildUrlLength(
    baseUrl: string,
    itemIds: string[],
    locations: string[],
    qualities: number[],
    extraParams: Record<string, string | number | undefined>,
  ): number {
    const params = new URLSearchParams()
    if (locations.length > 0) params.set('locations', locations.join(','))
    if (qualities.length > 0) params.set('qualities', qualities.join(','))
    for (const [key, value] of Object.entries(extraParams)) {
      if (value !== undefined) params.set(key, String(value))
    }

    const query = params.toString()
    return `${baseUrl}/${this.encodeItemPath(itemIds)}${query ? `?${query}` : ''}`.length
  }

  private encodeItemPath(itemIds: string[]): string {
    return itemIds.map((id) => encodeURIComponent(id)).join(',')
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

  private async getWithRetry<T>(url: string, config: AxiosRequestConfig): Promise<{ data: T }> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await axios.get<T>(url, config)
      } catch (error) {
        if (!this.shouldRetry(error) || attempt === this.maxRetries) {
          throw error
        }

        const delay = this.retryDelayMs(error, attempt)
        const status = axios.isAxiosError(error) ? error.response?.status : undefined
        console.warn(`[MarketApiClient] API throttled/temporary error${status ? ` (${status})` : ''}; retry ${attempt + 1}/${this.maxRetries} in ${Math.round(delay / 1000)}s`)
        await this.sleep(delay)
      }
    }

    throw new Error('Retry loop exhausted')
  }

  private shouldRetry(error: unknown): boolean {
    if (!axios.isAxiosError(error)) return false
    const status = error.response?.status
    return status === 429 || status === 502 || status === 503 || status === 504
  }

  private retryDelayMs(error: unknown, attempt: number): number {
    if (axios.isAxiosError(error)) {
      const retryAfter = error.response?.headers?.['retry-after']
      const parsedRetryAfter = this.parseRetryAfter(retryAfter)
      if (parsedRetryAfter !== null) {
        return Math.min(parsedRetryAfter, this.maxRetryDelayMs)
      }
    }

    const exponential = this.baseRetryDelayMs * 2 ** attempt
    const jitter = Math.floor(Math.random() * 1000)
    return Math.min(exponential + jitter, this.maxRetryDelayMs)
  }

  private parseRetryAfter(value: unknown): number | null {
    const header = Array.isArray(value) ? value[0] : value
    if (typeof header !== 'string') return null

    const seconds = Number(header)
    if (Number.isFinite(seconds)) {
      return Math.max(0, seconds * 1000)
    }

    const dateMs = Date.parse(header)
    if (Number.isFinite(dateMs)) {
      return Math.max(0, dateMs - Date.now())
    }

    return null
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const marketApiClient = new MarketApiClient()
