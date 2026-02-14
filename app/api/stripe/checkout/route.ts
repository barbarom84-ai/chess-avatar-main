import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, getStripePriceId } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { userId, email, currency } = await req.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Utilisateur non authentifié' },
        { status: 401 }
      );
    }

    const validCurrency = ['eur', 'chf', 'usd'].includes(currency) ? currency : 'eur';
    const priceId = getStripePriceId(validCurrency);

    if (!priceId) {
      return NextResponse.json(
        { error: 'Prix non configuré pour cette devise' },
        { status: 400 }
      );
    }

    // Payment method types: card (Visa, etc.) + twint (CHF only, Stripe handles availability)
    const paymentMethodTypes: string[] = ['card'];
    if (validCurrency === 'chf') {
      paymentMethodTypes.push('twint');
    }

    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      payment_method_types: paymentMethodTypes as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
      mode: 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${req.nextUrl.origin}/profile?payment=success`,
      cancel_url: `${req.nextUrl.origin}/profile?payment=canceled`,
      metadata: {
        userId,
        currency: validCurrency,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la création du paiement' },
      { status: 500 }
    );
  }
}
