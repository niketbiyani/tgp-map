'use client';

import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('./components/MapView'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'system-ui, sans-serif',
      color: '#64748b',
      fontSize: 16,
    }}>
      Loading map...
    </div>
  ),
});

export default function Home() {
  return <MapView />;
}
