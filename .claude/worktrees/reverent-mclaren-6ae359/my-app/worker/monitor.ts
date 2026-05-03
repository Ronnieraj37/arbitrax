/**
 * EC2 Position Monitor Worker
 *
 * Runs as a standalone process, polls every 1 second for stop-loss/take-profit triggers.
 * Uses in-memory sorted structures for O(1) price matching.
 *
 * Usage: npx tsx worker/monitor.ts
 */

import { PrismaClient } from '@prisma/client';
import { ClobClient, Side, OrderType } from '@polymarket/clob-client';
import { Wallet } from 'ethers';
import axios from 'axios';

// Load env
import 'dotenv/config';

const prisma = new PrismaClient();

const HOST = 'https://clob.polymarket.com';
const CHAIN_ID = 137;
const SIGNATURE_TYPE = 2;

// ─── Types ────────────────────────────────────────────────────────
interface ActivePosition {
  tradeId: string;
  botId: string;
  userId: string;
  tokenId: string;
  marketSlug: string;
  entryPrice: number;
  shares: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  encryptedPrivateKey: string;
  funderAddress: string;
}

// ─── In-memory state ──────────────────────────────────────────────
const positions = new Map<string, ActivePosition>(); // tradeId -> Position
const tokenPositions = new Map<string, Set<string>>(); // tokenId -> Set<tradeId>
const clientCache = new Map<string, { client: ClobClient; cachedAt: number }>();
const CLIENT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ─── Helpers ──────────────────────────────────────────────────────

function decrypt(encryptedText: string): string {
  const crypto = require('crypto');
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function getClobClient(encryptedKey: string, funderAddress: string): Promise<ClobClient> {
  const cacheKey = `${funderAddress}`;
  const cached = clientCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CLIENT_CACHE_TTL) {
    return cached.client;
  }

  const privateKey = decrypt(encryptedKey);
  const signer = new Wallet(privateKey);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const temp = new ClobClient(HOST, CHAIN_ID, signer as any);
  const creds = await temp.createOrDeriveApiKey();
  const client = new ClobClient(HOST, CHAIN_ID, signer as any, creds, SIGNATURE_TYPE, funderAddress);
  /* eslint-enable @typescript-eslint/no-explicit-any */
  clientCache.set(cacheKey, { client, cachedAt: Date.now() });
  return client;
}

async function getBatchPrices(tokenIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (tokenIds.length === 0) return result;

  try {
    const payload = tokenIds.map((id) => ({ token_id: id, side: 'SELL' }));
    const response = await axios.post(`${HOST}/prices`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });
    const data = response.data;
    for (const id of tokenIds) {
      const price = parseFloat(data?.[id]?.SELL || '0');
      if (price > 0) result.set(id, price);
    }
  } catch (err) {
    console.error('[monitor] Price fetch error:', (err as Error).message);
  }
  return result;
}

// ─── Core Logic ───────────────────────────────────────────────────

async function loadPositions() {
  const activeTrades = await prisma.trade.findMany({
    where: {
      status: 'FILLED',
      side: 'BUY',
      shares: { gt: 0 },
    },
    include: {
      bot: { include: { config: true } },
    },
  });

  const newPositions = new Set<string>();

  for (const trade of activeTrades) {
    if (!trade.bot?.config?.encryptedPrivateKey || !trade.bot?.config?.funderAddress) continue;

    const config = trade.bot.config;
    const stopLossPrice = trade.price * (1 - config.stopLossPct / 100);
    const takeProfitPrice = trade.price * (1 + config.takeProfitPct / 100);

    const pos: ActivePosition = {
      tradeId: trade.id,
      botId: trade.botId!,
      userId: trade.userId,
      tokenId: trade.tokenId,
      marketSlug: trade.marketSlug,
      entryPrice: trade.price,
      shares: trade.shares!,
      stopLossPrice,
      takeProfitPrice,
      encryptedPrivateKey: config.encryptedPrivateKey!,
      funderAddress: config.funderAddress!,
    };

    positions.set(trade.id, pos);
    newPositions.add(trade.id);

    if (!tokenPositions.has(trade.tokenId)) {
      tokenPositions.set(trade.tokenId, new Set());
    }
    tokenPositions.get(trade.tokenId)!.add(trade.id);
  }

  // Clean up positions no longer active
  for (const [tradeId, pos] of positions) {
    if (!newPositions.has(tradeId)) {
      positions.delete(tradeId);
      tokenPositions.get(pos.tokenId)?.delete(tradeId);
      if (tokenPositions.get(pos.tokenId)?.size === 0) {
        tokenPositions.delete(pos.tokenId);
      }
    }
  }

  return positions.size;
}

