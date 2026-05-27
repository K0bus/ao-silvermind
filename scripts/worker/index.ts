import { prisma } from '@albion-tool/database'
import { 
  Worker, 
  IMPORT_QUEUE_NAME, 
  MARKET_QUEUE_NAME, 
  SCHEDULER_QUEUE_NAME, 
  ISLAND_QUEUE_NAME,
  getConnection,
  closeAllConnections, 
  getImportQueue, 
  getIslandQueue,
  schedulerService,
  sendDiscordNotification,
  sendDiscordTextMessage
} from '@albion-tool/queue'
import type { ImportJobData, ImportJobProgress, ImportJobResult, MarketJobData, MarketJobResult, MarketJobItem, MarketJobProgress, IslandJobData, IslandJobResult } from '@albion-tool/queue'
import { runImport } from '../import/run-import.js'
import { runMarketSync } from '../import/run-market-sync.js'
import { marketPriceService, getTopProfitHighlight } from '@albion-tool/market-engine'

// ══════════════════════════════════════════════════════════════
// IMPORT WORKER
// ══════════════════════════════════════════════════════════════

const importWorker = new Worker<ImportJobData, ImportJobResult>(
  IMPORT_QUEUE_NAME,
  async (job) => {
    const { jobId, type } = job.data

    await prisma.importJob.update({
      where: { id: jobId },
      data: { status: 'RUNNING', startedAt: new Date() },
    })

    return runImport(jobId, type, async (progress: ImportJobProgress) => {
      await job.updateProgress(progress)
    })
  },
  {
    connection: getConnection(),
    concurrency: 1,
  },
)

// ══════════════════════════════════════════════════════════════
// MARKET WORKER
// ══════════════════════════════════════════════════════════════

