/**
 * Curated registry of triggers and actions that ZLabs exposes in its editor.
 * Each entry maps to a KeeperHub-compatible node `data.config`.
 *
 * On save we emit nodes shaped as KH expects:
 *   trigger: { type: "trigger", data: { type: "trigger", config: { triggerType } } }
 *   action:  { type: "action",  data: { type: "action",  config: { integrationType, actionType, ...fields } } }
 */

export type FieldKind =
  | "text"
  | "number"
  | "textarea"
  | "select"
  | "boolean"
  | "cron";

export type FieldDef = {
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  description?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: string | number | boolean;
};

export type TriggerDef = {
  triggerType: "Manual" | "Schedule" | "Webhook";
  label: string;
  description: string;
  iconName: "Play" | "Clock" | "Webhook";
  fields: FieldDef[];
};

export type ActionDef = {
  /** key used in the picker — `${integrationType}/${actionType}` */
  id: string;
  integrationType: string;
  actionType: string;
  label: string;
  description: string;
  iconName: ActionIconName;
  category: "polymarket" | "logic" | "io";
  fields: FieldDef[];
};

export type ActionIconName =
  | "Search"
  | "Activity"
  | "TrendingUp"
  | "ShoppingCart"
  | "X"
  | "Eye"
  | "Globe"
  | "GitBranch"
  | "Code";

export const TRIGGERS: TriggerDef[] = [
  {
    triggerType: "Manual",
    label: "Manual",
    description: "Run the bot when you click the trigger URL.",
    iconName: "Play",
    fields: [],
  },
  {
    triggerType: "Schedule",
    label: "Schedule",
    description: "Run on a cron schedule.",
    iconName: "Clock",
    fields: [
      {
        key: "cron",
        label: "Cron expression",
        kind: "cron",
        placeholder: "*/5 * * * *",
        description: "Standard 5-field cron (minute hour dom mon dow).",
        required: true,
        defaultValue: "*/5 * * * *",
      },
    ],
  },
  {
    triggerType: "Webhook",
    label: "Webhook",
    description: "POST to the bot's trigger URL to fire.",
    iconName: "Webhook",
    fields: [],
  },
];

