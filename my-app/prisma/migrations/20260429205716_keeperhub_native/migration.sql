/*
  Warnings:

  - You are about to drop the `ApiKey` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BotConfig` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[keeperhubWorkflowId]` on the table `Bot` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[keeperhubExecutionId]` on the table `Trade` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_botId_fkey";

-- DropForeignKey
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_userId_fkey";

-- DropForeignKey
ALTER TABLE "BotConfig" DROP CONSTRAINT "BotConfig_botId_fkey";

-- AlterTable
ALTER TABLE "Bot" ADD COLUMN     "keeperhubWorkflowId" TEXT;

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "keeperhubExecutionId" TEXT,
ADD COLUMN     "keeperhubRunId" TEXT,
ADD COLUMN     "paper" BOOLEAN NOT NULL DEFAULT true;

-- DropTable
DROP TABLE "ApiKey";

-- DropTable
DROP TABLE "BotConfig";

-- CreateIndex
CREATE UNIQUE INDEX "Bot_keeperhubWorkflowId_key" ON "Bot"("keeperhubWorkflowId");

-- CreateIndex
CREATE INDEX "Bot_keeperhubWorkflowId_idx" ON "Bot"("keeperhubWorkflowId");

-- CreateIndex
CREATE UNIQUE INDEX "Trade_keeperhubExecutionId_key" ON "Trade"("keeperhubExecutionId");

-- CreateIndex
CREATE INDEX "Trade_keeperhubExecutionId_idx" ON "Trade"("keeperhubExecutionId");
