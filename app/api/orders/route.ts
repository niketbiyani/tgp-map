export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSupabaseAdmin, requireAdmin } from '../../lib/supabase-server';

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const url = new URL(req.url);
    const status = url.searchParams.get('status');

    let query = supabase
      .from('orders')
      .select('*, organisations(org_name, postcode)')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();

    const { organisation_id, target_amount_pence, appeal_title, appeal_description, needed_by } = body;

    if (!organisation_id || !target_amount_pence || !appeal_title) {
      return NextResponse.json(
        { error: 'organisation_id, target_amount_pence, and appeal_title are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('orders')
      .insert({
        organisation_id,
        target_amount_pence,
        appeal_title,
        appeal_description: appeal_description || null,
        needed_by: needed_by || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
