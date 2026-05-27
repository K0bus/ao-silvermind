import { requireAdmin } from '~/server/utils/guards'
import { getSchedulerQueue } from '@albion-tool/queue'

export default defineEventHandler(async (event) => {
  // Enforce secure administrative authorization
  await requireAdmin(event)

  // Trigger the pvp-historical-sync worker job immediately on demand
  const queue = getSchedulerQueue()
  await queue.add('manual-pvp-historical-sync', {
    target: 'pvp-historical-sync',
    options: {}
  }, {
    jobId: `manual-pvp-historical-sync-${Date.now()}`
  })

  return { 
    data: { 
      success: true,
      message: 'PvP Historical Aggregator sync successfully triggered in the background.'
    } 
  }
})
