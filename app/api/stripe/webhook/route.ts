import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  // Lazy init to avoid build-time errors
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.metadata?.userId;
    const currency = session.metadata?.currency || 'eur';

    if (!userId) {
      console.error('No userId in session metadata');
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Check payment status
    if (session.payment_status === 'paid') {
      try {
        // Upsert the subscription record
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .upsert(
            {
              user_id: userId,
              stripe_customer_id: session.customer as string,
              stripe_payment_id: session.payment_intent as string,
              plan: 'premium',
              status: 'active',
              currency: currency,
              amount_paid: session.amount_total || 1000,
              paid_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

        if (error) {
          console.error('Supabase upsert error:', error);
          return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        console.log(`✅ Premium activated for user ${userId}`);
      } catch (err) {
        console.error('Error activating premium:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
