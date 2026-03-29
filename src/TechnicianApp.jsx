import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'

const IconDashboard = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
const IconReport = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
const IconPlus = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IconDB = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/></svg>
const IconLogout = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>

const navLinkStyle = (active) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 16px',
  borderRadius: '10px',
  color: active ? 'var(--c-amber)' : 'var(--c-text-dim)',
  background: active ? 'var(--c-amber-dim)' : 'transparent',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: active ? '600' : '500',
  transition: 'all 0.15s ease',
})

export default function TechnicianApp() {
  const location = useLocation()
  const navigate = useNavigate()
  const techName = localStorage.getItem('technicianName') || 'Technician'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  function handleLogout() {
    localStorage.removeItem('technicianName')
    navigate('/login')
  }

  const navItems = [
    { to: '/', label: 'Dashboard', icon: <IconDashboard />, exact: true },
    { to: '/new-report', label: 'New Report', icon: <IconPlus /> },
    { to: '/reports', label: 'Reports', icon: <IconReport /> },
    { to: '/specs', label: 'Spec Database', icon: <IconDB />, external: true },
  ]

  function isActive(item) {
    if (item.exact) return location.pathname === item.to
    return location.pathname.startsWith(item.to)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--c-bg)' }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px',
        background: 'var(--c-surface)',
        borderRight: '1px solid var(--c-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 12px',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 100,
        transform: mobileMenuOpen ? 'translateX(0)' : undefined,
      }}>
        {/* Brand */}
        <div style={{ padding: '0 12px 20px', borderBottom: '1px solid var(--c-border)', marginBottom: '16px' }}>
          <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--c-amber)', letterSpacing: '-0.5px' }}>
            AlignSpec
          </div>
          <div style={{ fontSize: '12px', color: 'var(--c-text-dim)', marginTop: '2px' }}>
            Technician Portal
          </div>
        </div>

        {/* Nav Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {navItems.map(item => (
            item.external ? (
              <a key={item.to} href={item.to} style={navLinkStyle(false)} target="_blank" rel="noopener">
                {item.icon} {item.label}
              </a>
            ) : (
              <Link key={item.to} to={item.to} style={navLinkStyle(isActive(item))} onClick={() => setMobileMenuOpen(false)}>
                {item.icon} {item.label}
              </Link>
            )
          ))}
        </nav>

        {/* User footer */}
        <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: '16px', marginTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 12px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'var(--c-amber-dim)', color: 'var(--c-amber)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: '700',
            }}>
              {techName.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {techName}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--c-text-dim)' }}>Technician</div>
            </div>
            <button onClick={handleLogout} style={{
              background: 'none', border: 'none', color: 'var(--c-text-dim)',
              cursor: 'pointer', padding: '4px',
            }} title="Sign out">
              <IconLogout />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, marginLeft: '240px', padding: '24px 32px', maxWidth: '1200px' }}>
        <Outlet />
      </main>

      {/* Mobile menu toggle */}
      <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{
        display: 'none', position: 'fixed', bottom: '20px', right: '20px', zIndex: 200,
        width: '48px', height: '48px', borderRadius: '50%',
        background: 'var(--c-amber)', color: '#000', border: 'none', cursor: 'pointer',
        fontSize: '20px', fontWeight: '700',
      }}>
        ☰
      </button>
    </div>
  )
}
