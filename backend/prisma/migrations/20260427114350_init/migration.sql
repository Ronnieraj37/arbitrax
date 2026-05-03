-- CreateTable
CREATE TABLE "WorkflowToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'default',
    "scopes" TEXT NOT NULL DEFAULT 'agent:read,agent:trade',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsed" TIMESTAMP(3),

    CONSTRAINT "WorkflowToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowToken_tokenHash_key" ON "WorkflowToken"("tokenHash");

-- CreateIndex
CREATE INDEX "WorkflowToken_userId_idx" ON "WorkflowToken"("userId");
