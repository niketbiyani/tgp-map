import { getSupabaseAdmin } from './supabase-server';

interface GeoResult {
  lat: number;
  lon: number;
}

function normalizePostcode(pc: string): string {
  return pc.trim().toLowerCase().replace(/\s+/g, '');
}

export async function geocodePostcodes(
  postcodes: string[]
): Promise<Record<string, GeoResult | null>> {
  const supabase = getSupabaseAdmin();
  const result: Record<string, GeoResult | null> = {};
  const unique = [...new Set(postcodes.map(normalizePostcode).filter(Boolean))];
  if (!unique.length) return result;

  // Check cache first
  const chunkSize = 300;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const { data } = await supabase
      .from('postcode_geocode')
      .select('postcode_norm, lat, lon')
      .in('postcode_norm', chunk);
    if (data) {
      for (const row of data) {
        result[row.postcode_norm] = { lat: row.lat, lon: row.lon };
      }
    }
  }

  // Fetch uncached from postcodes.io in batches of 100
  const uncached = unique.filter((pc) => !(pc in result));
  for (let i = 0; i < uncached.length; i += 100) {
    const batch = uncached.slice(i, i + 100);
    try {
      const res = await fetch('https://api.postcodes.io/postcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postcodes: batch }),
      });
      if (!res.ok) continue;
      const json = await res.json();
      const toCache: { postcode_norm: string; lat: number; lon: number }[] = [];

      for (const item of json.result ?? []) {
        const pc = normalizePostcode(item.query);
        if (item.result?.latitude != null && item.result?.longitude != null) {
          const geo = { lat: item.result.latitude, lon: item.result.longitude };
          result[pc] = geo;
          toCache.push({ postcode_norm: pc, ...geo });
        } else {
          result[pc] = null;
        }
      }

      if (toCache.length) {
        await supabase
          .from('postcode_geocode')
          .upsert(toCache, { onConflict: 'postcode_norm' });
      }
    } catch {
      for (const pc of batch) {
        if (!(pc in result)) result[pc] = null;
      }
    }
  }

  return result;
}

export function normalizePostcodeKey(pc: string): string {
  return normalizePostcode(pc);
}
