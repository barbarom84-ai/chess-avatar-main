import Stripe from 'stripe';

// Server-side Stripe instance (lazy init to avoid build-time errors)
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    _stripe = new Stripe(key, { typescript: true });
  }
  return _stripe;
}

// Price IDs by currency
export function getStripePriceId(currency: 'eur' | 'chf' | 'usd'): string {
  switch (currency) {
    case 'eur':
      return process.env.STRIPE_PRICE_EUR || '';
    case 'chf':
      return process.env.STRIPE_PRICE_CHF || '';
    case 'usd':
      return process.env.STRIPE_PRICE_USD || '';
  }
}
