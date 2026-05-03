import { ClobClient, Side } from "@polymarket/clob-client";
import { Wallet } from "ethers";
import { decrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import {
  HOST,
  CHAIN_ID,
  SIGNATURE_TYPE,
  getTokenIds,
  getPrice,
  getActualPosition,
  placeOrder,
} from "./polymarket-utils";

interface ExecuteTradeParams {
  signal: "BUY" | "SELL";
  bot: { id: string; name: string };
  config: {
    encryptedPrivateKey: string | null;
    funderAddress: string | null;
    positionSizeUsd: number;
    stopLossPct: number;
    takeProfitPct: number;
    managedWallet: boolean;
  };
  userId: string;
  marketSlug: string;
}

async function initClobClient(
  encryptedPrivateKey: string,
  funderAddress: string,
): Promise<ClobClient> {
  const privateKey = decrypt(encryptedPrivateKey);
  const signer = new Wallet(privateKey);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const temp = new ClobClient(HOST, CHAIN_ID, signer as any);
  const creds = await temp.createOrDeriveApiKey();
  return new ClobClient(
    HOST,
    CHAIN_ID,
    signer as any,
    creds,
    SIGNATURE_TYPE,
    funderAddress,
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

export async function executeWebhookTrade({
  signal,
  bot,
  config,
  userId,
  marketSlug,
}: ExecuteTradeParams) {
  if (!config.encryptedPrivateKey || !config.funderAddress) {
    return { success: false, error: "Wallet not configured for this bot" };
  }

  // Get token IDs
  const tokenIds = await getTokenIds(marketSlug);
  if (!tokenIds)
    return { success: false, error: "Failed to get token IDs for market" };

  const direction = signal === "BUY" ? "UP" : "DOWN";
  const tokenId = direction === "UP" ? tokenIds.yesTokenId : tokenIds.noTokenId;

  const entryPrice = await getPrice(tokenId, "BUY");
  if (!entryPrice)
    return { success: false, error: "Failed to get entry price" };

  // Record trade as pending
  const trade = await prisma.trade.create({
    data: {
      userId,
      botId: bot.id,
      signal,
      marketSlug,
      tokenId,
      direction,
      side: "BUY",
      amount: config.positionSizeUsd,
      price: entryPrice,
      status: "PENDING",
    },
  });

  try {
    const client = await initClobClient(
      config.encryptedPrivateKey,
      config.funderAddress,
    );
    const success = await placeOrder(
      client,
      tokenId,
      Side.BUY,
      config.positionSizeUsd,
      2,
      false,
      true,
    );

    if (success) {
      // Wait for order settlement
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Try to get actual position from API
      const actualPosition = await getActualPosition(
        config.funderAddress,
        marketSlug,
        tokenId,
        3,
      );
      const shares =
        actualPosition?.shares || config.positionSizeUsd / entryPrice;
      const avgPrice = actualPosition?.avgPrice || entryPrice;

      await prisma.trade.update({
        where: { id: trade.id },
        data: {
          status: "FILLED",
          executedAt: new Date(),
          shares,
          price: avgPrice,
        },
      });

      return {
        success: true,
        trade: {
          id: trade.id,
          market: marketSlug,
          direction,
          entryPrice: avgPrice,
          shares,
          amount: config.positionSizeUsd,
          stopLoss: avgPrice * (1 - config.stopLossPct / 100),
          takeProfit: avgPrice * (1 + config.takeProfitPct / 100),
        },
      };
    } else {
      await prisma.trade.update({
        where: { id: trade.id },
        data: { status: "FAILED" },
      });
      return { success: false, error: "Order execution failed" };
    }
  } catch (error: unknown) {
    await prisma.trade.update({
      where: { id: trade.id },
      data: { status: "FAILED" },
    });
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Execution error: ${msg}` };
  }
}

export async function executeStopLossOrTakeProfit(
  trade: {
    id: string;
    tokenId: string;
    marketSlug: string;
    shares: number | null;
    price: number;
    botId: string | null;
  },
  currentPrice: number,
  reason: "STOP_LOSS" | "TAKE_PROFIT",
) {
  if (!trade.botId) return { success: false, error: "No bot associated" };

  const botConfig = await prisma.botConfig.findFirst({
    where: { botId: trade.botId },
  });
  if (!botConfig?.encryptedPrivateKey || !botConfig.funderAddress) {
    return { success: false, error: "Wallet not configured" };
  }

  const sharesToSell = trade.shares || 0;
  if (sharesToSell <= 0) {
    await prisma.trade.update({
      where: { id: trade.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closePrice: currentPrice,
      },
    });
    return { success: true, reason, shares: 0 };
  }

  try {
    const client = await initClobClient(
      botConfig.encryptedPrivateKey,
      botConfig.funderAddress,
    );
    const success = await placeOrder(
      client,
      trade.tokenId,
      Side.SELL,
      sharesToSell,
      3,
      false,
      true,
    );

    const pnl = (currentPrice - trade.price) * sharesToSell;
    const pnlPct = ((currentPrice - trade.price) / trade.price) * 100;

    await prisma.trade.update({
      where: { id: trade.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closePrice: currentPrice,
        pnl,
        pnlPct,
      },
    });

    return { success, reason, pnl, pnlPct, shares: sharesToSell };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}