const marketWorker = new Worker<MarketJobData, MarketJobResult>(
  MARKET_QUEUE_NAME,
  async (job) => {
    const { jobId, items, locations, qualities, skipHistory } = job.data

    if (!items || items.length === 0) {
      return { itemsRequested: 0, itemsProcessed: 0, itemsUpdated: 0, itemsFailed: 0, durationMs: 0 }
    }

    const start = Date.now()
    try {
      const result = await marketPriceService.syncMarketPrices({
        items,
        locations,
        qualities,
        jobId,
        skipHistory,
        onProgress: async (progress: MarketJobProgress) => {
          await job.updateProgress(progress)
        }
      })

      return {
        itemsRequested: items.length,
        itemsProcessed: items.length,
        itemsUpdated: result.itemsUpdated,
        itemsFailed: result.itemsFailed,
        durationMs: Date.now() - start,
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error(`[market-worker] Batch failed for jobId ${jobId}: ${errorMsg}`)

      if (jobId) {
        try {
          const currentJob = await prisma.marketSyncJob.findUnique({
            where: { id: jobId },
            select: { errorMessage: true }
          })
          const nextErrorMessage = currentJob?.errorMessage
            ? `${currentJob.errorMessage}\nBatch error: ${errorMsg}`
            : `Batch error: ${errorMsg}`

          await prisma.marketSyncJob.update({
            where: { id: jobId },
            data: {
              itemsFailed: { increment: items.length },
              itemsProcessed: { increment: items.length },
              errorMessage: nextErrorMessage.slice(0, 5000), // Prevent infinite growth
            }
          })
        } catch (dbErr) {
          console.error(`[market-worker] Failed to update MarketSyncJob error status:`, dbErr)
        }
      }

      throw err // Rethrow to mark the BullMQ job as failed
    }
  },
  {
    connection: getConnection(),
    concurrency: 10, // Many jobs can be active, but limited by rate limiter
    limiter: {
      max: 300, // Albion Data Project limit: 300 requests
      duration: 300000, // per 5 minutes (also stays under 180/min)
    },
  },
)

// ══════════════════════════════════════════════════════════════
// SCHEDULER WORKER
// ══════════════════════════════════════════════════════════════

const schedulerWorker = new Worker(
  SCHEDULER_QUEUE_NAME,
  async (job) => {
    const { target, options = {} } = (job.data as any) || {}
    const name = job.name

    console.log(`[scheduler-worker] Triggering scheduled job: ${name} (target: ${target})`, options)

    if (target === 'albion-import') {
      const type = options.type || 'FULL'
      const dbJob = await prisma.importJob.create({
        data: {
          type,
          status: 'PENDING',
        }
      })
      await getImportQueue().add(`import-${dbJob.id}`, { jobId: dbJob.id, type })
    } 
    else if (target === 'albion-market') {
      await runMarketSync(options)
    }
    else if (target === 'pvp-sync') {
      console.log('[scheduler-worker] Syncing global PvP events...')
      try {
        const response = await fetch('https://gameinfo-ams.albiononline.com/api/gameinfo/events?limit=50&offset=0')
        if (response.ok) {
          const events = await response.json() as any[]
          const { saveKillEvents } = await import('@albion-tool/database')
          await saveKillEvents(events)
          console.log(`[scheduler-worker] Successfully synced ${events.length} PvP events.`)
        } else {
          console.error(`[scheduler-worker] Failed to fetch PvP events: status ${response.status}`)
        }
      } catch (err) {
        console.error('[scheduler-worker] Error during PvP events sync:', err)
      }
    }
    else if (target === 'pvp-historical-sync') {
      console.log('[scheduler-worker] Starting PvP historical events aggregation...')
      const limit = 50
      let successfullySaved = 0
      
      // Fetch 20 pages of combats going back in history (1000 combats total)
      for (let page = 0; page < 20; page++) {
        const offset = page * limit
        console.log(`[scheduler-worker] Fetching PvP events offset=${offset}...`)
        try {
          const response = await fetch(`https://gameinfo-ams.albiononline.com/api/gameinfo/events?limit=${limit}&offset=${offset}`)
          if (response.ok) {
            const events = await response.json() as any[]
            if (events && events.length > 0) {
              const { saveKillEvents } = await import('@albion-tool/database')
              await saveKillEvents(events)
              successfullySaved += events.length
              console.log(`[scheduler-worker] Page ${page} synced: ${events.length} events processed.`)
              
              // Small delay to be polite to the official Albion API
              await new Promise(resolve => setTimeout(resolve, 500))
            } else {
              console.log(`[scheduler-worker] Page ${page} returned 0 events. Stopping historical sync.`)
              break
            }
          } else {
            console.error(`[scheduler-worker] Page ${page} failed: status ${response.status}`)
            break
          }
        } catch (err) {
          console.error(`[scheduler-worker] Page ${page} threw error:`, err)
          break
        }
      }
      console.log(`[scheduler-worker] PvP historical sync complete. Processed ${successfullySaved} events.`)
    }

    // Update last run in DB
    await prisma.jobSchedule.updateMany({
      where: { name },
      data: { lastRunAt: new Date() }
    })
  },
  {
    connection: getConnection(),
    concurrency: 1,
  }
)

// ══════════════════════════════════════════════════════════════
// ISLAND WORKER
// ══════════════════════════════════════════════════════════════

const islandWorker = new Worker<IslandJobData, IslandJobResult>(
  ISLAND_QUEUE_NAME,
  async (job) => {
    const { islandId, plotId } = job.data
    let plotsChecked = 0
    let harvestsReady = 0
    let notificationsSent = 0

    // Find plots that are ready to harvest
    const plots = await prisma.plot.findMany({
      where: {
        id: plotId,
        islandId,
        AND: [
          { plantedAt: { not: null } },
          { plantedAt: { lte: new Date(Date.now() - 22 * 60 * 60 * 1000) } }
        ]
      },
      include: {
        island: { include: { user: true } },
        item: true
      }
    })

    for (const plot of plots) {
      plotsChecked++
      harvestsReady++
      
      // Send notification if it hasn't been sent yet (we should track this in DB)
      // For now, let's just send it
      await sendDiscordNotification({
        title: `🌾 Harvest Ready on ${plot.island.name}!`,
        description: `Your **${plot.plantedItemId}** is ready to be harvested at position ${plot.position + 1}.`,
        color: 0x84cc16, // Lime
        fields: [
          { name: 'Island', value: plot.island.name, inline: true },
          { name: 'Position', value: (plot.position + 1).toString(), inline: true },
        ]
      })
      notificationsSent++
    }

    return { plotsChecked, harvestsReady, notificationsSent }
  },
  {
    connection: getConnection(),
    concurrency: 2,
  }
)

// ══════════════════════════════════════════════════════════════
// EVENT HANDLERS
// ══════════════════════════════════════════════════════════════

importWorker.on('completed', async (job, result) => {
  console.log(`[import-worker] Job ${job.id} completed — ${result.itemsProcessed} items in ${(result.durationMs / 1000).toFixed(1)}s`)

  await sendDiscordTextMessage(
    `🔄 **[System Log] Import completed: ${job.data.type}**\n` +
    `• **Items Processed:** ${result.itemsProcessed.toLocaleString()}\n` +
    `• **Created:** ${result.itemsCreated.toLocaleString()}\n` +
    `• **Updated:** ${result.itemsUpdated.toLocaleString()}\n` +
    `• **Duration:** ${(result.durationMs / 1000).toFixed(1)}s`
  )
})

importWorker.on('failed', (job, err) => {
  console.error(`[import-worker] Job ${job?.id} failed:`, err.message)
})

async function checkAndCompleteMarketSyncJob(jobId: string) {
  const dbJob = await prisma.marketSyncJob.findUnique({
    where: { id: jobId },
    select: {
      status: true,
      itemsUpdated: true,
      itemsFailed: true,
      itemsRequested: true,
      itemsProcessed: true,
      startedAt: true,
      errorMessage: true,
    },
  })

  if (!dbJob) return

  if (dbJob.status === 'RUNNING' && dbJob.itemsProcessed >= dbJob.itemsRequested) {
    let finalStatus: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED' = 'SUCCESS'
    if (dbJob.itemsFailed === dbJob.itemsRequested) {
      finalStatus = 'FAILED'
    } else if (dbJob.itemsFailed > 0) {
      finalStatus = 'PARTIAL_SUCCESS'
    }

    const updated = await prisma.marketSyncJob.updateMany({
      where: { id: jobId, status: 'RUNNING' },
      data: {
        status: finalStatus,
        completedAt: new Date(),
        durationMs: dbJob.startedAt ? Date.now() - dbJob.startedAt.getTime() : null,
      },
    })

    if (updated.count === 1) {
      const duration = dbJob.startedAt ? Date.now() - dbJob.startedAt.getTime() : 0
      console.log(`[market-worker] Sync job ${jobId} finished with status ${finalStatus} (${dbJob.itemsUpdated} updated, ${dbJob.itemsFailed} failed)`)

      const statusEmoji = finalStatus === 'SUCCESS' ? '📊' : finalStatus === 'PARTIAL_SUCCESS' ? '⚠️' : '❌'

      await sendDiscordTextMessage(
        `${statusEmoji} **[System Log] Market Sync Finished (${finalStatus.replace('_', ' ')})**\n` +
        `• **Total Requested:** ${dbJob.itemsRequested.toLocaleString()}\n` +
        `• **Updated:** ${dbJob.itemsUpdated.toLocaleString()}\n` +
        `• **Failed:** ${dbJob.itemsFailed.toLocaleString()}\n` +
        `• **Duration:** ${(duration / 1000).toFixed(0)}s` +
        (dbJob.errorMessage ? `\n• **Errors:** \n\`\`\`\n${dbJob.errorMessage.slice(0, 1000)}\n\`\`\`` : '')
      )

      if (finalStatus !== 'FAILED') {
        // Send Highlight Notification if a second URL is defined
        const highlight = await getTopProfitHighlight()
        if (highlight) {
          const lastSentConfig = await prisma.systemConfig.findUnique({
            where: { key: 'last_sent_top_profit_item' }
          })
          const lastSentUniqueName = lastSentConfig?.value as string | undefined

          if (lastSentUniqueName === highlight.uniqueName) {
            console.log(`[market-worker] Top profit item (${highlight.uniqueName}) has not changed. Skipping Discord notification.`)
          } else {
            const publicUrlConfig = await prisma.systemConfig.findUnique({
              where: { key: 'public_app_url' }
            })
            const publicUrl = publicUrlConfig?.value as string | undefined
            const itemUrl = publicUrl ? `${publicUrl}/items/${highlight.uniqueName}` : undefined

            await sendDiscordNotification({
              title: `💎 Opportunity of the Moment: ${highlight.name}`,
              description: `An exceptional opportunity was detected in **${highlight.city}**!${itemUrl ? `\n\n[🔗 View Item on Albion SilverMind](${itemUrl})` : ''}`,
              url: itemUrl,
              color: 0xf59e0b, // Gold/Amber
              image: highlight.iconUrl ? { url: highlight.iconUrl } : undefined,
              fields: [
                { name: 'Estimated Profit', value: `${Math.round(highlight.profit).toLocaleString()} silver`, inline: true },
                { name: 'Profit Margin', value: `${highlight.margin.toFixed(1)}%`, inline: true },
                { name: 'Production Cost', value: `${Math.round(highlight.cost).toLocaleString()} silver`, inline: true },
              ]
            }, 'discord_market_highlight_webhook_url')

            // Update the last sent top profit item in SystemConfig
            await prisma.systemConfig.upsert({
              where: { key: 'last_sent_top_profit_item' },
              update: { value: highlight.uniqueName },
              create: { key: 'last_sent_top_profit_item', value: highlight.uniqueName }
            })
          }
        }
      }
    }
  }
}

marketWorker.on('completed', async (job, result) => {
  const { jobId } = job.data
  if (!jobId) return

  // Read current counters to evaluate completion and compute duration
  const dbJob = await prisma.marketSyncJob.findUnique({
    where: { id: jobId },
    select: { status: true, itemsUpdated: true, itemsFailed: true, itemsRequested: true, itemsProcessed: true, startedAt: true },
  })

  if (dbJob) {
    const progressPercent = ((dbJob.itemsProcessed / dbJob.itemsRequested) * 100).toFixed(1)
    console.log(`[market-worker] [Sync ${jobId.slice(-6)}] Batch ${job.id} done: ${result.itemsUpdated} items (${progressPercent}% — ${dbJob.itemsProcessed}/${dbJob.itemsRequested})`)
  }

  await checkAndCompleteMarketSyncJob(jobId)
})

marketWorker.on('failed', async (job, err) => {
  console.error(`[market-worker] Job ${job?.id} failed:`, err.message)
  
  const jobId = job?.data?.jobId
  if (jobId) {
    await checkAndCompleteMarketSyncJob(jobId)
  }
})

async function shutdown() {
  console.log('[worker] Shutting down gracefully...')
  await importWorker.close()
  await marketWorker.close()
  await schedulerWorker.close()
  await islandWorker.close()
  await closeAllConnections()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

console.log(`[worker] Listening on queue "${IMPORT_QUEUE_NAME}"`)
console.log(`[worker] Listening on queue "${MARKET_QUEUE_NAME}"`)
console.log(`[worker] Listening on queue "${SCHEDULER_QUEUE_NAME}"`)
console.log(`[worker] Listening on queue "${ISLAND_QUEUE_NAME}"`)

// Initialize schedules on start
schedulerService.syncSchedules().then(() => {
  console.log('[worker] Schedules synchronized with BullMQ')
}).catch(err => {
  console.error('[worker] Failed to sync schedules:', err)
})
