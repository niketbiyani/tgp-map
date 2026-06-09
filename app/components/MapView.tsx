'use client';

import { useEffect, useState } from 'react';
import {
  MOCK_ORGANISATIONS,
  ORG_TYPE_COLORS,
  ORG_TYPE_LABELS,
  Organisation,
  OrgType,
} from '../data/mock-organisations';

import 'leaflet/dist/leaflet.css';

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
      return '<span style="background:#16a34a;color:#fff;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600">DELIVERED ✓</span>';
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

function buildPopup(org: Organisation): string {
  const typeLabel = ORG_TYPE_LABELS[org.orgType];
  const color = ORG_TYPE_COLORS[org.orgType];

  let html = `
    <div style="min-width:260px;max-width:320px;font-family:system-ui,sans-serif">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color}"></span>
        <span style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">${typeLabel}</span>
      </div>
      <h3 style="margin:0 0 4px;font-size:16px;font-weight:700;color:#1e293b">${org.orgName}</h3>
      <p style="margin:0 0 8px;font-size:13px;color:#64748b">${org.address}, ${org.postcode}</p>
  `;

  html += `
    <div style="background:#f8fafc;border-radius:8px;padding:8px 10px;margin-bottom:8px">
      <div style="font-size:12px;color:#64748b;margin-bottom:2px">Delivery History</div>
      <div style="font-size:20px;font-weight:700;color:#1e293b">${org.deliveriesTotal} ${org.deliveriesTotal === 1 ? 'delivery' : 'deliveries'}</div>
      <div style="font-size:11px;color:#94a3b8">${org.deliveryYears.join(', ')}</div>
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
            onclick="window.__tgpDonate && window.__tgpDonate('${org.id}')"
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
        All deliveries fulfilled ✓
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
  const color = ORG_TYPE_COLORS[orgType];
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
  const [activeFilters, setActiveFilters] = useState<Set<OrgType>>(new Set());
  const [showNeedsFunding, setShowNeedsFunding] = useState(false);
  const [donateModalOrg, setDonateModalOrg] = useState<Organisation | null>(null);

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

    (window as any).__tgpDonate = (orgId: string) => {
      const org = MOCK_ORGANISATIONS.find((o) => o.id === orgId);
      if (org) {
        setDonateModalOrg(org);
      }
    };

    return () => {
      m.remove();
      delete (window as any).__tgpDonate;
      style.remove();
    };
  }, []);

  useEffect(() => {
    if (!map) return;
    const L = require('leaflet');

    map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    const filtered = MOCK_ORGANISATIONS.filter((org) => {
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
  }, [map, activeFilters, showNeedsFunding]);

  const toggleFilter = (type: OrgType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const stats = {
    totalOrgs: MOCK_ORGANISATIONS.length,
    totalDeliveries: MOCK_ORGANISATIONS.reduce((s, o) => s + o.deliveriesTotal, 0),
    needsFunding: MOCK_ORGANISATIONS.filter((o) => o.activeOrder?.status === 'new').length,
    totalRaised: MOCK_ORGANISATIONS.reduce(
      (s, o) => s + (o.activeOrder ? o.activeOrder.pledgedAmountPence : 0),
      0
    ),
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

        {/* Stats bar */}
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
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: ORG_TYPE_COLORS[type],
                }}
              />
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
      {donateModalOrg && donateModalOrg.activeOrder && (
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
          onClick={() => setDonateModalOrg(null)}
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
              {donateModalOrg.activeOrder.appealTitle}
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#64748b' }}>
              {donateModalOrg.orgName} — {donateModalOrg.postcode}
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
                  {formatPence(donateModalOrg.activeOrder.targetAmountPence)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Raised so far</span>
                <span style={{ fontWeight: 700, color: '#16a34a' }}>
                  {formatPence(donateModalOrg.activeOrder.pledgedAmountPence)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: '#64748b' }}>Still needed</span>
                <span style={{ fontWeight: 700, color: '#ef4444' }}>
                  {formatPence(
                    donateModalOrg.activeOrder.targetAmountPence -
                      donateModalOrg.activeOrder.pledgedAmountPence
                  )}
                </span>
              </div>
            </div>

            {/* Amount buttons */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                Choose an amount
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[500, 1000, 2500, 5000].map((amt) => (
                  <button
                    key={amt}
                    style={{
                      padding: '10px 0',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: 8,
                      background: '#fff',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#1e293b',
                      cursor: 'pointer',
                    }}
                  >
                    {formatPence(amt)}
                  </button>
                ))}
              </div>
            </div>

            {/* Gift Aid */}
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
              onClick={() => {
                alert(
                  'This is a prototype — Stripe payment integration will be wired up in the real version.'
                );
                setDonateModalOrg(null);
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '12px 0',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Donate with Stripe
            </button>

            <button
              onClick={() => setDonateModalOrg(null)}
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
