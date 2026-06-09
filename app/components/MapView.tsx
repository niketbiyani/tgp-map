'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  MOCK_ORGANISATIONS,
  ORG_TYPE_COLORS as MOCK_COLORS,
  ORG_TYPE_LABELS as MOCK_LABELS,
  Organisation as MockOrg,
  OrgType as MockOrgType,
} from '../data/mock-organisations';
import {
  ORG_TYPE_COLORS,
  ORG_TYPE_LABELS,
  OrgType,
  OrganisationWithOrder,
} from '../lib/types';

import 'leaflet/dist/leaflet.css';

// Unified org shape for rendering (works with both mock and real data)
interface MapOrg {
  id: string;
  orgName: string;
  orgType: OrgType;
  address: string;
  postcode: string;
  lat: number;
  lon: number;
  deliveriesTotal: number;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  activeOrder: {
    id: string;
    targetAmountPence: number;
    pledgedAmountPence: number;
    status: string;
    appealTitle: string;
  } | null;
}

function fromApi(org: OrganisationWithOrder): MapOrg {
  return {
    id: org.id,
    orgName: org.org_name,
    orgType: org.org_type,
    address: org.address ?? '',
    postcode: org.postcode ?? '',
    lat: org.lat!,
    lon: org.lon!,
    deliveriesTotal: org.deliveries_total,
    contactPerson: org.contact_person_1,
    phone: org.phone,
    email: org.email_1,
    activeOrder: org.active_order
      ? {
          id: org.active_order.id,
          targetAmountPence: org.active_order.target_amount_pence,
          pledgedAmountPence: org.active_order.pledged_amount_pence,
          status: org.active_order.status,
          appealTitle: org.active_order.appeal_title,
        }
      : null,
  };
}

function fromMock(org: MockOrg): MapOrg {
  return {
    id: org.id,
    orgName: org.orgName,
    orgType: org.orgType,
    address: org.address,
    postcode: org.postcode,
    lat: org.lat,
    lon: org.lon,
    deliveriesTotal: org.deliveriesTotal,
    contactPerson: org.contactPerson,
    phone: org.phone,
    email: org.email,
    activeOrder: org.activeOrder
      ? {
          id: org.activeOrder.id,
          targetAmountPence: org.activeOrder.targetAmountPence,
          pledgedAmountPence: org.activeOrder.pledgedAmountPence,
          status: org.activeOrder.status,
          appealTitle: org.activeOrder.appealTitle,
        }
      : null,
  };
}

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function statusBadge(status: string): string {
  switch (status) {
    case 'new':
      return '<span style="background:#ef4444;color:#fff;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600">NEEDS FUNDING</span>';
    case 'funded':
      return '<span style="background:#f59e0b;color:#fff;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600">FUNDED — AWAITING DELIVERY</span>';
    case 'delivered':
      return '<span style="background:#16a34a;color:#fff;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600">DELIVERED</span>';
    default:
      return '';
  }
}

function progressBar(pledged: number, target: number): string {
  const pct = Math.min(100, Math.round((pledged / target) * 100));
  return `
    <div style="margin:8px 0">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:2px">
        <span>${formatPence(pledged)} raised</span>
        <span>${formatPence(target)} goal</span>
      </div>
      <div style="background:#e2e8f0;border-radius:9999px;height:8px;overflow:hidden">
        <div style="background:${pct >= 100 ? '#16a34a' : '#2563eb'};height:100%;width:${pct}%;border-radius:9999px;transition:width 0.3s"></div>
      </div>
      <div style="text-align:center;font-size:11px;color:#94a3b8;margin-top:2px">${pct}% funded</div>
    </div>
  `;
}

