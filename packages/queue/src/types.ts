export type ImportJobType =
  | 'FULL'
  | 'PARTIAL_ITEMS'
  | 'PARTIAL_RECIPES'
  | 'PARTIAL_SPELLS'
  | 'ICONS_SYNC'
  | 'REINDEX'

export interface ImportJobData {
  jobId: string       // = ID du ImportJob en DB (aussi utilisé comme BullMQ jobId)
  type: ImportJobType
  triggeredById?: string
}

export interface ImportJobResult {
  itemsProcessed: number
  itemsCreated: number
  itemsUpdated: number
  itemsSkipped: number
  itemsFailed: number
  durationMs: number
}

export interface ImportJobProgress {
  phase: 'fetching' | 'normalizing' | 'categories' | 'importing' | 'localizations' | 'variants' | 'buildings' | 'recipes' | 'refining' | 'spells' | 'item_spells' | 'loottables' | 'done'
  processed: number
  total: number
  percent: number
}

// ══════════════════════════════════════════════════════════════
// MARKET JOBS
// ══════════════════════════════════════════════════════════════

export type MarketJobType = 'FULL' | 'BATCH' | 'PRIORITY'

export interface MarketJobItem {
  id: string
  uniqueName: string
  enchantmentLevel?: number
}

export interface MarketJobData {
  jobId: string
  type: MarketJobType
  items?: MarketJobItem[]
  locations?: string[]
  qualities?: number[]
  triggeredById?: string
  skipHistory?: boolean
}

export interface MarketJobResult {
  itemsRequested: number
  itemsProcessed: number
  itemsUpdated: number
  itemsFailed: number
  durationMs: number
}

export interface MarketJobProgress {
  processed: number
  updated: number
  failed: number
  total: number
}

// ══════════════════════════════════════════════════════════════
// ISLAND JOBS
// ══════════════════════════════════════════════════════════════

export interface IslandJobData {
  islandId?: string // Optional: if provided, check only one island. Else check all.
  plotId?: string   // Optional: check only one plot.
}

export interface IslandJobResult {
  plotsChecked: number
  harvestsReady: number
  notificationsSent: number
}
