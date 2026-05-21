import { z } from 'zod'
import { requireAdmin } from '~/server/utils/guards'
import { prisma } from '~/server/utils/prisma'
import { getMarketQueue } from '@albion-tool/queue'
import { marketPriceService } from '@albion-tool/market-engine'

const schema = z.object({
  type: z.enum(['FULL', 'PRIORITY', 'BATCH']).default('FULL'),
  skipHistory: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const admin = requireAdmin(event)

  const body = await readValidatedBody(event, (b) => schema.safeParse(b))
  if (!body.success) throw createError({ statusCode: 422, statusMessage: 'Invalid input' })

  const activeJob = await prisma.marketSyncJob.findFirst({
    where: { status: { in: ['RUNNING', 'PENDING'] }, type: 'FULL' },
    select: { id: true, status: true },
  })

  if (activeJob && body.data.type === 'FULL') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message: `A full market sync is already ${activeJob.status.toLowerCase()}`,
    })
  }

  // Plan the sync
  const { jobId, chunks, totalItems } = await marketPriceService.planFullSync({
    triggeredById: admin.id,
    skipHistory: body.data.skipHistory,
  })

  // Start the job in DB — use updateMany to avoid race condition with a duplicate request
  const startResult = await prisma.marketSyncJob.updateMany({
    where: { id: jobId, status: 'PENDING' },
    data: {
      type: body.data.type,  // Propagate actual requested type
      status: 'RUNNING',
      startedAt: new Date(),
      itemsRequested: totalItems,
    },
  })

  if (startResult.count === 0) {
    throw createError({ statusCode: 409, statusMessage: 'Sync job was already started by a concurrent request' })
  }

  // Push to queue — each chunk carries {id, uniqueName} pairs for correct API + FK usage
  const queue = getMarketQueue()
  const jobs = chunks.map((items, index) => ({
    name: `market-sync-${jobId}-${index}`,
    data: {
      jobId,
      type: body.data.type,
      items,
      skipHistory: body.data.skipHistory,
    },
    opts: {
      jobId: `market-${jobId}-${index}`,
    },
  }))

  await queue.addBulk(jobs)

  return {
    data: { 
      jobId, 
      message: `Market sync job ${body.data.type} started for ${totalItems} items (${chunks.length} batches)`,
    },
  }
})
