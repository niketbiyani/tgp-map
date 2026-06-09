'use client';

import { useEffect, useState } from 'react';
import { useAdminToken } from '../layout';

interface Order {
  id: string;
  created_at: string;
  organisation_id: string;
  target_amount_pence: number;
  pledged_amount_pence: number;
  status: string;
  appeal_title: string;
  organisations: { org_name: string; postcode: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  new: '#ef4444',
  funded: '#f59e0b',
  delivered: '#16a34a',
};

function pence(v: number) {
  return `£${(v / 100).toFixed(2)}`;
}

export default function OrdersPage() {
  const token = useAdminToken();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadOrders() {
    setLoading(true);
    const url = filter ? `/api/orders?status=${filter}` : '/api/orders';
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (Array.isArray(data)) setOrders(data);
    setLoading(false);
  }

  useEffect(() => { loadOrders(); }, [filter, token]);

  async function updateStatus(id: string, newStatus: string) {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) loadOrders();
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
        Orders
      </h1>
      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
        Manage funding appeals. Update status as donations come in and deliveries are made.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['', 'new', 'funded', 'delivered'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '6px 14px',
              borderRadius: 9999,
              border: `1.5px solid ${filter === s ? '#1e293b' : '#e2e8f0'}`,
              background: filter === s ? '#1e293b' : '#fff',
              color: filter === s ? '#fff' : '#64748b',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#64748b' }}>Loading...</p>
      ) : orders.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>No orders found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.map((o) => (
            <div
              key={o.id}
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: 16,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                borderLeft: `4px solid ${STATUS_COLORS[o.status] ?? '#6b7280'}`,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 2 }}>
                  {o.appeal_title}
                </div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  {o.organisations?.org_name ?? 'Unknown'} — {o.organisations?.postcode ?? ''}
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                  {pence(o.pledged_amount_pence)} / {pence(o.target_amount_pence)} raised
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: 9999,
                  background: STATUS_COLORS[o.status] ?? '#6b7280',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}>
                  {o.status}
                </span>

                {o.status === 'new' && (
                  <button
                    onClick={() => updateStatus(o.id, 'funded')}
                    style={{
                      padding: '6px 12px',
                      background: '#f59e0b',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Mark Funded
                  </button>
                )}
                {o.status === 'funded' && (
                  <button
                    onClick={() => updateStatus(o.id, 'delivered')}
                    style={{
                      padding: '6px 12px',
                      background: '#16a34a',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Mark Delivered
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