function buildPopup(org: MapOrg): string {
  const typeLabel = ORG_TYPE_LABELS[org.orgType] ?? org.orgType;
  const color = ORG_TYPE_COLORS[org.orgType] ?? '#6b7280';

  let html = `
    <div style="min-width:260px;max-width:320px;font-family:system-ui,sans-serif">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color}"></span>
        <span style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">${typeLabel}</span>
      </div>
      <h3 style="margin:0 0 4px;font-size:16px;font-weight:700;color:#1e293b">${org.orgName}</h3>
      <p style="margin:0 0 8px;font-size:13px;color:#64748b">${org.address}${org.postcode ? `, ${org.postcode}` : ''}</p>
  `;

  html += `
    <div style="background:#f8fafc;border-radius:8px;padding:8px 10px;margin-bottom:8px">
      <div style="font-size:12px;color:#64748b;margin-bottom:2px">Delivery History</div>
      <div style="font-size:20px;font-weight:700;color:#1e293b">${org.deliveriesTotal} ${org.deliveriesTotal === 1 ? 'delivery' : 'deliveries'}</div>
    </div>
  `;

  if (org.activeOrder) {
    const o = org.activeOrder;
    html += `
      <div style="border:1px solid #e2e8f0;border-radius:8px;padding:10px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:13px;font-weight:600;color:#1e293b">${o.appealTitle}</span>
        </div>
        <div style="margin-bottom:6px">${statusBadge(o.status)}</div>
        ${o.status !== 'delivered' ? progressBar(o.pledgedAmountPence, o.targetAmountPence) : ''}
        ${o.status === 'new' ? `
          <button
            onclick="window.__tgpDonate && window.__tgpDonate('${org.id}', '${o.id}')"
            style="display:block;width:100%;padding:8px 0;background:#2563eb;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer;margin-top:4px"
          >
            Donate Now
          </button>
        ` : ''}
      </div>
    `;
  } else {
    html += `
      <div style="text-align:center;padding:6px;font-size:12px;color:#16a34a;font-weight:500">
        All deliveries fulfilled
      </div>
    `;
  }

  if (org.contactPerson || org.phone || org.email) {
    html += `<div style="border-top:1px solid #e2e8f0;padding-top:6px;font-size:11px;color:#94a3b8">`;
    if (org.contactPerson) html += `Contact: ${org.contactPerson}<br/>`;
    if (org.phone) html += `${org.phone}<br/>`;
    if (org.email) html += `${org.email}`;
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

function createMarkerIcon(orgType: OrgType, hasActiveOrder: boolean): L.DivIcon | null {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');
  const color = ORG_TYPE_COLORS[orgType] ?? '#6b7280';
  const pulse = hasActiveOrder
    ? `<span style="position:absolute;top:-3px;right:-3px;width:10px;height:10px;background:#ef4444;border-radius:50%;border:2px solid #fff;animation:pulse 2s infinite"></span>`
    : '';

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position:relative">
        <svg width="28" height="36" viewBox="0 0 28 36">
          <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.3 21.7 0 14 0z" fill="${color}" stroke="#fff" stroke-width="2"/>
          <circle cx="14" cy="14" r="6" fill="#fff" opacity="0.9"/>
        </svg>
        ${pulse}
      </div>
    `,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
}

export default function MapView() {
  const [map, setMap] = useState<L.Map | null>(null);
  const [organisations, setOrganisations] = useState<MapOrg[]>([]);
  const [activeFilters, setActiveFilters] = useState<Set<OrgType>>(new Set());
  const [showNeedsFunding, setShowNeedsFunding] = useState(false);
  const [donateOrg, setDonateOrg] = useState<MapOrg | null>(null);
  const [donateAmount, setDonateAmount] = useState<number | null>(null);
  const [donateLoading, setDonateLoading] = useState(false);
  const [dataSource, setDataSource] = useState<'loading' | 'api' | 'mock'>('loading');

  // Load data — try API first, fall back to mock
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/organisations');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setOrganisations(data.map(fromApi));
            setDataSource('api');
            return;
          }
        }
      } catch {}
      setOrganisations(MOCK_ORGANISATIONS.map(fromMock));
      setDataSource('mock');
    }
    load();
  }, []);

  // Init map
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const L = require('leaflet');

    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.4); opacity: 0.7; }
        100% { transform: scale(1); opacity: 1; }
      }
      .custom-marker { background: none !important; border: none !important; }
      .leaflet-popup-content-wrapper { border-radius: 12px !important; box-shadow: 0 4px 24px rgba(0,0,0,0.12) !important; }
      .leaflet-popup-content { margin: 12px 14px !important; }
    `;
    document.head.appendChild(style);

    const m = L.map('tgp-map', {
      center: [54.0, -2.0],
      zoom: 6,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(m);

    setMap(m);

    return () => {
      m.remove();
      style.remove();
    };
  }, []);

  // Donate handler
  useEffect(() => {
    (window as any).__tgpDonate = (orgId: string, orderId: string) => {
      const org = organisations.find((o) => o.id === orgId);
      if (org) setDonateOrg(org);
    };
    return () => { delete (window as any).__tgpDonate; };
  }, [organisations]);

  // Render markers
  useEffect(() => {
    if (!map) return;
    const L = require('leaflet');

    map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    const filtered = organisations.filter((org) => {
      if (activeFilters.size > 0 && !activeFilters.has(org.orgType)) return false;
      if (showNeedsFunding && (!org.activeOrder || org.activeOrder.status !== 'new')) return false;
      return true;
    });

    filtered.forEach((org) => {
      const icon = createMarkerIcon(org.orgType, !!org.activeOrder && org.activeOrder.status === 'new');
      if (!icon) return;
      const marker = L.marker([org.lat, org.lon], { icon }).addTo(map);
      marker.bindPopup(buildPopup(org), { maxWidth: 340 });
    });
  }, [map, organisations, activeFilters, showNeedsFunding]);

  const toggleFilter = (type: OrgType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  async function handleDonate() {
    if (!donateOrg?.activeOrder || !donateAmount) return;
    setDonateLoading(true);
    try {
      const res = await fetch('/api/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: donateOrg.activeOrder.id,
          amount_pence: donateAmount,
          gift_aid: (document.getElementById('gift-aid') as HTMLInputElement)?.checked ?? false,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Could not start payment. Stripe may not be configured yet.');
      }
    } catch {
      alert('Payment service not available yet.');
    } finally {
      setDonateLoading(false);
    }
  }

  const stats = {
    totalOrgs: organisations.length,
    totalDeliveries: organisations.reduce((s, o) => s + o.deliveriesTotal, 0),
    needsFunding: organisations.filter((o) => o.activeOrder?.status === 'new').length,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #1e293b, #334155)',
        color: '#fff',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            background: '#f59e0b',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 700,
          }}>G</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>The Gita Project</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Spreading wisdom through books across the UK</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{stats.totalOrgs}</div>
            <div style={{ color: '#94a3b8' }}>Organisations</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{stats.totalDeliveries}</div>
            <div style={{ color: '#94a3b8' }}>Deliveries</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>{stats.needsFunding}</div>
            <div style={{ color: '#94a3b8' }}>Need Funding</div>
          </div>
        </div>
      </header>

      {/* Filter bar */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        padding: '8px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginRight: 4 }}>FILTER:</span>
        {(Object.keys(ORG_TYPE_LABELS) as OrgType[]).map((type) => {
          const active = activeFilters.has(type);
          return (
            <button
              key={type}
              onClick={() => toggleFilter(type)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 9999,
                border: `1.5px solid ${active ? ORG_TYPE_COLORS[type] : '#e2e8f0'}`,
                background: active ? `${ORG_TYPE_COLORS[type]}15` : '#fff',
                color: active ? ORG_TYPE_COLORS[type] : '#64748b',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: ORG_TYPE_COLORS[type] }} />
              {ORG_TYPE_LABELS[type]}
            </button>
          );
        })}

        <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 4px' }} />

        <button
          onClick={() => setShowNeedsFunding(!showNeedsFunding)}
          style={{
            padding: '4px 10px',
            borderRadius: 9999,
            border: `1.5px solid ${showNeedsFunding ? '#ef4444' : '#e2e8f0'}`,
            background: showNeedsFunding ? '#fef2f2' : '#fff',
            color: showNeedsFunding ? '#ef4444' : '#64748b',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Needs Funding Only
        </button>

        {dataSource === 'mock' && (
          <>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 500 }}>
              Demo data — connect Supabase to show real organisations
            </span>
          </>
        )}
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div id="tgp-map" style={{ width: '100%', height: '100%' }} />

        {/* Legend */}
        <div style={{
          position: 'absolute',
          bottom: 24,
          left: 24,
          background: '#fff',
          borderRadius: 12,
          padding: '12px 16px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
          zIndex: 1000,
          fontSize: 12,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#1e293b' }}>Legend</div>
          {(Object.keys(ORG_TYPE_LABELS) as OrgType[]).map((type) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: ORG_TYPE_COLORS[type] }} />
              <span style={{ color: '#475569' }}>{ORG_TYPE_LABELS[type]}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 6, paddingTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#ef4444',
              animation: 'pulse 2s infinite',
            }} />
            <span style={{ color: '#475569' }}>Has active appeal</span>
          </div>
        </div>
      </div>

      {/* Donate Modal */}
      {donateOrg && donateOrg.activeOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => { setDonateOrg(null); setDonateAmount(null); }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 32,
              maxWidth: 440,
              width: '90%',
              boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#1e293b' }}>
              {donateOrg.activeOrder.appealTitle}
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#64748b' }}>
              {donateOrg.orgName} — {donateOrg.postcode}
            </p>

            <div style={{
              background: '#f8fafc',
              borderRadius: 10,
              padding: 16,
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Goal</span>
                <span style={{ fontWeight: 700, color: '#1e293b' }}>
                  {formatPence(donateOrg.activeOrder.targetAmountPence)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Raised so far</span>
                <span style={{ fontWeight: 700, color: '#16a34a' }}>
                  {formatPence(donateOrg.activeOrder.pledgedAmountPence)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: '#64748b' }}>Still needed</span>
                <span style={{ fontWeight: 700, color: '#ef4444' }}>
                  {formatPence(
                    donateOrg.activeOrder.targetAmountPence - donateOrg.activeOrder.pledgedAmountPence
                  )}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                Choose an amount
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[500, 1000, 2500, 5000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setDonateAmount(amt)}
                    style={{
                      padding: '10px 0',
                      border: `1.5px solid ${donateAmount === amt ? '#2563eb' : '#e2e8f0'}`,
                      borderRadius: 8,
                      background: donateAmount === amt ? '#eff6ff' : '#fff',
                      fontSize: 14,
                      fontWeight: 600,
                      color: donateAmount === amt ? '#2563eb' : '#1e293b',
                      cursor: 'pointer',
                    }}
                  >
                    {formatPence(amt)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              background: '#eff6ff',
              borderRadius: 8,
              padding: '10px 12px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}>
              <input type="checkbox" id="gift-aid" style={{ marginTop: 3 }} />
              <label htmlFor="gift-aid" style={{ fontSize: 13, color: '#1e40af' }}>
                <strong>Gift Aid</strong> — I am a UK taxpayer. The Gita Project can claim 25% extra
                on my donation at no cost to me.
              </label>
            </div>

            <button
              onClick={handleDonate}
              disabled={!donateAmount || donateLoading}
              style={{
                display: 'block',
                width: '100%',
                padding: '12px 0',
                background: !donateAmount ? '#94a3b8' : '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 700,
                cursor: !donateAmount ? 'not-allowed' : 'pointer',
              }}
            >
              {donateLoading ? 'Redirecting to Stripe...' : donateAmount ? `Donate ${formatPence(donateAmount)}` : 'Select an amount'}
            </button>

            <button
              onClick={() => { setDonateOrg(null); setDonateAmount(null); }}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 0',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: 13,
                cursor: 'pointer',
                marginTop: 8,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
