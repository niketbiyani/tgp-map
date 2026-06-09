'use client';

import { useState } from 'react';
import { useAdminToken } from '../layout';

export default function ImportPage() {
  const token = useAdminToken();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError(null);

    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Import failed');
      } else {
        setResult(json);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
        Import CSV
      </h1>
      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>
        Upload your master spreadsheet. Postcodes will be automatically geocoded for the map.
      </p>

      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: 24,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        maxWidth: 600,
      }}>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={{ marginBottom: 16, display: 'block' }}
        />

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          style={{
            padding: '10px 24px',
            background: loading ? '#94a3b8' : '#1e293b',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Importing...' : 'Upload & Import'}
        </button>

        {error && (
          <div style={{
            marginTop: 16,
            padding: 12,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            color: '#dc2626',
            fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              padding: 12,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 8,
              marginBottom: 12,
            }}>
              <div style={{ fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>Import Complete</div>
              <div style={{ fontSize: 14, color: '#1e293b' }}>
                <strong>{result.organisations_inserted}</strong> organisations imported<br />
                <strong>{result.orders_created}</strong> orders created<br />
                <strong>{result.geocoded}</strong> postcodes geocoded
                {result.geocode_failed > 0 && (
                  <span style={{ color: '#f59e0b' }}> ({result.geocode_failed} failed)</span>
                )}
                <br />
                {result.skipped > 0 && <><strong>{result.skipped}</strong> rows skipped<br /></>}
              </div>
            </div>

            {result.errors_preview?.length > 0 && (
              <div style={{
                padding: 12,
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 8,
                fontSize: 13,
              }}>
                <div style={{ fontWeight: 600, color: '#92400e', marginBottom: 4 }}>Warnings</div>
                {result.errors_preview.map((e: any, i: number) => (
                  <div key={i} style={{ color: '#78350f' }}>
                    Row {e.row}: {e.error}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: 24, fontSize: 13, color: '#94a3b8' }}>
        <strong>Expected CSV headers:</strong> Organisation Type, Organisation Name, Address 1–5,
        Postcode, Phone number, Contact Person 1/2, Email 1/2, Notes,
        Date Delivered 2016–2024, target_amount_pence, pledged_amount_pence, funding_status
      </div>
    </div>
  );
}
