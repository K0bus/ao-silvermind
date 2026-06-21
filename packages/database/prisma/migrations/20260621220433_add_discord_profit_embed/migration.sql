-- AlterTable
ALTER TABLE "DiscordGuildConfig" ADD COLUMN     "profitEmbedChannelId" TEXT,
ADD COLUMN     "profitEmbedCityId" TEXT,
ADD COLUMN     "profitEmbedEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profitEmbedMessageId" TEXT;
