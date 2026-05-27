-- CreateTable
CREATE TABLE "PvpKill" (
    "id" TEXT NOT NULL,
    "eventId" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "totalVictimKillFame" INTEGER NOT NULL,
    "groupMemberCount" INTEGER NOT NULL DEFAULT 1,
    "numberOfParticipants" INTEGER NOT NULL DEFAULT 1,
    "gameplayType" TEXT NOT NULL DEFAULT 'SOLO',
    "killerId" TEXT NOT NULL,
    "killerName" TEXT NOT NULL,
    "killerGuildName" TEXT,
    "killerAllianceName" TEXT,
    "killerIp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "killerWeapon" TEXT,
    "killerWeaponFamily" TEXT,
    "killerEquipment" JSONB,
    "victimId" TEXT NOT NULL,
    "victimName" TEXT NOT NULL,
    "victimGuildName" TEXT,
    "victimAllianceName" TEXT,
    "victimIp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "victimWeapon" TEXT,
    "victimEquipment" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PvpKill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PvpKill_eventId_key" ON "PvpKill"("eventId");

-- CreateIndex
CREATE INDEX "PvpKill_killerWeapon_idx" ON "PvpKill"("killerWeapon");

-- CreateIndex
CREATE INDEX "PvpKill_killerWeaponFamily_idx" ON "PvpKill"("killerWeaponFamily");

-- CreateIndex
CREATE INDEX "PvpKill_gameplayType_idx" ON "PvpKill"("gameplayType");

-- CreateIndex
CREATE INDEX "PvpKill_timestamp_idx" ON "PvpKill"("timestamp");
