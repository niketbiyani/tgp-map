export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSupabaseAdmin, requireAdmin } from '../../lib/supabase-server';
import { geocodePostcodes, normalizePostcodeKey } from '../../lib/geocode';
import { parse } from 'csv-parse/sync';

// CSV header → field mapping
const HEADER_MAP: Record<string, string> = {
  'Organisation Type': 'org_type',
  'Organisation Name': 'org_name',
  'Address 1': 'address1',
  'Address 2': 'address2',
  'Address 3': 'address3',
  'Address 4': 'address4',
  'Address 5': 'address5',
  'Postcode': 'postcode',
  'Phone number': 'phone',
  'Contact Person 1': 'contact_person_1',
  'Contact person 2': 'contact_person_2',
  'Email 1': 'email_1',
  'Email 2': 'email_2',
  'Notes': 'notes',
  'target_amount_pence': 'target_amount_pence',
  'pledged_amount_pence': 'pledged_amount_pence',
  'funding_status': 'funding_status',
};

const DELIVERY_DATE_HEADERS = [
  'Date Delivered 2016', 'Date Delivered 2017', 'Date Delivered 2018',
  'Date Delivered 2019', 'Date Delivered 2020', 'Date Delivered 2021',
  'Date Delivered 2022', 'Date Delivered 2023', 'Date Delivered 2024',
];

const VALID_ORG_TYPES = new Set([
  'hospital', 'prison', 'school', 'temple', 'library', 'community_centre', 'other',
]);

function clean(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function toInt(v: any): number | null {
  const s = clean(v);
  if (!s) return null;
  const n = Number(s.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function normalizeOrgType(v: any): string {
  const s = (clean(v) ?? 'other').toLowerCase().replace(/\s+/g, '_');
  return VALID_ORG_TYPES.has(s) ? s : 'other';
}

function combineAddress(row: Record<string, any>): string | null {
  const parts = ['address1', 'address2', 'address3', 'address4', 'address5']
    .map((k) => clean(row[k]))
    .filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

function countDeliveries(row: Record<string, any>): number {
  return DELIVERY_DATE_HEADERS.reduce(
    (count, h) => count + (clean(row[h]) ? 1 : 0),
    0
  );
}

function mapRow(csvRow: Record<string, string>): Record<string, any> {
  const mapped: Record<string, any> = {};
  for (const [csvHeader, field] of Object.entries(HEADER_MAP)) {
    mapped[field] = csvRow[csvHeader];
  }
  // Keep raw delivery date headers for counting
  for (const h of DELIVERY_DATE_HEADERS) {
    mapped[h] = csvRow[h];
  }
  return mapped;
}

export async function POST(req: Request) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file !== 'object' || !('arrayBuffer' in file)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buf = Buffer.from(await (file as File).arrayBuffer());
    const text = buf.toString('utf8');

    const rows = parse(text, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
      bom: true,
      trim: true,
    }) as Record<string, string>[];

    if (!rows.length) {
      return NextResponse.json({ error: 'No data rows found' }, { status: 400 });
    }

    // Map CSV headers to our fields
    const mapped = rows.map(mapRow);

    // Collect postcodes for batch geocoding
    const postcodes = mapped
      .map((r) => clean(r.postcode))
      .filter((p): p is string => !!p);

    const geoMap = await geocodePostcodes(postcodes);

    const supabase = getSupabaseAdmin();
    let inserted = 0;
    let skipped = 0;
    const errors: { row: number; error: string }[] = [];

    // Batch insert organisations
    const orgRecords: any[] = [];
    for (let i = 0; i < mapped.length; i++) {
      const r = mapped[i];
      const orgName = clean(r.org_name);
      if (!orgName) {
        skipped++;
        errors.push({ row: i + 2, error: 'Missing organisation name' });
        continue;
      }

      const postcode = clean(r.postcode);
      const pcNorm = postcode ? normalizePostcodeKey(postcode) : '';
      const geo = pcNorm ? geoMap[pcNorm] ?? null : null;

      orgRecords.push({
        org_name: orgName,
        org_type: normalizeOrgType(r.org_type),
        address: combineAddress(r),
        postcode,
        lat: geo?.lat ?? null,
        lon: geo?.lon ?? null,
        phone: clean(r.phone),
        contact_person_1: clean(r.contact_person_1),
        contact_person_2: clean(r.contact_person_2),
        email_1: clean(r.email_1),
        email_2: clean(r.email_2),
        notes: clean(r.notes),
        deliveries_total: countDeliveries(r),
      });
    }

    // Insert in chunks of 500
    for (let i = 0; i < orgRecords.length; i += 500) {
      const chunk = orgRecords.slice(i, i + 500);
      const { error } = await supabase.from('organisations').insert(chunk);
      if (error) {
        errors.push({
          row: i + 2,
          error: `Batch insert failed: ${error.message}`,
        });
      } else {
        inserted += chunk.length;
      }
    }

    // Handle orders from CSV rows that have target_amount_pence
    let ordersCreated = 0;
    if (inserted > 0) {
      // Re-fetch inserted orgs to get IDs
      const { data: allOrgs } = await supabase
        .from('organisations')
        .select('id, org_name, postcode');

      if (allOrgs) {
        const orgLookup = new Map<string, string>();
        for (const o of allOrgs) {
          const key = `${(o.org_name ?? '').toLowerCase()}|${(o.postcode ?? '').toLowerCase()}`;
          orgLookup.set(key, o.id);
        }

        const orderRecords: any[] = [];
        for (const r of mapped) {
          const target = toInt(r.target_amount_pence);
          if (!target || target <= 0) continue;

          const name = clean(r.org_name);
          const pc = clean(r.postcode);
          if (!name) continue;

          const key = `${name.toLowerCase()}|${(pc ?? '').toLowerCase()}`;
          const orgId = orgLookup.get(key);
          if (!orgId) continue;

          const pledged = toInt(r.pledged_amount_pence) ?? 0;
          const status = clean(r.funding_status) ?? (pledged >= target ? 'funded' : 'new');

          orderRecords.push({
            organisation_id: orgId,
            target_amount_pence: target,
            pledged_amount_pence: pledged,
            status,
            appeal_title: `${name} Appeal`,
          });
        }

        if (orderRecords.length) {
          const { error } = await supabase.from('orders').insert(orderRecords);
          if (!error) ordersCreated = orderRecords.length;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      rows_in_csv: rows.length,
      organisations_inserted: inserted,
      orders_created: ordersCreated,
      skipped,
      errors_count: errors.length,
      errors_preview: errors.slice(0, 20),
      geocoded: Object.keys(geoMap).length,
      geocode_failed: Object.values(geoMap).filter((v) => v === null).length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
