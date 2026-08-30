'use client'

import dynamic from 'next/dynamic'

const UserDashboard = dynamic(() => import('@/components/UserDashboard'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#EFF4F9',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'linear-gradient(135deg, #F6D374 0%, #D9A536 100%)',
          margin: '0 auto 16px',
          animation: 'pulse-subtle 1.5s ease-in-out infinite',
        }} />
        <div style={{ fontWeight: 700, fontSize: 16, color: '#132433', fontFamily: "'Sora', sans-serif" }}>
          Chargement du dashboard...
        </div>
      </div>
    </div>
  ),
})

export default function Home() {
  return <UserDashboard />
}
