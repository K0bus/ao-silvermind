-- AlterTable
ALTER TABLE "DiscordGuildConfig" ADD COLUMN     "dailyEventChannelId" TEXT,
ADD COLUMN     "dailyEventEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dailyEventText" TEXT,
ADD COLUMN     "serverStatusMessageId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "discordAccessToken" TEXT,
ADD COLUMN     "discordId" TEXT,
ADD COLUMN     "discordRefreshToken" TEXT,
ADD COLUMN     "discordTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "discordUsername" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");
