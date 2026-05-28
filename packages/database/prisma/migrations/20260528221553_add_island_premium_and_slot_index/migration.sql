-- AlterTable
ALTER TABLE "Island" ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "IslandBuilding" ADD COLUMN     "slotIndex" INTEGER;