async function executeSell(pos: ActivePosition, currentPrice: number, reason: 'STOP_LOSS' | 'TAKE_PROFIT') {
  try {
    const client = await getClobClient(pos.encryptedPrivateKey, pos.funderAddress);

    // Try to execute sell
    const response = await client.createAndPostMarketOrder(
      { tokenID: pos.tokenId, amount: pos.shares, side: Side.SELL },
      undefined,
      OrderType.FAK
    );

    const pnl = (currentPrice - pos.entryPrice) * pos.shares;
    const pnlPct = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100;

    console.log(
      `[${reason}] ${pos.marketSlug} | Entry: ${pos.entryPrice.toFixed(4)} | Exit: ${currentPrice.toFixed(4)} | PnL: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(4)} (${pnlPct.toFixed(2)}%) | Shares: ${pos.shares.toFixed(4)}`
    );

    // Update trade in DB
    await prisma.trade.update({
      where: { id: pos.tradeId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closePrice: currentPrice,
        pnl,
        pnlPct,
      },
    });

    // Remove from memory
    positions.delete(pos.tradeId);
    tokenPositions.get(pos.tokenId)?.delete(pos.tradeId);

    return true;
  } catch (err) {
    console.error(`[${reason}] Failed for ${pos.tradeId}:`, (err as Error).message);
    return false;
  }
}

async function checkPricesAndExecute() {
  const uniqueTokenIds = Array.from(tokenPositions.keys());
  if (uniqueTokenIds.length === 0) return;

  const prices = await getBatchPrices(uniqueTokenIds);
  const sellPromises: Promise<boolean>[] = [];

  for (const [tokenId, tradeIds] of tokenPositions) {
    const currentPrice = prices.get(tokenId);
    if (!currentPrice) continue;

    for (const tradeId of tradeIds) {
      const pos = positions.get(tradeId);
      if (!pos) continue;

      // Check stop loss
      if (currentPrice <= pos.stopLossPrice) {
        sellPromises.push(executeSell(pos, currentPrice, 'STOP_LOSS'));
      }
      // Check take profit
      else if (currentPrice >= pos.takeProfitPrice) {
        sellPromises.push(executeSell(pos, currentPrice, 'TAKE_PROFIT'));
      }
    }
  }

  if (sellPromises.length > 0) {
    const results = await Promise.allSettled(sellPromises);
    const succeeded = results.filter((r) => r.status === 'fulfilled' && r.value).length;
    const failed = results.length - succeeded;
    if (failed > 0) console.log(`[monitor] Executed ${succeeded}, failed ${failed}`);
  }
}

// ─── Main Loop ────────────────────────────────────────────────────

let syncCounter = 0;
const SYNC_INTERVAL = 30; // Re-sync from DB every 30 seconds
const POLL_INTERVAL = 1000; // Check prices every 1 second

async function tick() {
  syncCounter++;

  // Re-sync positions from DB every SYNC_INTERVAL seconds
  if (syncCounter % SYNC_INTERVAL === 0 || syncCounter === 1) {
    const count = await loadPositions();
    if (syncCounter === 1 || syncCounter % 300 === 0) {
      console.log(`[monitor] Tracking ${count} active positions across ${tokenPositions.size} tokens`);
    }
  }

  // Check prices and execute SL/TP
  await checkPricesAndExecute();
}

async function main() {
  console.log('═'.repeat(60));
  console.log('  Arbitrax Position Monitor Worker');
  console.log('═'.repeat(60));
  console.log(`  Poll interval: ${POLL_INTERVAL}ms`);
  console.log(`  DB sync interval: ${SYNC_INTERVAL}s`);
  console.log(`  Database: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@')}`);
  console.log('═'.repeat(60));

  // Initial load
  const count = await loadPositions();
  console.log(`[monitor] Loaded ${count} active positions`);

  // Start polling
  setInterval(async () => {
    try {
      await tick();
    } catch (err) {
      console.error('[monitor] Tick error:', (err as Error).message);
    }
  }, POLL_INTERVAL);
}

main().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
