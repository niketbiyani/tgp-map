export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../lib/supabase-server';
import Stripe from 'stripe';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { order_id, amount_pence, donor_name, donor_email, gift_aid } = body;

    if (!order_id || !amount_pence || amount_pence < 100) {
      return NextResponse.json(
        { error: 'order_id and amount_pence (min 100) are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*, organisations(org_name)')
      .eq('id', order_id)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orgName = (order as any).organisations?.org_name ?? 'The Gita Project';
    const stripe = getStripe();

    const origin = req.headers.get('origin') ?? 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: order.appeal_title,
              description: `Donation for ${orgName}`,
            },
            unit_amount: amount_pence,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/?donated=${order_id}`,
      cancel_url: `${origin}/`,
      metadata: {
        order_id,
        donor_name: donor_name ?? '',
        donor_email: donor_email ?? '',
        gift_aid: gift_aid ? 'true' : 'false',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
