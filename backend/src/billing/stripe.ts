import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY not set');
    _stripe = new Stripe(key, { apiVersion: '2026-02-25.clover' });
  }
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    if (prop === 'then') return undefined;
    const s = getStripe();
    const val = (s as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === 'function' ? (val as Function).bind(s) : val;
  },
});

export const PLANS = {
  FREE: { name: 'Free', priceId: null, bots: 1, price: 0 },
  PRO: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID || null,
    bots: 3,
    price: 29,
  },
  ENTERPRISE: {
    name: 'Enterprise',
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || null,
    bots: 100,
    price: 99,
  },
} as const;

export type PlanKey = keyof typeof PLANS;
