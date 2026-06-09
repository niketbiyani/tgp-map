'use client';

import { useEffect, useState } from 'react';
import { useAdminToken } from './layout';

interface Stats {
  organisations: number;
  totalDeliveries: number;
  ordersNew: number;
  ordersFunded: number;
  ordersDelivered: number;
}

export default function AdminDashboard() {
  const token = useAdminToken();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function load() {
      const headers = { Authorization: `Bearer ${token}` };

      const [orgsRes, ordersRes] = await Promise.all([
        fetch('/api/organisations'),
        fetch('/api/orders', { headers }),
      ]);

      const orgs = await orgsRes.json();
      const orders = await ordersRes.json();

      if (Array.isArray(orgs) && Array.isArray(orders)) {
        setStats({
          organisations: orgs.length,
          totalDeliveries: orgs.reduce((s: number, o: any) => s + (o.deliveries_total ?? 0), 0),
          ordersNew: orders.filter((o: any) => o.status === 'new').length,
          ordersFunded: orders.filter((o: any) => o.status === 'funded').length,
          ordersDelivered: orders.filter((o: any) => o.status === 'delivered').length,
        });
      }
    }
    load();
  }, [token]);

  const cards = stats
    ? [
        { label: 'Organisations', value: stats.organisations, color: '#2563eb' },
        { label: 'Total Deliveries', value: stats.totalDeliveries, color: '#16a34a' },
        { label: 'Orders — Needs Funding', value: stats.ordersNew, color: '#ef4444' },
        { label: 'Orders — Funded', value: stats.ordersFunded, color: '#f59e0b' },
        { label: 'Orders — Delivered', value: stats.ordersDelivered, color: '#16a34a' },
      ]
    : [];

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 24 }}>
        Dashboard
      </h1>

      {!stats ? (
        <p style={{ color: '#64748b' }}>Loading...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {cards.map((c) => (
            <div
              key={c.label}
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: 20,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                borderLeft: `4px solid ${c.color}`,
              }}
            >
              <div style={{ fontSize: 32, fontWeight: 700, color: '#1e293b' }}>{c.value}</div>
              <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>{c.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
