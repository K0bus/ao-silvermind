import { prisma } from '@albion-tool/database'
import { runImport } from './run-import.js'

async function main() {
  console.log('=== Albion SilverMind — Full Import ===')

  const job = await prisma.importJob.create({
    data: {
      type: 'FULL',
      status: 'RUNNING',
      startedAt: new Date(),
    },
  })

  try {
    const result = await runImport(job.id, 'FULL', (p) => {
      process.stdout.write(`\r[${p.phase.padEnd(12)}] ${String(p.processed).padStart(6)}/${p.total} (${String(p.percent).padStart(3)}%)`)
    })

    console.log(`\n\n=== Import completed in ${(result.durationMs / 1000).toFixed(1)}s ===`)
    console.log(`Created: ${result.itemsCreated} | Updated: ${result.itemsUpdated} | Skipped: ${result.itemsSkipped} | Failed: ${result.itemsFailed}`)
  } catch (err) {
    console.error('\nImport failed:', err)
    process.exit(1)
  }
}

main().finally(() => prisma.$disconnect())
