export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../lib/supabase-server';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: orgs, error: orgErr } = await supabase
      .from('organisations')
      .select('*')
      .not('lat', 'is', null)
      .not('lon', 'is', null)
      .order('org_name');

    if (orgErr) {
      return NextResponse.json({ error: orgErr.message }, { status: 500 });
    }

    const orgIds = (orgs ?? []).map((o: any) => o.id);

    let orders: any[] = [];
    if (orgIds.length) {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .in('organisation_id', orgIds)
        .in('status', ['new', 'funded'])
        .order('created_at', { ascending: false });
      orders = data ?? [];
    }

    // Attach the most recent active order to each org
    const ordersByOrg = new Map<string, any>();
    for (const o of orders) {
      if (!ordersByOrg.has(o.organisation_id)) {
        ordersByOrg.set(o.organisation_id, o);
      }
    }

    const result = (orgs ?? []).map((org: any) => ({
      ...org,
      active_order: ordersByOrg.get(org.id) ?? null,
    }));

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
