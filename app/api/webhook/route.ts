export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../lib/supabase-server';
import Stripe from 'stripe';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata ?? {};
    const orderId = meta.order_id;
    const amountPence = session.amount_total ?? 0;

    if (orderId && amountPence > 0) {
      const supabase = getSupabaseAdmin();

      // Record donation
      await supabase.from('donations').insert({
        order_id: orderId,
        amount_pence: amountPence,
        donor_name: meta.donor_name || null,
        donor_email: meta.donor_email || session.customer_details?.email || null,
        gift_aid: meta.gift_aid === 'true',
        stripe_session_id: session.id,
      });

      // Update order pledged amount
      const { data: order } = await supabase
        .from('orders')
        .select('pledged_amount_pence, target_amount_pence')
        .eq('id', orderId)
        .single();

      if (order) {
        const newPledged = order.pledged_amount_pence + amountPence;
        const newStatus = newPledged >= order.target_amount_pence ? 'funded' : 'new';
        await supabase
          .from('orders')
          .update({ pledged_amount_pence: newPledged, status: newStatus })
          .eq('id', orderId);
      }
    }
  }

  return NextResponse.json({ received: true });
}
