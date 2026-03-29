// ─── Role definitions and permission system ───

export const ROLES = {
  technician: {
    label: 'Technician',
    description: 'Create and view alignment reports',
    color: 'var(--c-green)',
    routes: ['/', '/new-report', '/reports'],
    navItems: ['dashboard', 'new-report', 'reports'],
  },
  admin: {
    label: 'Admin',
    description: 'Full access to all features',
    color: 'var(--c-amber)',
    routes: ['/', '/new-report', '/reports', '/specs'],
    navItems: ['dashboard', 'new-report', 'reports', 'specs'],
  },
  manager: {
    label: 'Manager',
    description: 'View reports and manage specs',
    color: 'var(--c-purple)',
    routes: ['/', '/reports', '/specs'],
    navItems: ['dashboard', 'reports', 'specs'],
  },
}

export function getRole() {
  return localStorage.getItem('userRole') || 'technician'
}

export function setRole(role) {
  localStorage.setItem('userRole', role)
}

export function getRoleConfig() {
  return ROLES[getRole()] || ROLES.technician
}

export function canAccessRoute(pathname) {
  const config = getRoleConfig()
  // Always allow exact matches
  if (config.routes.includes(pathname)) return true
  // Allow sub-routes (e.g. /reports/123)
  return config.routes.some(r => r !== '/' && pathname.startsWith(r))
}

export function canSeeNavItem(key) {
  const config = getRoleConfig()
  return config.navItems.includes(key)
}
