'use client';

import { useState, useEffect, createContext, useContext } from 'react';

const AdminContext = createContext<{ token: string }>({ token: '' });
export const useAdminToken = () => useContext(AdminContext).token;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState('');
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_token');
    if (saved) setToken(saved);
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!token) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        background: '#f8fafc',
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: 32,
          width: 360,
          boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
        }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
            Admin Login
          </h1>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748b' }}>
            Enter the admin token to continue.
          </p>
          <form onSubmit={(e) => {
            e.preventDefault();
            sessionStorage.setItem('admin_token', input);
            setToken(input);
          }}>
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Admin token"
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1.5px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 14,
                marginBottom: 12,
                boxSizing: 'border-box',
              }}
            />
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '10px 0',
                background: '#1e293b',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <AdminContext value={{ token }}>
      <div style={{ minHeight: '100vh', fontFamily: 'system-ui, sans-serif', background: '#f8fafc' }}>
        <nav style={{
          background: '#1e293b',
          color: '#fff',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
        }}>
          <a href="/" style={{ color: '#f59e0b', fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>
            TGP
          </a>
          <a href="/admin" style={{ color: '#cbd5e1', fontSize: 14, textDecoration: 'none' }}>Dashboard</a>
          <a href="/admin/import" style={{ color: '#cbd5e1', fontSize: 14, textDecoration: 'none' }}>Import CSV</a>
          <a href="/admin/orders" style={{ color: '#cbd5e1', fontSize: 14, textDecoration: 'none' }}>Orders</a>
          <a href="/admin/organisations" style={{ color: '#cbd5e1', fontSize: 14, textDecoration: 'none' }}>Organisations</a>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => { sessionStorage.removeItem('admin_token'); setToken(''); }}
            style={{
              background: 'none',
              border: '1px solid #475569',
              color: '#94a3b8',
              padding: '4px 12px',
              borderRadius: 6,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </nav>
        <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>{children}</div>
      </div>
    </AdminContext>
  );
}
