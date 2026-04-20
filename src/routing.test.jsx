import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// ─── Mock supabase (imported transitively by pages) ───────────────

vi.mock('./supabase.js', () => ({
  supabase: {
    from: () => ({
      select: () => ({ order: () => ({ order: () => ({ data: [], error: null }), data: [], error: null }), eq: () => ({ data: [], error: null }), data: [], error: null }),
      insert: () => ({ select: () => ({ single: () => ({ data: {}, error: null }) }), data: null, error: null }),
    }),
    channel: () => ({ on: () => ({ subscribe: () => {} }), subscribe: () => {} }),
    removeChannel: () => {},
  },
}))

// ─── Import components that use routing ───────────────────────────

import { canAccessRoute } from './utils/roles.js'

// Replicate the auth guards from main.jsx (they aren't exported)
function ProtectedRoute({ children }) {
  const techName = localStorage.getItem('technicianName')
  if (!techName) return <div data-testid="redirected-to-login">Redirected to login</div>
  return children
}

function RoleGate({ children, pathname }) {
  if (!canAccessRoute(pathname)) {
    return <div data-testid="redirected-to-home">Redirected to home</div>
  }
  return children
}

// ─── localStorage mock ────────────────────────────────────────────

let store = {}
const storageMock = {
  getItem: vi.fn((key) => store[key] ?? null),
  setItem: vi.fn((key, value) => { store[key] = String(value) }),
  removeItem: vi.fn((key) => { delete store[key] }),
  clear: vi.fn(() => { store = {} }),
  get length() { return Object.keys(store).length },
  key: vi.fn((i) => Object.keys(store)[i] ?? null),
}

vi.stubGlobal('localStorage', storageMock)

afterEach(() => cleanup())

beforeEach(() => {
  store = {}
  vi.clearAllMocks()
})

// ─── ProtectedRoute ───────────────────────────────────────────────

describe('ProtectedRoute', () => {
  it('redirects to login when no technicianName in localStorage', () => {
    render(
      <ProtectedRoute>
        <div>Dashboard Content</div>
      </ProtectedRoute>
    )
    expect(screen.getByTestId('redirected-to-login')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument()
  })

  it('renders children when technicianName exists', () => {
    store.technicianName = 'Mike'
    render(
      <ProtectedRoute>
        <div>Dashboard Content</div>
      </ProtectedRoute>
    )
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument()
    expect(screen.queryByTestId('redirected-to-login')).not.toBeInTheDocument()
  })

  it('checks the correct localStorage key', () => {
    render(
      <ProtectedRoute>
        <div>Content</div>
      </ProtectedRoute>
    )
    expect(storageMock.getItem).toHaveBeenCalledWith('technicianName')
  })
})

// ─── RoleGate ─────────────────────────────────────────────────────

describe('RoleGate', () => {
  describe('technician role', () => {
    beforeEach(() => {
      store.userRole = 'technician'
    })

    it('allows access to /reports', () => {
      render(
        <RoleGate pathname="/reports">
          <div>Reports Page</div>
        </RoleGate>
      )
      expect(screen.getByText('Reports Page')).toBeInTheDocument()
    })

    it('allows access to /new-report', () => {
      render(
        <RoleGate pathname="/new-report">
          <div>New Report Page</div>
        </RoleGate>
      )
      expect(screen.getByText('New Report Page')).toBeInTheDocument()
    })

    it('allows access to sub-routes like /reports/123', () => {
      render(
        <RoleGate pathname="/reports/123">
          <div>Report Detail</div>
        </RoleGate>
      )
      expect(screen.getByText('Report Detail')).toBeInTheDocument()
    })

    it('blocks access to /specs', () => {
      render(
        <RoleGate pathname="/specs">
          <div>Specs Page</div>
        </RoleGate>
      )
      expect(screen.getByTestId('redirected-to-home')).toBeInTheDocument()
      expect(screen.queryByText('Specs Page')).not.toBeInTheDocument()
    })
  })

  describe('admin role', () => {
    beforeEach(() => {
      store.userRole = 'admin'
    })

    it('allows access to /specs', () => {
      render(
        <RoleGate pathname="/specs">
          <div>Specs Page</div>
        </RoleGate>
      )
      expect(screen.getByText('Specs Page')).toBeInTheDocument()
    })

    it('allows access to /new-report', () => {
      render(
        <RoleGate pathname="/new-report">
          <div>New Report</div>
        </RoleGate>
      )
      expect(screen.getByText('New Report')).toBeInTheDocument()
    })
  })

  describe('manager role', () => {
    beforeEach(() => {
      store.userRole = 'manager'
    })

    it('allows access to /specs', () => {
      render(
        <RoleGate pathname="/specs">
          <div>Specs Page</div>
        </RoleGate>
      )
      expect(screen.getByText('Specs Page')).toBeInTheDocument()
    })

    it('blocks access to /new-report', () => {
      render(
        <RoleGate pathname="/new-report">
          <div>New Report</div>
        </RoleGate>
      )
      expect(screen.getByTestId('redirected-to-home')).toBeInTheDocument()
    })

    it('allows access to /reports', () => {
      render(
        <RoleGate pathname="/reports">
          <div>Reports</div>
        </RoleGate>
      )
      expect(screen.getByText('Reports')).toBeInTheDocument()
    })
  })
})
