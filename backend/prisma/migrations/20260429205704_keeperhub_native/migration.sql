/*
  Warnings:

  - The values [DELEGATED] on the enum `TradeStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `keeperhubWebhookUrl` on the `Bot` table. All the data in the column will be lost.
  - You are about to drop the column `publishedAt` on the `Bot` table. All the data in the column will be lost.
  - You are about to drop the `ApiKey` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BotConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `KeeperhubAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkflowToken` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[keeperhubWorkflowId]` on the table `Bot` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[keeperhubExecutionId]` on the table `Trade` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TradeStatus_new" AS ENUM ('PENDING', 'FILLED', 'PARTIALLY_FILLED', 'FAILED', 'CANCELLED', 'CLOSED');
ALTER TABLE "public"."Trade" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Trade" ALTER COLUMN "status" TYPE "TradeStatus_new" USING ("status"::text::"TradeStatus_new");
ALTER TYPE "TradeStatus" RENAME TO "TradeStatus_old";
ALTER TYPE "TradeStatus_new" RENAME TO "TradeStatus";
DROP TYPE "public"."TradeStatus_old";
ALTER TABLE "Trade" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_botId_fkey";

-- DropForeignKey
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_userId_fkey";

-- DropForeignKey
ALTER TABLE "BotConfig" DROP CONSTRAINT "BotConfig_botId_fkey";

-- DropForeignKey
ALTER TABLE "KeeperhubAccount" DROP CONSTRAINT "KeeperhubAccount_userId_fkey";

-- AlterTable
ALTER TABLE "Bot" DROP COLUMN "keeperhubWebhookUrl",
DROP COLUMN "publishedAt";

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "keeperhubExecutionId" TEXT,
ADD COLUMN     "keeperhubRunId" TEXT,
ADD COLUMN     "paper" BOOLEAN NOT NULL DEFAULT true;

-- DropTable
DROP TABLE "ApiKey";

-- DropTable
DROP TABLE "BotConfig";

-- DropTable
DROP TABLE "KeeperhubAccount";

-- DropTable
DROP TABLE "WorkflowToken";

-- CreateIndex
CREATE UNIQUE INDEX "Bot_keeperhubWorkflowId_key" ON "Bot"("keeperhubWorkflowId");

-- CreateIndex
CREATE INDEX "Bot_keeperhubWorkflowId_idx" ON "Bot"("keeperhubWorkflowId");

-- CreateIndex
CREATE UNIQUE INDEX "Trade_keeperhubExecutionId_key" ON "Trade"("keeperhubExecutionId");

-- CreateIndex
CREATE INDEX "Trade_keeperhubExecutionId_idx" ON "Trade"("keeperhubExecutionId");