export const ACTIONS: ActionDef[] = [
  // ── Polymarket ──────────────────────────────────────────────────────────
  {
    id: "zlabs-polymarket/search-markets",
    integrationType: "zlabs-polymarket",
    actionType: "search-markets",
    label: "Search markets",
    description: "Find Polymarket markets by query.",
    iconName: "Search",
    category: "polymarket",
    fields: [
      {
        key: "query",
        label: "Query",
        kind: "text",
        placeholder: "e.g. presidential election",
        required: true,
      },
      {
        key: "limit",
        label: "Limit",
        kind: "number",
        defaultValue: 10,
      },
    ],
  },
  {
    id: "zlabs-polymarket/get-odds",
    integrationType: "zlabs-polymarket",
    actionType: "get-odds",
    label: "Get odds",
    description:
      "Fetch live UP/DOWN odds from the active Polymarket up/down market.",
    iconName: "Activity",
    category: "polymarket",
    fields: [
      {
        key: "asset",
        label: "Asset",
        kind: "select",
        required: true,
        defaultValue: "BTC",
        options: [
          { label: "Bitcoin", value: "BTC" },
          { label: "Ethereum", value: "ETH" },
        ],
      },
      {
        key: "timeframe",
        label: "Timeframe",
        kind: "select",
        required: true,
        defaultValue: "15m",
        description:
          "The bot resolves the active market slug at run time — no need to paste a slug.",
        options: [
          { label: "15 minutes", value: "15m" },
          { label: "1 hour", value: "1h" },
          { label: "4 hours", value: "4h" },
          { label: "1 day", value: "1d" },
        ],
      },
    ],
  },
  {
    id: "zlabs-polymarket/pine-evaluate",
    integrationType: "zlabs-polymarket",
    actionType: "pine-evaluate",
    label: "Pine evaluate",
    description:
      "Fetch live Bitstamp candles and run a Pine-style strategy. Outputs { signal: 'UP' | 'DOWN' | 'HOLD' }.",
    iconName: "TrendingUp",
    category: "polymarket",
    fields: [
      {
        key: "asset",
        label: "Asset",
        kind: "select",
        required: true,
        defaultValue: "BTC",
        description:
          "Maps to Bitstamp pair (btcusd / ethusd) and aligns with the Polymarket up/down market.",
        options: [
          { label: "Bitcoin", value: "BTC" },
          { label: "Ethereum", value: "ETH" },
        ],
      },
      {
        key: "timeframe",
        label: "Timeframe",
        kind: "select",
        required: true,
        defaultValue: "15m",
        description:
          "Match this to the Place Order timeframe so the signal targets the right window.",
        options: [
          { label: "15 minutes", value: "15m" },
          { label: "1 hour", value: "1h" },
          { label: "4 hours", value: "4h" },
          { label: "1 day", value: "1d" },
        ],
      },
      {
        key: "lookback",
        label: "Lookback (bars)",
        kind: "number",
        defaultValue: 200,
        description: "How many historical candles to load before evaluating.",
      },
      {
        key: "script",
        label: "Pine script",
        kind: "textarea",
        required: true,
        placeholder:
          "// `candles` = [{ ts, open, high, low, close, volume }, …]\n// return { signal: 'UP' | 'DOWN' | 'HOLD', confidence?: number }\n\nconst last = candles[candles.length - 1];\nconst prev = candles[candles.length - 2];\nreturn { signal: last.close > prev.close ? 'UP' : 'DOWN' };",
      },
    ],
  },
  {
    id: "zlabs-polymarket/place-order",
    integrationType: "zlabs-polymarket",
    actionType: "place-order",
    label: "Place order",
    description:
      "Trade the active Polymarket up/down market for the chosen asset+timeframe.",
    iconName: "ShoppingCart",
    category: "polymarket",
    fields: [
      {
        key: "asset",
        label: "Asset",
        kind: "select",
        required: true,
        defaultValue: "BTC",
        options: [
          { label: "Bitcoin", value: "BTC" },
          { label: "Ethereum", value: "ETH" },
        ],
      },
      {
        key: "timeframe",
        label: "Timeframe",
        kind: "select",
        required: true,
        defaultValue: "15m",
        description:
          "Polymarket auto-rotates these markets every window. The bot resolves the live slug each fire.",
        options: [
          { label: "15 minutes", value: "15m" },
          { label: "1 hour", value: "1h" },
          { label: "4 hours", value: "4h" },
          { label: "1 day", value: "1d" },
        ],
      },
      {
        key: "direction",
        label: "Direction",
        kind: "select",
        required: true,
        defaultValue: "UP",
        description:
          "Buys the UP token (YES) or the DOWN token (NO) of the active market.",
        options: [
          { label: "UP (price will close higher)", value: "UP" },
          { label: "DOWN (price will close lower)", value: "DOWN" },
        ],
      },
      {
        key: "sizeUsd",
        label: "Stake (USDC)",
        kind: "number",
        required: true,
        defaultValue: 10,
        description: "Dollar amount to spend on the chosen direction.",
      },
      {
        key: "paper",
        label: "Paper trade",
        kind: "boolean",
        defaultValue: true,
        placeholder: "Simulate the fill at the current market price.",
      },
    ],
  },
  {
    id: "zlabs-polymarket/cancel-order",
    integrationType: "zlabs-polymarket",
    actionType: "cancel-order",
    label: "Cancel order",
    description: "Cancel an outstanding Polymarket order.",
    iconName: "X",
    category: "polymarket",
    fields: [
      { key: "orderId", label: "Order ID", kind: "text", required: true },
    ],
  },
  {
    id: "zlabs-polymarket/get-order-status",
    integrationType: "zlabs-polymarket",
    actionType: "get-order-status",
    label: "Order status",
    description: "Check the status of a placed order.",
    iconName: "Eye",
    category: "polymarket",
    fields: [
      { key: "orderId", label: "Order ID", kind: "text", required: true },
    ],
  },

  // ── Logic ──────────────────────────────────────────────────────────────
  {
    id: "code/run-code",
    integrationType: "code",
    actionType: "run-code",
    label: "Run code",
    description: "Execute a snippet of JavaScript.",
    iconName: "Code",
    category: "logic",
    fields: [
      {
        key: "code",
        label: "Code",
        kind: "textarea",
        placeholder: "// previous step result is in `input`\nreturn input;",
        required: true,
      },
    ],
  },
  {
    id: "logic/condition",
    integrationType: "logic",
    actionType: "condition",
    label: "Condition",
    description: "Branch on a boolean expression.",
    iconName: "GitBranch",
    category: "logic",
    fields: [
      {
        key: "expression",
        label: "Expression",
        kind: "text",
        placeholder: "input.signal === 'BUY'",
        required: true,
      },
    ],
  },

  // ── I/O ────────────────────────────────────────────────────────────────
  {
    id: "webhook/send-webhook",
    integrationType: "webhook",
    actionType: "send-webhook",
    label: "Send webhook",
    description: "POST the payload to an external URL.",
    iconName: "Globe",
    category: "io",
    fields: [
      { key: "url", label: "URL", kind: "text", required: true },
      {
        key: "method",
        label: "Method",
        kind: "select",
        defaultValue: "POST",
        options: [
          { label: "POST", value: "POST" },
          { label: "PUT", value: "PUT" },
          { label: "PATCH", value: "PATCH" },
        ],
      },
      {
        key: "body",
        label: "Body (JSON)",
        kind: "textarea",
        placeholder: "{}",
      },
    ],
  },
];

export function findAction(id: string): ActionDef | undefined {
  return ACTIONS.find((a) => a.id === id);
}

export function findActionByConfig(
  integrationType: string,
  actionType: string,
): ActionDef | undefined {
  return ACTIONS.find(
    (a) => a.integrationType === integrationType && a.actionType === actionType,
  );
}

export function findTrigger(
  triggerType: string,
): TriggerDef | undefined {
  return TRIGGERS.find((t) => t.triggerType === triggerType);
}
