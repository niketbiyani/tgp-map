'use client';

import { useEffect, useState } from 'react';
import { useAdminToken } from '../layout';

const TYPE_COLORS: Record<string, string> = {
  hospital: '#2563eb',
  prison: '#dc2626',
  school: '#16a34a',
  temple: '#f59e0b',
  library: '#8b5cf6',
  community_centre: '#ec4899',
  other: '#6b7280',
};

export default function OrganisationsPage() {
  const token = useAdminToken();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/organisations');
      const data = await res.json();
      if (Array.isArray(data)) setOrgs(data);
      setLoading(false);
    }
    load();
  }, [token]);

  const filtered = orgs.filter((o) => {
    if (typeFilter && o.org_type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        o.org_name?.toLowerCase().includes(q) ||
        o.postcode?.toLowerCase().includes(q) ||
        o.address?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const types = [...new Set(orgs.map((o) => o.org_type))].sort();

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
        Organisations ({orgs.length})
      </h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by name, postcode, or address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1.5px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 14,
            width: 320,
          }}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1.5px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p style={{ color: '#64748b' }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>No organisations found.</p>
      ) : (
        <div style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Organisation</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Postcode</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Deliveries</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>On Map</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((o: any) => (
                <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 16px', color: '#1e293b', fontWeight: 500 }}>{o.org_name}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 9999,
                      background: `${TYPE_COLORS[o.org_type] ?? '#6b7280'}15`,
                      color: TYPE_COLORS[o.org_type] ?? '#6b7280',
                      fontSize: 12,
                      fontWeight: 500,
                    }}>
                      {o.org_type}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#64748b' }}>{o.postcode ?? '—'}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 600, color: '#1e293b' }}>
                    {o.deliveries_total}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                    {o.lat && o.lon ? (
                      <span style={{ color: '#16a34a' }}>Yes</span>
                    ) : (
                      <span style={{ color: '#ef4444' }}>No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 200 && (
            <div style={{ padding: 12, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              Showing first 200 of {filtered.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
