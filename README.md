<div align="center">

# Arbitrax

**The simplest place to build, backtest, and run automated trading bots on Polymarket — without writing code, managing wallets, or knowing what a CLOB token is.**

Arbitrax is the surface. **[KeeperHub](https://github.com/keeperhub/keeperhub) is the engine.** Every bot you build in Arbitrax is a real KeeperHub workflow under the hood — KH stores it, schedules it, and executes it.

</div>

---

## Why this exists

Lots of people want to run automated bots on Polymarket 24/7, but there's no simple place to actually build one today. You either write your own webhook plumbing, key management, order routing, paper-trade harnesses, and monitoring — or you don't trade automatically. That's days of work before you ever place a single trade.

Arbitrax fills that gap for two audiences:

- **Existing TradingView traders** who already have working strategies and just want a webhook URL to point their alerts at. Arbitrax gives every bot one.
- **Non-coders** who want to drag and drop a strategy on a canvas — pick a trigger, evaluate a signal, place a trade — and have it running in two minutes.

---

## How it works (in 30 seconds)

1. Sign up.
2. Create a bot. Arbitrax provisions a KeeperHub workflow under the hood and gives the bot a webhook URL.
3. Open the editor (drag-and-drop canvas, built into Arbitrax — you never leave the app). Pick a trigger. Add steps: `Get Odds`, `Pine Evaluate`, `Place Order`, `Run Code`, `Condition`, `Send Webhook`.
4. Save. KeeperHub runs the workflow on every fire — manual click, cron schedule, or webhook POST (e.g. from a TradingView alert).
5. Paper mode is on by default. Every fill is simulated at the live market price and recorded as a trade. Flip it off when you're ready to trade real USDC on Polygon.

---

## The active-market model

Polymarket runs auto-rotating up/down markets every window. The slug pattern is fixed:

```
{btc|eth}-updown-{15m|1h|4h|1d}-{startTimestampSec}
```

The "active market" for any (asset, timeframe) is just the slug at the current floored timestamp. **Users never pick a market.** They pick `asset` (BTC / ETH) and `timeframe` (15m / 1h / 4h / 1d), and on every fire the bot computes the live slug, hits `gamma-api.polymarket.com/markets?slug=…` for token IDs, and trades.

The editor shows a live preview of the active slug + window the bot will hit *right now*, refreshing every 30 seconds, so you always know what's being targeted.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          Arbitrax                                │
│  ┌──────────────────┐    ┌─────────────────────┐                 │
│  │   Next.js app    │    │   NestJS backend    │                 │
│  │   (my-app/)      │◄──►│   (backend/)        │                 │
│  │                  │    │                     │                 │
│  │  • Editor        │    │  • Bots CRUD        │                 │
│  │  • /backtest     │    │  • Trade ingest     │                 │
│  │  • /markets      │    │  • Markets poll     │                 │
│  │  • Auth.js v5    │    │  • Stripe billing   │                 │
│  └──────────────────┘    └──────────┬──────────┘                 │
│                                     │                            │
│                                     │ KH REST API                │
└─────────────────────────────────────┼────────────────────────────┘
                                      │
                                      ▼
              ┌─────────────────────────────────────────┐
              │              KeeperHub                  │
              │       (the workflow execution engine)   │
              │                                         │
              │  • Stores workflows (nodes + edges)     │
              │  • Schedules + retries                  │
              │  • Executes plugin actions              │
              │  ─────────────────────────────────────  │
              │     plugins/zlabs-polymarket/           │
              │       • search-markets                  │
              │       • get-odds                        │
              │       • pine-evaluate                   │
              │       • voting-aggregate                │
              │       • strategy-run                    │
              │       • place-order                     │
              └─────────────────────────────────────────┘
```

**Single rule:** every bot in Arbitrax is a KeeperHub workflow. Nothing else.

When you save a bot, the editor calls `PATCH /api/bots/[id]/workflow` on the backend, which proxies `PATCH /api/workflows/{id}` to KeeperHub with the exact `{ nodes, edges }` JSON. You can verify this any time:

```bash
curl http://localhost:3100/api/workflows/{id} | jq .nodes
```

Same JSON. Arbitrax did not replicate KH's runtime — it uses it.

---

## Features

### Drag-and-drop bot editor

Built with [`@xyflow/react`](https://reactflow.dev/), styled to match the Arbitrax design tokens. Visual parity with KeeperHub's own editor (same node shapes, edge handles, smoothstep edges, auto-layout via `dagre`), but stays inside the Arbitrax app — users never leave to a separate domain.

- **Triggers:** Manual, Schedule (cron), Webhook
- **Polymarket actions:** Get Odds, Pine Evaluate, Place Order, Cancel Order, Search Markets, Order Status
- **Logic actions:** Run Code (JS), Condition
- **I/O actions:** Send Webhook
- **Auto-layout** on every change (dagre LR rank).
- **Auto-bridge on delete** — deleting a step in the middle reconnects predecessors → successors automatically.
- **Live active-market preview** — pick BTC + 15m, the editor shows `btc-updown-15m-{currentTs}` and the window range.
- **⌘S** to save. **Test run** button to fire the trigger once.

### Two ways to drive the bot

1. **In-app strategy** — build it on the canvas. Pine Evaluate fetches live Bitstamp candles for BTC/USD or ETH/USD (no API key needed) and runs your script.
2. **External alerts** — every bot has a webhook URL (`{KH}/api/workflows/{id}/webhook`). Drop it into a TradingView alert and the bot fires every time the alert does. Existing TradingView strategies need zero migration.

### Paper trading by default

All `place-order` calls run in paper mode out of the box. Each "fill" is computed at the live market price and recorded as a `Trade` row, so you get realistic P&L without risking USDC. Flip `paper: false` per step when you're ready to trade real money on Polygon.

### Backtesting

`/backtest` page accepts a CSV of TradingView trades (auto-detects columns and direction keywords), matches each signal against the actual Polymarket up/down market that was live in that window, and returns:

- Win rate, total P&L, max drawdown, Sharpe ratio
- Equity curve
- Hour-of-day and weekday analysis
- Take-profit optimization grid
- Top winners / losers

Same axes as the live bot — `(asset, timeframe)` — so a strategy that works in backtest works in production.

### Active markets browser

`/markets` shows the current Polymarket up/down markets across timeframes with live odds.

---

## Repo layout

```
zlabs/
├── my-app/                     # Next.js 16 frontend
│   ├── app/
│   │   ├── bots/               # Bot list + detail + editor
│   │   │   └── [botId]/edit/   # Drag-and-drop editor page
│   │   ├── backtest/           # Backtest UI
│   │   ├── markets/            # Markets browser
│   │   ├── dashboard/
│   │   ├── billing/            # Stripe portal
│   │   └── api/                # Thin proxies to NestJS backend
│   ├── components/
│   │   └── workflow/           # The editor
│   │       ├── workflow-canvas.tsx
│   │       ├── node-config-panel.tsx
│   │       ├── action-picker.tsx
│   │       ├── nodes/          # trigger / action / add nodes
│   │       ├── registry.ts     # Curated triggers + actions
│   │       ├── active-market.ts # Live slug computation
│   │       ├── auto-layout.ts  # Dagre LR layout
│   │       ├── serialize.ts    # KH JSON ↔ editor state
│   │       └── store.ts        # Jotai atoms
│   └── prisma/                 # Auth.js + bot pointers
│
├── backend/                    # NestJS API
│   └── src/
│       ├── bots/               # Bot CRUD + KeeperhubService
│       ├── trade-ingest/       # /v1/ingest/trade for KH workflows
│       ├── trades/             # Trade history
│       ├── markets/            # Markets data
│       ├── backtest/           # Backtest engine
│       ├── ingest/             # Market data poller
│       ├── billing/            # Stripe
│       └── auth/, user/        # Auth helpers
│
├── ref/                        # Reference Python implementation
│   ├── market_utils.py         # Slug builders for 15m/1h/4h
│   ├── polymarket_client.py    # CLOB + Gamma API client
│   └── candle_scheduler.py     # Bitstamp 60s polling loop
│
└── README.md
```

The KeeperHub fork (separate repo, sibling directory in development) holds:

```
keeperhub-fork/
└── plugins/
    └── zlabs-polymarket/       # The KH plugin we wrote
        ├── index.ts            # Plugin registration
        ├── steps/              # Action handlers (TS)
        ├── credentials.ts
        └── README.md
```

This plugin is open-source and submittable on its own — the KeeperHub team explicitly weighs standalone plugins higher than closed dependencies inside a third-party app.

---

## Getting started

### Prerequisites

- Node 22+ (LTS)
- pnpm + yarn (`npm install -g pnpm yarn`)
- PostgreSQL 16 running locally on `:5432`
- (Optional) Local KeeperHub for end-to-end paper trading — see [Local KeeperHub](#local-keeperhub) below

### One-time setup

```bash
# 1. Install deps
cd backend && yarn install
cd ../my-app && yarn install

# 2. Apply Prisma schemas
cd ../backend && npx prisma migrate dev --name keeperhub_native
cd ../my-app && npx prisma migrate dev --name keeperhub_native
```

### Environment variables

**`backend/.env`**

```env
DATABASE_URL=postgresql://localhost:5432/zlabs_backend
APP_URL=http://localhost:3000
PORT=4000

# KeeperHub — required for bot creation to work
KEEPERHUB_API_KEY=<your KH org API key>
KEEPERHUB_BASE_URL=http://localhost:3100        # local KH (recommended)
KEEPERHUB_APP_URL=http://localhost:3100
# OR for hosted KH (note: hosted has no zlabs-polymarket plugin loaded)
# KEEPERHUB_BASE_URL=https://app.keeperhub.com
# KEEPERHUB_APP_URL=https://app.keeperhub.com

# Shared secret used by KH workflows when they POST mirror events back to ZLabs
ZLABS_INGEST_SECRET=<long random string>

# Encryption key for any encrypted columns
ENCRYPTION_KEY=<64-hex-char string>
```

**`my-app/.env`**

```env
DATABASE_URL=postgresql://localhost:5432/zlabs
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000

# Auth.js v5
AUTH_TRUST_HOST=true
AUTH_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random string>

# Google OAuth
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
```

### Run

```bash
# Terminal 1 — backend on :4000
cd backend && yarn start:dev

# Terminal 2 — frontend on :3000
cd my-app && yarn dev
```

Open <http://localhost:3000>, sign in, click **Bots** → **Create**, then **Open editor →**.

### Smoke test (5 steps)

1. <http://localhost:3000> → sign in.
2. **Bots** → type a name → **Create**.
3. On the bot detail page, click **Open editor →**.
4. Trigger node should already be present. Click **+** → pick **Place order** → set BTC, 15m, UP, $10, paper=true.
5. ⌘S to save. The editor toasts "Workflow saved" and your KH workflow has the same JSON: `curl ${KEEPERHUB_BASE_URL}/api/workflows/{id} | jq`.

If save returns `503 KEEPERHUB_API_KEY not configured`, set that env var on the backend and restart.

---

## Local KeeperHub

`app.keeperhub.com` doesn't have third-party plugins loaded, so live paper trading requires running KeeperHub locally with our plugin. The KH fork lives as a sibling repo (`../keeperhub-fork/`):

```bash
cd ../keeperhub-fork
pnpm install
pnpm discover-plugins        # registers zlabs-polymarket
PORT=3100 pnpm dev           # runs KH on :3100
```

KH boots in ~5 seconds. Verify:

```bash
curl http://localhost:3100/api/health
# { "status": "ok", ... }
```

Then mint an API key from KH's settings page and paste it into `backend/.env` as `KEEPERHUB_API_KEY`. Restart the backend. Bots created from Arbitrax now run on local KH and the polymarket plugin actions will actually execute.

---

## How a bot runs (under the hood)

For a `Schedule` trigger firing every 15m on `BTC 15m, Pine Evaluate → Place Order, paper`:

1. **KH cron tick** at boundary `T`.
2. KH executes step `Pine Evaluate`:
   - Computes Bitstamp pair from `asset` → `btcusd`.
   - Fetches `lookback` candles from `https://www.bitstamp.net/api/v2/ohlc/btcusd/` for step `15m`.
   - Runs the user's Pine script in a sandboxed JS environment.
   - Outputs `{ signal: 'UP' | 'DOWN' | 'HOLD' }`.
3. KH executes step `Place Order` with the upstream signal:
   - Computes the active slug: `btc-updown-15m-{floor(T / 900) * 900}`.
   - `GET gamma-api.polymarket.com/markets?slug=…` → returns `clobTokenIds` (yes/no).
   - `POST clob.polymarket.com/prices` (4 prices in one call) → live odds.
   - Selects the YES token if `direction=UP`, NO if `direction=DOWN`.
   - **paper=true:** computes synthetic fill at the current price, marks `paper: true` on the receipt.
   - **paper=false:** signs and posts a market FOK order via py-clob-client.
4. KH calls Arbitrax's `POST /v1/ingest/trade` with the receipt (bearer-auth via `ZLABS_INGEST_SECRET`).
5. Arbitrax persists a `Trade` row keyed by `keeperhubExecutionId`. It now shows up in `/dashboard`.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 16 (Turbopack), React 19, Auth.js v5, Jotai (editor state), `@xyflow/react` (canvas), `dagre` (auto-layout), Tailwind CSS, Lucide icons |
| Backend | NestJS 11, Prisma 7, PostgreSQL 16, Stripe |
| Workflow runtime | KeeperHub (self-hosted, local) |
| Polymarket API | Gamma (markets) + CLOB (prices, orders) |
| Candle data | Bitstamp public OHLC (no API key) |

---

## API surface

### Frontend → backend

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/bots` | List user's bots |
| `POST` | `/api/bots` | Create a bot (provisions KH workflow) |
| `GET` | `/api/bots/[id]` | Get bot detail (editorUrl, webhookUrl) |
| `DELETE` | `/api/bots/[id]` | Delete bot + KH workflow |
| `POST` | `/api/bots/[id]/activate` | Toggle KH `enabled` flag |
| `POST` | `/api/bots/[id]/run` | Test-fire the trigger once |
| `GET` | `/api/bots/[id]/workflow` | Load workflow graph from KH |
| `PATCH` | `/api/bots/[id]/workflow` | Save workflow graph to KH |
| `GET` | `/api/trades` | Trade history |
| `GET` | `/api/markets` | Active markets browser |
| `POST` | `/api/backtest` | Run backtest on uploaded CSV |

### Backend ↔ KeeperHub

The backend's `KeeperhubService` is the only place that talks to KH:

```ts
class KeeperhubService {
  createWorkflow({ name, description })
  getWorkflow(workflowId)
  updateWorkflow(workflowId, { name?, description?, nodes?, edges?, enabled? })
  deleteWorkflow(workflowId, force)
  triggerWebhook(workflowId, payload)
}
```

Bot creation calls KH first; if KH is misconfigured, it fails fast with `503` and no half-created local row.

### KeeperHub → backend (mirror events)

KH workflows POST trade receipts back via `POST /v1/ingest/trade` with `Authorization: Bearer ${ZLABS_INGEST_SECRET}`. The endpoint is idempotent (upsert by `keeperhubExecutionId`).

---

## Database schema (high level)

```prisma
model Bot {
  id                  String    @id @default(cuid())
  userId              String
  name                String
  status              BotStatus @default(INACTIVE)
  keeperhubWorkflowId String?   @unique
  user   User    @relation(...)
  trades Trade[]
}

model Trade {
  id                   String   @id @default(cuid())
  botId                String
  keeperhubExecutionId String   @unique  // idempotency key
  keeperhubRunId       String?
  paper                Boolean  @default(true)
  // … side, size, marketSlug, fillPrice, pnl, etc.
}
```

The `Bot` row is intentionally a **pure pointer** — name, status, KH workflow ID. All bot logic lives in the KH workflow.

---

## Roadmap

- [ ] Open-source the `zlabs-polymarket` plugin as a standalone repo + submit PR to merge into hosted KH
- [ ] Add a "Convert TradingView strategy" wizard that ingests a TradingView script and emits an Arbitrax workflow
- [ ] Multi-asset bots (one strategy, fan-out to BTC + ETH)
- [ ] Live trading (production CLOB orders) gated behind a wallet-connect flow + per-bot risk caps
- [ ] Workflow execution log viewer inside Arbitrax (currently lives in KH)
- [ ] Marketplace of public strategies you can fork

---

## License

MIT.

---

<div align="center">

**Arbitrax is the surface. KeeperHub is the engine.**

</div>
