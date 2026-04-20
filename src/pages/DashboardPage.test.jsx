import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from './DashboardPage.jsx'

// ─── Mock supabase ────────────────────────────────────────────────

const mockReports = [
  {
    id: '1', created_at: '2026-04-20T10:00:00Z', status: 'completed',
    vehicles: { year: '2024', make: 'Toyota', model: 'Camry' },
    customers: { name: 'John Smith' },
  },
  {
    id: '2', created_at: '2026-04-20T08:00:00Z', status: 'in_progress',
    vehicles: { year: '2023', make: 'Honda', model: 'Civic' },
    customers: { name: 'Jane Doe' },
  },
]

vi.mock('../supabase.js', () => {
  const makeQuery = (result) => {
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      gte: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      ...result,
    }
    return chain
  }

  let callCount = 0
  return {
    supabase: {
      from: vi.fn(() => {
        callCount++
        // The dashboard makes 4 parallel queries:
        // 1. total count, 2. today count, 3. in_progress count, 4. recent reports
        if (callCount % 4 === 1) return makeQuery({ count: 15 })
        if (callCount % 4 === 2) return makeQuery({ count: 3 })
        if (callCount % 4 === 3) return makeQuery({ count: 1 })
        return makeQuery({ data: mockReports })
      }),
    },
  }
})

// ─── localStorage mock ────────────────────────────────────────────

let store = {}
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key) => store[key] ?? null),
  setItem: vi.fn((key, value) => { store[key] = String(value) }),
  removeItem: vi.fn((key) => { delete store[key] }),
  clear: vi.fn(() => { store = {} }),
  get length() { return Object.keys(store).length },
  key: vi.fn((i) => Object.keys(store)[i] ?? null),
})

afterEach(() => cleanup())

beforeEach(() => {
  store = { technicianName: 'Mike' }
  vi.clearAllMocks()
})

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  )
}

// ─── Tests ────────────────────────────────────────────────────────

describe('DashboardPage', () => {
  it('renders welcome message with technician name', () => {
    renderWithRouter()
    expect(screen.getByText(/Welcome back, Mike/)).toBeInTheDocument()
  })

  it('renders the current date', () => {
    renderWithRouter()
    // The component renders today's date using toLocaleDateString
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
    expect(screen.getByText(today)).toBeInTheDocument()
  })

  it('renders quick action buttons', () => {
    renderWithRouter()
    expect(screen.getByText('New Report')).toBeInTheDocument()
    expect(screen.getByText('All Reports')).toBeInTheDocument()
  })

  it('New Report links to /new-report', () => {
    renderWithRouter()
    const link = screen.getByText('New Report').closest('a')
    expect(link.getAttribute('href')).toBe('/new-report')
  })

  it('All Reports links to /reports', () => {
    renderWithRouter()
    const link = screen.getByText('All Reports').closest('a')
    expect(link.getAttribute('href')).toBe('/reports')
  })

  it('renders stat cards', () => {
    renderWithRouter()
    expect(screen.getByText('Total Reports')).toBeInTheDocument()
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('shows loading dashes for stats initially', () => {
    renderWithRouter()
    // Before data loads, stats show '—'
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBe(3) // one per stat card
  })

  it('renders stat values after loading', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('15')).toBeInTheDocument()  // total
      expect(screen.getByText('3')).toBeInTheDocument()    // today
      expect(screen.getByText('1')).toBeInTheDocument()    // in progress
    })
  })

  it('renders Recent Reports section', () => {
    renderWithRouter()
    expect(screen.getByText('Recent Reports')).toBeInTheDocument()
    expect(screen.getByText('View all →')).toBeInTheDocument()
  })

  it('View all links to /reports', () => {
    renderWithRouter()
    const link = screen.getByText('View all →')
    expect(link.getAttribute('href')).toBe('/reports')
  })

  it('renders recent report entries after loading', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('2024 Toyota Camry')).toBeInTheDocument()
      expect(screen.getByText('2023 Honda Civic')).toBeInTheDocument()
    })
  })

  it('shows status badges on recent reports', async () => {
    renderWithRouter()
    await waitFor(() => {
      expect(screen.getByText('Done')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
    })
  })

  it('recent reports link to individual report pages', async () => {
    renderWithRouter()
    await waitFor(() => {
      const link = screen.getByText('2024 Toyota Camry').closest('a')
      expect(link.getAttribute('href')).toBe('/reports/1')
    })
  })
})
