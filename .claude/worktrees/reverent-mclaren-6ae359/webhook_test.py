"""
Trigger a ZLabs bot end-to-end.

ZLabs bots are KeeperHub workflows. The webhook URL shown on /bots/[id] is the
KeeperHub workflow webhook (not a ZLabs endpoint). This script POSTs the same
payload TradingView would send.

Usage:
    1. Build a bot via the gallery at /bots (e.g. "TradingView Webhook Trader").
    2. Copy the webhook URL from the right rail of /bots/[id].
    3. Paste it below as WEBHOOK_URL.
    4. (If your KeeperHub instance requires API-key auth on webhook calls,
       paste it as KH_API_KEY — leave empty otherwise.)
    5. python webhook_test.py
"""

import json
import time

import requests

# === Fill these in ===
WEBHOOK_URL = "https://api.keeperhub.com/api/workflows/REPLACE_WITH_WORKFLOW_ID/webhook"
KH_API_KEY = ""  # optional, if your KH instance requires bearer auth on webhook
# =====================

# Sample payload — fields are interpreted by the workflow's nodes via {{trigger.body.*}}.
# The shipped templates expect tokenId / symbol / interval.
PAYLOAD = {
    "tokenId": "85968919234123456789",
    "symbol": "BTCUSDT",
    "interval": "1h",
    "signal": "BUY",
}


def fire(signal: str = "BUY") -> None:
    payload = {**PAYLOAD, "signal": signal}
    headers = {"Content-Type": "application/json"}
    if KH_API_KEY:
        headers["Authorization"] = f"Bearer {KH_API_KEY}"

    print(f"POST {WEBHOOK_URL}  signal={signal}")
    try:
        r = requests.post(WEBHOOK_URL, json=payload, headers=headers, timeout=15)
        print(f"  -> {r.status_code}")
        try:
            print(json.dumps(r.json(), indent=2))
        except ValueError:
            print(r.text[:400])
    except Exception as e:
        print(f"  ERROR: {e}")


if __name__ == "__main__":
    fire("BUY")
    time.sleep(2)
    fire("SELL")
