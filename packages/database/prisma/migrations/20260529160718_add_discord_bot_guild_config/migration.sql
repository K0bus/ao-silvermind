-- CreateTable
CREATE TABLE "DiscordGuildConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "userId" TEXT NOT NULL,
    "guildId" TEXT,
    "guildName" TEXT,
    "serverConnection" TEXT NOT NULL DEFAULT 'WEST',
    "killboardEnabled" BOOLEAN NOT NULL DEFAULT false,
    "killboardChannelId" TEXT,
    "statsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "statsChannelId" TEXT,
    "statsMessageId" TEXT,
    "serverStatusEnabled" BOOLEAN NOT NULL DEFAULT false,
    "serverStatusChannelId" TEXT,
    "serverStatusRegion" TEXT NOT NULL DEFAULT 'ALL',
    "profitAlertsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "profitAlertsChannelId" TEXT,
    "profitAlertsMinMargin" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "itemSearchEnabled" BOOLEAN NOT NULL DEFAULT true,
    "craftingTreeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscordGuildConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiscordGuildConfig_userId_idx" ON "DiscordGuildConfig"("userId");

-- AddForeignKey
ALTER TABLE "DiscordGuildConfig" ADD CONSTRAINT "DiscordGuildConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
