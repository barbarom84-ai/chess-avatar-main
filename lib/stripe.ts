import Stripe from 'stripe';

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  typescript: true,
});

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
