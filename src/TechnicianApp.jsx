import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { getRoleConfig, canSeeNavItem } from './utils/roles.js'

const IconDashboard = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
const IconReport = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
const IconPlus = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IconDB = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/></svg>
const IconLogout = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
const IconMenu = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
const IconClose = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>

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

// All possible nav items — filtered by role
const allNavItems = [
  { key: 'dashboard', to: '/', label: 'Dashboard', icon: <IconDashboard />, exact: true },
  { key: 'new-report', to: '/new-report', label: 'New Report', icon: <IconPlus /> },
  { key: 'reports', to: '/reports', label: 'Reports', icon: <IconReport /> },
  { key: 'specs', to: '/specs', label: 'Spec Database', icon: <IconDB />, external: true },
]

export default function TechnicianApp() {
  const location = useLocation()
  const navigate = useNavigate()
  const techName = localStorage.getItem('technicianName') || 'Technician'
  const roleConfig = getRoleConfig()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => { setMobileMenuOpen(false) }, [location.pathname])

  function handleLogout() {
    localStorage.removeItem('technicianName')
    localStorage.removeItem('userRole')
    navigate('/login')
  }

  // Filter nav items by role
  const navItems = allNavItems.filter(item => canSeeNavItem(item.key))

  function isActive(item) {
    if (item.exact) return location.pathname === item.to
    return location.pathname.startsWith(item.to)
  }

  const sidebarContent = (
    <>
      {/* Brand */}
      <div style={{ padding: '0 12px 20px', borderBottom: '1px solid var(--c-border)', marginBottom: '16px' }}>
        <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--c-amber)', letterSpacing: '-0.5px' }}>
          AlignSpec
        </div>
        <div style={{ fontSize: '12px', color: 'var(--c-text-dim)', marginTop: '2px' }}>
          {roleConfig.label} Portal
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
            <Link key={item.to} to={item.to} style={navLinkStyle(isActive(item))}>
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
            fontSize: '14px', fontWeight: '700', flexShrink: 0,
          }}>
            {techName.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {techName}
            </div>
            <div style={{ fontSize: '11px', color: roleConfig.color, fontWeight: '600' }}>{roleConfig.label}</div>
          </div>
          <button onClick={handleLogout} style={{
            background: 'none', border: 'none', color: 'var(--c-text-dim)',
            cursor: 'pointer', padding: '4px',
          }} title="Sign out">
            <IconLogout />
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="app-shell">
      {/* Mobile top bar */}
      <header className="mobile-header">
        <button onClick={() => setMobileMenuOpen(true)} className="mobile-menu-btn" aria-label="Open menu">
          <IconMenu />
        </button>
        <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--c-amber)' }}>AlignSpec</div>
        <div style={{ width: '40px' }} />
      </header>

      {/* Sidebar — desktop always visible, mobile slides in */}
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        {/* Mobile close button */}
        <div className="sidebar-close-row">
          <button onClick={() => setMobileMenuOpen(false)} className="mobile-menu-btn" aria-label="Close menu">
            <IconClose />
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Main content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
