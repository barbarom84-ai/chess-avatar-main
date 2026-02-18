import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe, getStripePriceId } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { userId, email, currency } = await req.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'NOT_AUTHENTICATED' },
        { status: 401 }
      );
    }

    const validCurrency = ['eur', 'chf', 'usd'].includes(currency) ? currency : 'eur';
    const priceId = getStripePriceId(validCurrency);

    if (!priceId) {
      return NextResponse.json(
        { error: 'PRICE_NOT_CONFIGURED' },
        { status: 400 }
      );
    }

    const session = await getStripe().checkout.sessions.create({
      customer_email: email,
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.nextUrl.origin}/profile?payment=success`,
      cancel_url: `${req.nextUrl.origin}/profile?payment=canceled`,
      metadata: { userId, currency: validCurrency },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'CHECKOUT_ERROR' },
      { status: 500 }
    );
  }
}
