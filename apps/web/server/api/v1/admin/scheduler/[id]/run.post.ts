import { prisma } from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/guards'
import { getSchedulerQueue } from '@albion-tool/queue'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')

  const schedule = await prisma.jobSchedule.findUnique({
    where: { id }
  })

  if (!schedule) {
    throw createError({
      statusCode: 404,
      message: 'Schedule not found'
    })
  }

  // Trigger once in BullMQ
  const queue = getSchedulerQueue()
  await queue.add(schedule.name, {
    target: schedule.target,
    options: schedule.options
  }, {
    jobId: `manual-${schedule.name}-${Date.now()}`
  })

  return { data: { success: true } }
})
