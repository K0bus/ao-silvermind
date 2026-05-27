import { prisma } from '@albion-tool/database'
import { schedulerService } from '@albion-tool/queue'

async function seed() {
  const schedules = [
    {
      name: 'albion-import-full',
      label: 'Albion Import (Full)',
      cron: '0 3 * * *', // Every day at 3 AM
      target: 'albion-import',
      options: { type: 'FULL' },
      enabled: true
    },
    {
      name: 'albion-market-sync',
      label: 'Market Price Sync',
      cron: '0 * * * *', // Every hour
      target: 'albion-market',
      options: { skipHistory: true },
      enabled: true
    },
    {
      name: 'albion-market-history-sync',
      label: 'Market History Sync',
      cron: '0 4 * * *', // Every day at 4 AM
      target: 'albion-market',
      options: { skipHistory: false },
      enabled: true
    },
    {
      name: 'albion-pvp-sync',
      label: 'PvP Combat Events Sync',
      cron: '*/5 * * * *', // Every 5 minutes
      target: 'pvp-sync',
      options: {},
      enabled: true
    },
    {
      name: 'albion-pvp-historical-sync',
      label: 'PvP Combat Events Historical Aggregator',
      cron: '0 2 * * *', // Every day at 2 AM
      target: 'pvp-historical-sync',
      options: {},
      enabled: true
    }
  ]

  for (const s of schedules) {
    await prisma.jobSchedule.upsert({
      where: { name: s.name },
      update: {
        label: s.label,
        cron: s.cron,
        target: s.target,
        options: s.options,
      },
      create: s
    })
    console.log(`Seeded schedule: ${s.name}`)
    await schedulerService.upsertSchedule(s.name)
  }
}

seed().catch(console.error).finally(() => prisma.$disconnect())
