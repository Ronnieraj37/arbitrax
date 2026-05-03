-- CreateEnum
CREATE TYPE "Asset" AS ENUM ('BTC', 'ETH');

-- CreateEnum
CREATE TYPE "MarketTimeframe" AS ENUM ('M15', 'H1', 'H4', 'D1');

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "asset" "Asset" NOT NULL,
    "timeframe" "MarketTimeframe" NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT,
    "startTs" INTEGER NOT NULL,
    "endTs" INTEGER NOT NULL,
    "yesTokenId" TEXT,
    "noTokenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenPricePoint" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "t" INTEGER NOT NULL,
    "p" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TokenPricePoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketFeature" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "minYes" DOUBLE PRECISION,
    "maxYes" DOUBLE PRECISION,
    "endYes" DOUBLE PRECISION,

    CONSTRAINT "MarketFeature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Market_slug_key" ON "Market"("slug");

-- CreateIndex
CREATE INDEX "Market_asset_timeframe_startTs_idx" ON "Market"("asset", "timeframe", "startTs");

-- CreateIndex
CREATE INDEX "Market_asset_timeframe_endTs_idx" ON "Market"("asset", "timeframe", "endTs");

-- CreateIndex
CREATE INDEX "TokenPricePoint_marketId_t_idx" ON "TokenPricePoint"("marketId", "t");

-- CreateIndex
CREATE UNIQUE INDEX "TokenPricePoint_tokenId_t_key" ON "TokenPricePoint"("tokenId", "t");

-- CreateIndex
CREATE UNIQUE INDEX "MarketFeature_marketId_key" ON "MarketFeature"("marketId");

-- AddForeignKey
ALTER TABLE "TokenPricePoint" ADD CONSTRAINT "TokenPricePoint_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketFeature" ADD CONSTRAINT "MarketFeature_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;
