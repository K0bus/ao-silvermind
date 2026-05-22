import { prisma } from './index'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') })
}
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '../web/.env') })
}

async function main() {
  console.log('=== Albion SilverMind — Loot Table Import Verification ===\n')

  const totalTables = await prisma.lootTable.count()
  const totalItems = await prisma.lootTableItem.count()
  console.log(`Total Loot Tables in DB: ${totalTables}`)
  console.log(`Total Loot Table Items in DB: ${totalItems}`)

  if (totalTables === 0) {
    console.error('ERROR: No loot tables found in the database. Has the import completed?')
    return
  }

  console.log('\n--- 1. Querying T1_CARROT_LOOT ---')
  const carrotLoot = await prisma.lootTable.findUnique({
    where: { id: 'T1_CARROT_LOOT' },
    include: {
      items: {
        include: {
          item: {
            select: {
              uniqueName: true,
            }
          }
        }
      }
    }
  })

  if (carrotLoot) {
    console.log(`Loot Table ID: ${carrotLoot.id}`)
    console.log(`Name: ${carrotLoot.name}`)
    console.log(`List Type: ${carrotLoot.listType}`)
    console.log('Items:')
    carrotLoot.items.forEach((item) => {
      console.log(`  - Item Unique Name: ${item.itemUniqueName} (itemId: ${item.itemId})`)
      console.log(`    Chance: ${item.chance} | Amount: ${item.amount} | Parent Type: ${item.parentType}`)
    })
  } else {
    console.log('T1_CARROT_LOOT not found!')
  }

  console.log('\n--- 2. Querying EVENT_EASTER_2020_LOOT ---')
  const easterLoot = await prisma.lootTable.findUnique({
    where: { id: 'EVENT_EASTER_2020_LOOT' },
    include: {
      items: true
    }
  })

  if (easterLoot) {
    console.log(`Loot Table ID: ${easterLoot.id}`)
    console.log('Items:')
    easterLoot.items.forEach((item) => {
      console.log(`  - Item: ${item.itemUniqueName || item.referencedLootTableId} (${item.itemUniqueName ? 'Item' : 'LootTableRef'})`)
      console.log(`    Chance: ${item.chance} | Amount: ${item.amount} | Parent Type: ${item.parentType}`)
    })
  } else {
    console.log('EVENT_EASTER_2020_LOOT not found!')
  }

  console.log('\n--- 3. Querying T1_FARM_CARROT_SEED Item and its Harvest Loot Table relation ---')
  const carrotItem = await prisma.item.findFirst({
    where: { uniqueName: 'T1_FARM_CARROT_SEED' },
    include: {
      harvestLootTable: {
        include: {
          items: true
        }
      }
    }
  })

  if (carrotItem) {
    console.log(`Item: ${carrotItem.uniqueName}`)
    console.log(`harvestLootList field: ${carrotItem.harvestLootList}`)
    if (carrotItem.harvestLootTable) {
      console.log('Relation harvestLootTable loaded successfully!')
      console.log(`Loot Table ID: ${carrotItem.harvestLootTable.id}`)
      console.log(`Drops count: ${carrotItem.harvestLootTable.items.length}`)
    } else {
      console.error('ERROR: harvestLootTable relation was NOT loaded/restored!')
    }
  } else {
    console.log('T1_CARROT Item not found!')
  }

  console.log('\n=== Verification Done ===')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
