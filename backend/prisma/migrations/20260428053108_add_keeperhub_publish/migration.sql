-- AlterTable
ALTER TABLE "Bot" ADD COLUMN     "keeperhubWebhookUrl" TEXT,
ADD COLUMN     "keeperhubWorkflowId" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "KeeperhubAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedApiKey" TEXT NOT NULL,
    "organizationLabel" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" TIMESTAMP(3),

    CONSTRAINT "KeeperhubAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KeeperhubAccount_userId_key" ON "KeeperhubAccount"("userId");

-- AddForeignKey
ALTER TABLE "KeeperhubAccount" ADD CONSTRAINT "KeeperhubAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
