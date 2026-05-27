import { prisma } from '~/server/utils/prisma'
import { requireAdmin } from '~/server/utils/guards'
import { schedulerService } from '@albion-tool/queue'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const defaultSchedules = [
    {
      name: 'albion-import-full',
      label: 'Albion Import (Full)',
      cron: '0 3 * * *',
      target: 'albion-import',
      options: { type: 'FULL' },
      enabled: true
    },
    {
      name: 'albion-market-sync',
      label: 'Market Price Sync',
      cron: '0 * * * *',
      target: 'albion-market',
      options: { skipHistory: true },
      enabled: true
    },
    {
      name: 'albion-market-history-sync',
      label: 'Market History Sync',
      cron: '0 4 * * *',
      target: 'albion-market',
      options: { skipHistory: false },
      enabled: true
    },
    {
      name: 'albion-import-partial',
      label: 'Albion Import (Partial)',
      cron: '0 4 * * *',
      target: 'albion-import',
      options: { type: 'PARTIAL_ITEMS' },
      enabled: false
    },
    {
      name: 'albion-pvp-sync',
      label: 'PvP Combat Events Sync',
      cron: '*/5 * * * *',
      target: 'pvp-sync',
      options: {},
      enabled: true
    },
    {
      name: 'albion-pvp-historical-sync',
      label: 'PvP Combat Events Historical Aggregator',
      cron: '0 2 * * *',
      target: 'pvp-historical-sync',
      options: {},
      enabled: true
    }
  ]

  const results = []
  for (const s of defaultSchedules) {
    const schedule = await prisma.jobSchedule.upsert({
      where: { name: s.name },
      update: {
        label: s.label,
        cron: s.cron,
        target: s.target,
        options: s.options,
        enabled: s.enabled
      },
      create: s
    })
    await schedulerService.upsertSchedule(schedule.name)
    results.push(schedule)
  }

  return { data: results }
})
