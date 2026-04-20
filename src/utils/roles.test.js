import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ROLES, getRole, setRole, getRoleConfig, canAccessRoute, canSeeNavItem } from './roles.js'

// ─── Mock localStorage ────────────────────────────────────────────
// Use vi.stubGlobal so vitest auto-restores after this file runs,
// preventing leaks into other test files that rely on jsdom's localStorage.

let store = {}
const localStorageMock = {
  getItem: vi.fn((key) => store[key] ?? null),
  setItem: vi.fn((key, value) => { store[key] = String(value) }),
  removeItem: vi.fn((key) => { delete store[key] }),
  clear: vi.fn(() => { store = {} }),
}

vi.stubGlobal('localStorage', localStorageMock)

beforeEach(() => {
  store = {}
  vi.clearAllMocks()
})

// ─── ROLES constant ───────────────────────────────────────────────

describe('ROLES', () => {
  it('defines exactly three roles', () => {
    expect(Object.keys(ROLES)).toEqual(['technician', 'admin', 'manager'])
  })

  it('every role has required properties', () => {
    for (const [key, role] of Object.entries(ROLES)) {
      expect(role).toHaveProperty('label')
      expect(role).toHaveProperty('description')
      expect(role).toHaveProperty('color')
      expect(role).toHaveProperty('routes')
      expect(role).toHaveProperty('navItems')
      expect(Array.isArray(role.routes)).toBe(true)
      expect(Array.isArray(role.navItems)).toBe(true)
    }
  })

  it('all roles have access to the root route', () => {
    for (const role of Object.values(ROLES)) {
      expect(role.routes).toContain('/')
    }
  })

  it('only admin and manager can access /specs', () => {
    expect(ROLES.admin.routes).toContain('/specs')
    expect(ROLES.manager.routes).toContain('/specs')
    expect(ROLES.technician.routes).not.toContain('/specs')
  })

  it('only technician and admin can access /new-report', () => {
    expect(ROLES.technician.routes).toContain('/new-report')
    expect(ROLES.admin.routes).toContain('/new-report')
    expect(ROLES.manager.routes).not.toContain('/new-report')
  })
})

// ─── getRole ──────────────────────────────────────────────────────

describe('getRole', () => {
  it('defaults to technician when nothing is stored', () => {
    expect(getRole()).toBe('technician')
  })

  it('returns the stored role', () => {
    localStorageMock.setItem('userRole', 'admin')
    expect(getRole()).toBe('admin')
  })

  it('reads from the correct localStorage key', () => {
    getRole()
    expect(localStorageMock.getItem).toHaveBeenCalledWith('userRole')
  })
})

// ─── setRole ──────────────────────────────────────────────────────

describe('setRole', () => {
  it('stores the role in localStorage', () => {
    setRole('manager')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('userRole', 'manager')
  })

  it('persists so getRole returns the new value', () => {
    setRole('admin')
    expect(getRole()).toBe('admin')
  })
})

// ─── getRoleConfig ────────────────────────────────────────────────

describe('getRoleConfig', () => {
  it('returns the technician config by default', () => {
    expect(getRoleConfig()).toEqual(ROLES.technician)
  })

  it('returns admin config when role is admin', () => {
    setRole('admin')
    expect(getRoleConfig()).toEqual(ROLES.admin)
  })

  it('returns manager config when role is manager', () => {
    setRole('manager')
    expect(getRoleConfig()).toEqual(ROLES.manager)
  })

  it('falls back to technician for an unknown role', () => {
    localStorageMock.setItem('userRole', 'superuser')
    expect(getRoleConfig()).toEqual(ROLES.technician)
  })
})

// ─── canAccessRoute ───────────────────────────────────────────────

describe('canAccessRoute', () => {
  describe('technician role', () => {
    beforeEach(() => setRole('technician'))

    it('can access dashboard', () => {
      expect(canAccessRoute('/')).toBe(true)
    })

    it('can access /new-report', () => {
      expect(canAccessRoute('/new-report')).toBe(true)
    })

    it('can access /reports', () => {
      expect(canAccessRoute('/reports')).toBe(true)
    })

    it('can access /calibration', () => {
      expect(canAccessRoute('/calibration')).toBe(true)
    })

    it('can access /help', () => {
      expect(canAccessRoute('/help')).toBe(true)
    })

    it('cannot access /specs', () => {
      expect(canAccessRoute('/specs')).toBe(false)
    })
  })

  describe('admin role', () => {
    beforeEach(() => setRole('admin'))

    it('can access /specs', () => {
      expect(canAccessRoute('/specs')).toBe(true)
    })

    it('can access /new-report', () => {
      expect(canAccessRoute('/new-report')).toBe(true)
    })

    it('can access all technician routes', () => {
      for (const route of ROLES.technician.routes) {
        expect(canAccessRoute(route)).toBe(true)
      }
    })
  })

  describe('manager role', () => {
    beforeEach(() => setRole('manager'))

    it('can access /specs', () => {
      expect(canAccessRoute('/specs')).toBe(true)
    })

    it('can access /reports', () => {
      expect(canAccessRoute('/reports')).toBe(true)
    })

    it('cannot access /new-report', () => {
      expect(canAccessRoute('/new-report')).toBe(false)
    })
  })

  describe('sub-route matching', () => {
    beforeEach(() => setRole('technician'))

    it('allows sub-routes of /reports (e.g. /reports/123)', () => {
      expect(canAccessRoute('/reports/123')).toBe(true)
    })

    it('allows deep sub-routes (e.g. /reports/123/edit)', () => {
      expect(canAccessRoute('/reports/123/edit')).toBe(true)
    })

    it('allows sub-routes of /calibration', () => {
      expect(canAccessRoute('/calibration/settings')).toBe(true)
    })

    it('does not treat / as a prefix match for all routes', () => {
      // The root route "/" is excluded from startsWith matching
      // to prevent it from matching everything
      setRole('technician')
      expect(canAccessRoute('/specs')).toBe(false)
    })
  })

  describe('unknown routes', () => {
    it('rejects routes not in the role config', () => {
      setRole('technician')
      expect(canAccessRoute('/admin-panel')).toBe(false)
    })

    it('rejects empty string', () => {
      setRole('admin')
      expect(canAccessRoute('')).toBe(false)
    })
  })
})

// ─── canSeeNavItem ────────────────────────────────────────────────

describe('canSeeNavItem', () => {
  describe('technician role', () => {
    beforeEach(() => setRole('technician'))

    it('can see dashboard', () => {
      expect(canSeeNavItem('dashboard')).toBe(true)
    })

    it('can see new-report', () => {
      expect(canSeeNavItem('new-report')).toBe(true)
    })

    it('can see reports', () => {
      expect(canSeeNavItem('reports')).toBe(true)
    })

    it('cannot see specs', () => {
      expect(canSeeNavItem('specs')).toBe(false)
    })
  })

  describe('admin role', () => {
    beforeEach(() => setRole('admin'))

    it('can see specs', () => {
      expect(canSeeNavItem('specs')).toBe(true)
    })

    it('can see all items', () => {
      for (const item of ROLES.admin.navItems) {
        expect(canSeeNavItem(item)).toBe(true)
      }
    })
  })

  describe('manager role', () => {
    beforeEach(() => setRole('manager'))

    it('can see specs', () => {
      expect(canSeeNavItem('specs')).toBe(true)
    })

    it('cannot see new-report', () => {
      expect(canSeeNavItem('new-report')).toBe(false)
    })
  })

  it('returns false for unknown nav items', () => {
    setRole('admin')
    expect(canSeeNavItem('unknown-page')).toBe(false)
  })
})
