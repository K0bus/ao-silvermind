import { prisma } from '@albion-tool/database'
import { getMarketQueue } from '@albion-tool/queue'
import { marketPriceService } from '@albion-tool/market-engine'

/**
 * Triggers a full market synchronization.
 * This is the entry point for scheduled syncs or manual triggers.
 */
export async function runMarketSync(options: { triggeredById?: string; skipHistory?: boolean } = {}) {
  console.log('[market-sync] Starting full market synchronization...')
  const start = Date.now()

  // 1. Plan the sync (chunk items)
  const { jobId, chunks, totalItems } = await marketPriceService.planFullSync(options)
  console.log(`[market-sync] Planned sync for ${totalItems} items across ${chunks.length} batches (jobId: ${jobId})`)

  // 2. Update Job to RUNNING
  await prisma.marketSyncJob.update({
    where: { id: jobId },
    data: { 
      status: 'RUNNING', 
      startedAt: new Date(),
      itemsRequested: totalItems,
    }
  })

  // 3. Push batches to BullMQ
  const queue = getMarketQueue()
  
  // Each chunk carries {id, uniqueName} pairs — id for DB FK, uniqueName for the Albion API
  const jobs = chunks.map((items, index) => ({
    name: `market-sync-${jobId}-${index}`,
    data: {
      jobId,
      type: 'FULL' as const,
      items,
      skipHistory: options.skipHistory,
    },
    opts: {
      jobId: `market-${jobId}-${index}`,
    },
  }))

  await queue.addBulk(jobs)
  console.log(`[market-sync] Added ${jobs.length} jobs to queue.`)

  // Note: The parent Job in DB will be updated by individual workers as they complete batches.
  // We need a way to mark the parent Job as SUCCESS when all batches are done.
  // We can do this with BullMQ Flow or by polling, or by checking remaining jobs.
  // For now, we'll implement a simple "Check & Close" logic in the worker or a dedicated "Job Monitor".
  
  return { jobId, totalItems, totalBatches: chunks.length }
}
