import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripe, getStripePriceId } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    if (!token) {
      return NextResponse.json(
        { error: 'NOT_AUTHENTICATED' },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase env not configured');
      return NextResponse.json({ error: 'CHECKOUT_ERROR' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id || !user.email) {
      return NextResponse.json(
        { error: 'NOT_AUTHENTICATED' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const currency = typeof body?.currency === 'string' ? body.currency : 'eur';

    const validCurrency = ['eur', 'chf', 'usd'].includes(currency) ? currency : 'eur';
    const priceId = getStripePriceId(validCurrency);

    if (!priceId) {
      return NextResponse.json(
        { error: 'PRICE_NOT_CONFIGURED' },
        { status: 400 }
      );
    }

    const session = await getStripe().checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.nextUrl.origin}/profile?payment=success`,
      cancel_url: `${req.nextUrl.origin}/profile?payment=canceled`,
      metadata: { userId: user.id, currency: validCurrency },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: 'CHECKOUT_ERROR' },
      { status: 500 }
    );
  }
}
